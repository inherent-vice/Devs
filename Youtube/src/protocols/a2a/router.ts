/**
 * A2A Router
 *
 * Routes messages and tasks between agents:
 * - Message routing based on capabilities
 * - Task queue management
 * - Result aggregation
 * - Error handling and retries
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskSchema,
  TaskResult,
  TaskResultSchema,
  A2AMessage,
  A2AMessageSchema,
  AgentCard,
  A2AError,
  A2AErrorCodes,
} from './types.js';
import { A2ARegistry, getA2ARegistry } from './registry.js';
import type { AgentContext, AgentResult } from '../../agents/base/types.js';

// ===========================================
// Router Types
// ===========================================

interface PendingTask {
  task: Task;
  resolve: (result: TaskResult) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
  cancelled: boolean;
}

interface RouterOptions {
  /** Default task timeout in milliseconds */
  defaultTimeout?: number;

  /** Maximum retries for failed tasks */
  maxRetries?: number;

  /** Retry delay in milliseconds */
  retryDelay?: number;
}

// Agent handler type - function that processes a task
type AgentHandler = (task: Task, context: AgentContext) => Promise<AgentResult<unknown>>;

// ===========================================
// A2A Router
// ===========================================

export class A2ARouter extends EventEmitter {
  private registry: A2ARegistry;
  private pendingTasks = new Map<string, PendingTask>();
  private handlers = new Map<string, AgentHandler>();
  private options: Required<RouterOptions>;

  constructor(registry?: A2ARegistry, options: RouterOptions = {}) {
    super();
    this.registry = registry || getA2ARegistry();
    this.options = {
      defaultTimeout: options.defaultTimeout || 60000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
    };
  }

  // ===========================================
  // Handler Registration
  // ===========================================

  /**
   * Register a handler for an agent
   */
  registerHandler(agentId: string, handler: AgentHandler): void {
    this.handlers.set(agentId, handler);
    console.log(`[A2ARouter] Handler registered for agent: ${agentId}`);
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(agentId: string): void {
    this.handlers.delete(agentId);
  }

  // ===========================================
  // Task Submission
  // ===========================================

  /**
   * Submit a task for execution
   */
  async submitTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<TaskResult> {
    const fullTask: Task = {
      ...task,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    // Validate task
    const validation = TaskSchema.safeParse(fullTask);
    if (!validation.success) {
      throw new A2AError(
        `Invalid task: ${validation.error.message}`,
        A2AErrorCodes.INVALID_MESSAGE,
        false
      );
    }

    // Find target agent
    let targetAgentId = fullTask.targetAgentId;
    if (!targetAgentId) {
      // Discover agent by capabilities
      const agent = this.registry.findBestAgent({
        capabilities: fullTask.requiredCapabilities,
        status: 'active',
      });

      if (!agent) {
        throw new A2AError(
          `No agent found for capabilities: ${fullTask.requiredCapabilities?.join(', ')}`,
          A2AErrorCodes.AGENT_NOT_FOUND,
          false
        );
      }
      targetAgentId = agent.id;
    }

    // Route task to agent
    return this.routeTask(fullTask, targetAgentId);
  }

  /**
   * Route task to a specific agent
   */
  private async routeTask(task: Task, targetAgentId: string): Promise<TaskResult> {
    return new Promise(async (resolve, reject) => {
      const pending: PendingTask = {
        task,
        resolve,
        reject,
        cancelled: false,
      };
      this.pendingTasks.set(task.id, pending);

      try {
        const result = await this.executeTask(task, targetAgentId);
        if (!pending.cancelled) {
          resolve(result);
        }
      } catch (error) {
        if (!pending.cancelled) {
          reject(error as Error);
        }
      } finally {
        if (pending.timeout) {
          clearTimeout(pending.timeout);
        }
        this.pendingTasks.delete(task.id);
      }
    });
  }

  private async executeTask(task: Task, targetAgentId: string): Promise<TaskResult> {
    const startTime = Date.now();

    // Check if we have a local handler
    const handler = this.handlers.get(targetAgentId);
    if (!handler) {
      throw new A2AError(
        `No handler registered for agent: ${targetAgentId}`,
        A2AErrorCodes.AGENT_NOT_FOUND,
        false
      );
    }

    // Emit task submitted event
    this.emit('task_submitted', { taskId: task.id, agentId: targetAgentId, timestamp: new Date() });

    // Create execution context
    const context: AgentContext = {
      sessionId: task.context?.sessionId || task.id,
      phase: (task.context?.phase as AgentContext['phase']) || 'research',
      videoType: (task.context?.videoType as AgentContext['videoType']) || 'shorts',
      previousResults: task.context?.previousResults as Record<string, unknown>,
    };

    // Execute with retries
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Mark agent as busy
        this.registry.updateStatus(targetAgentId, 'busy');
        this.emit('task_started', { taskId: task.id, agentId: targetAgentId, attempt, timestamp: new Date() });

        // Execute handler
        const result = await this.executeWithTimeout(
          handler,
          task,
          context,
          task.timeout || this.options.defaultTimeout
        );

        // Record metrics
        const duration = Date.now() - startTime;
        this.registry.recordRequest(targetAgentId, duration, result.success);

        // Mark agent as active
        this.registry.updateStatus(targetAgentId, 'active');

        // Build task result
        const taskResult: TaskResult = {
          taskId: task.id,
          agentId: targetAgentId,
          success: result.success,
          data: result.data,
          error: result.error ? {
            code: result.error.type,
            message: result.error.message,
            details: result.error.cause,
            retryable: result.error.retryable,
          } : undefined,
          metrics: {
            duration,
            tokensUsed: result.metrics.tokensUsed,
            cost: result.metrics.cost,
          },
          completedAt: new Date().toISOString(),
        };

        this.emit('task_completed', { taskId: task.id, agentId: targetAgentId, result: taskResult, timestamp: new Date() });
        return taskResult;

      } catch (error) {
        lastError = error as Error;
        console.warn(`[A2ARouter] Task ${task.id} failed (attempt ${attempt + 1}):`, lastError.message);

        // Record failure
        const duration = Date.now() - startTime;
        this.registry.recordRequest(targetAgentId, duration, false);

        // Check if retryable
        if (attempt < this.options.maxRetries) {
          await this.delay(this.options.retryDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }

    // All retries failed
    this.registry.updateStatus(targetAgentId, 'error');
    const duration = Date.now() - startTime;

    const failedResult: TaskResult = {
      taskId: task.id,
      agentId: targetAgentId,
      success: false,
      error: {
        code: A2AErrorCodes.TASK_FAILED,
        message: lastError?.message || 'Task failed after all retries',
        retryable: false,
      },
      metrics: { duration },
      completedAt: new Date().toISOString(),
    };

    this.emit('task_failed', { taskId: task.id, agentId: targetAgentId, error: lastError, timestamp: new Date() });
    return failedResult;
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout(
    handler: AgentHandler,
    task: Task,
    context: AgentContext,
    timeout: number
  ): Promise<AgentResult<unknown>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new A2AError('Task execution timed out', A2AErrorCodes.TASK_TIMEOUT, true));
      }, timeout);

      handler(task, context)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // ===========================================
  // Message Routing
  // ===========================================

  /**
   * Send a message to an agent
   */
  async sendMessage(message: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: A2AMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    // Validate message
    const validation = A2AMessageSchema.safeParse(fullMessage);
    if (!validation.success) {
      throw new A2AError(
        `Invalid message: ${validation.error.message}`,
        A2AErrorCodes.INVALID_MESSAGE,
        false
      );
    }

    // Check if target agent exists
    const targetAgent = this.registry.getAgent(fullMessage.to);
    if (!targetAgent) {
      throw new A2AError(
        `Target agent not found: ${fullMessage.to}`,
        A2AErrorCodes.AGENT_NOT_FOUND,
        false
      );
    }

    // Emit message event
    this.emit('message_sent', { message: fullMessage, timestamp: new Date() });

    // Handle different message types
    switch (fullMessage.type) {
      case 'task_request':
        // Convert to task and submit
        const task = fullMessage.payload as Omit<Task, 'id' | 'createdAt'>;
        await this.submitTask({
          ...task,
          targetAgentId: fullMessage.to,
          requesterId: fullMessage.from,
        });
        break;

      case 'heartbeat':
        this.registry.heartbeat(fullMessage.from);
        break;

      case 'status_update':
        this.registry.updateStatus(fullMessage.from, fullMessage.payload.status);
        break;

      default:
        // Emit for custom handling
        this.emit('message_received', { message: fullMessage, timestamp: new Date() });
    }
  }

  // ===========================================
  // Parallel Task Execution
  // ===========================================

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(tasks: Array<Omit<Task, 'id' | 'createdAt'>>): Promise<TaskResult[]> {
    const promises = tasks.map(task => this.submitTask(task));
    return Promise.all(promises);
  }

  /**
   * Execute tasks in sequence
   */
  async executeSequence(tasks: Array<Omit<Task, 'id' | 'createdAt'>>): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    let previousResult: TaskResult | undefined;

    for (const task of tasks) {
      // Pass previous result as context
      const taskWithContext = {
        ...task,
        context: {
          ...task.context,
          previousResults: previousResult ? { [previousResult.agentId]: previousResult.data } : {},
        },
      };

      const result = await this.submitTask(taskWithContext);
      results.push(result);

      // Stop on failure if not explicitly handling errors
      if (!result.success) {
        break;
      }

      previousResult = result;
    }

    return results;
  }

  // ===========================================
  // Utility
  // ===========================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get pending task count
   */
  getPendingCount(): number {
    return this.pendingTasks.size;
  }

  /**
   * Cancel a pending task
   */
  cancelTask(taskId: string): boolean {
    const pending = this.pendingTasks.get(taskId);
    if (pending) {
      pending.cancelled = true;
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new A2AError('Task cancelled', 'TASK_CANCELLED', false));
      this.pendingTasks.delete(taskId);
      return true;
    }
    return false;
  }
}

// ===========================================
// Singleton Export
// ===========================================

let routerInstance: A2ARouter | null = null;

export function getA2ARouter(): A2ARouter {
  if (!routerInstance) {
    routerInstance = new A2ARouter();
  }
  return routerInstance;
}
