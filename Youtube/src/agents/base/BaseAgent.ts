/**
 * BaseAgent - Abstract Base Class for All Agents
 *
 * Provides common functionality including:
 * - Input/output validation with Zod schemas
 * - Retry logic with exponential backoff
 * - Cost tracking and metrics collection
 * - Error handling and recovery
 */

import { z, ZodSchema } from 'zod';
import { ai, gemini3Flash } from '../../genkit.config.js';
import { calculateTokenCost } from '../../config/models.js';
import { getContextCache } from '../../config/contextCache.js';
import type {
  AgentContext,
  AgentResult,
  AgentMetrics,
  AgentError,
} from './types.js';

// ===========================================
// Base Agent Abstract Class
// ===========================================

export abstract class BaseAgent<TInput, TOutput> {
  // ===========================================
  // Abstract Properties (must be implemented)
  // ===========================================

  /** Unique agent name */
  abstract readonly name: string;

  /** Agent description */
  abstract readonly description: string;

  /** Zod schema for input validation */
  protected abstract readonly inputSchema: ZodSchema<TInput>;

  /** Zod schema for output validation */
  protected abstract readonly outputSchema: ZodSchema<TOutput>;

  /** System prompt for the agent */
  protected abstract readonly systemPrompt: string;

  // ===========================================
  // Configurable Properties
  // ===========================================

  /** Model to use (default: Gemini 3 Flash) */
  protected model = gemini3Flash;

  /** Model ID for cost calculation */
  protected modelId = 'gemini-3-flash';

  /** Temperature for generation */
  protected temperature = 0.7;

  /** Maximum output tokens */
  protected maxOutputTokens = 8192;

  /** Maximum retry attempts */
  protected maxRetries = 3;

  /** Base delay for exponential backoff (ms) */
  protected retryBaseDelay = 1000;

  /** Timeout for execution (ms) */
  protected timeout = 60000;

  /** Enable context caching for system prompts */
  protected enableContextCaching = true;

  // ===========================================
  // Main Execution Method
  // ===========================================

  /**
   * Execute the agent with the given input
   */
  async execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;

    // Validate input
    const validationResult = this.inputSchema.safeParse(input);
    if (!validationResult.success) {
      return this.createErrorResult(
        {
          type: 'validation',
          message: `Input validation failed: ${validationResult.error.message}`,
          cause: validationResult.error,
          retryable: false,
        },
        startTime,
        retryCount
      );
    }

    // Check cost limit
    if (context.maxCost && context.accumulatedCost) {
      if (context.accumulatedCost >= context.maxCost) {
        return this.createErrorResult(
          {
            type: 'cost_limit',
            message: `Cost limit exceeded: ${context.accumulatedCost} >= ${context.maxCost}`,
            retryable: false,
          },
          startTime,
          retryCount
        );
      }
    }

    // Execute with retry logic
    while (retryCount <= this.maxRetries) {
      try {
        const result = await this.executeWithTimeout(
          validationResult.data,
          context,
          startTime,
          retryCount
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount <= this.maxRetries && this.isRetryable(error as Error)) {
          await this.delay(this.retryBaseDelay * Math.pow(2, retryCount - 1));
          continue;
        }
        break;
      }
    }

    return this.createErrorResult(
      {
        type: 'api',
        message: lastError?.message || 'Unknown error',
        cause: lastError,
        retryable: false,
      },
      startTime,
      retryCount
    );
  }

  // ===========================================
  // Core Execution Logic
  // ===========================================

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    input: TInput,
    context: AgentContext,
    startTime: number,
    retryCount: number
  ): Promise<AgentResult<TOutput>> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), this.timeout);
    });

    const executionPromise = this.executeCore(input, context, startTime, retryCount);

    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Core execution logic
   */
  private async executeCore(
    input: TInput,
    context: AgentContext,
    startTime: number,
    retryCount: number
  ): Promise<AgentResult<TOutput>> {
    // Build prompt
    const prompt = this.buildPrompt(input, context);

    // Call the model using Genkit 1.27+ API
    const response = await ai.generate({
      model: this.model,
      prompt: prompt,
      config: {
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
      },
      output: { schema: this.outputSchema },
    });

    // Validate output
    const outputValidation = this.outputSchema.safeParse(response.output);
    if (!outputValidation.success) {
      throw new Error(`Output validation failed: ${outputValidation.error.message}`);
    }

    // Apply post-processing (can be overridden by subclasses)
    const processedOutput = await this.postProcess(outputValidation.data, input, context);

    // Calculate metrics
    const metrics = this.calculateMetrics(startTime, response, retryCount);

    return {
      success: true,
      data: processedOutput,
      metrics,
      agentName: this.name,
      timestamp: new Date(),
    };
  }

  /**
   * Post-process the output before returning
   * Override this method in subclasses to add custom post-processing logic
   * @param output - The validated output from the model
   * @param input - The original input
   * @param context - The agent context
   * @returns The processed output
   */
  protected async postProcess(
    output: TOutput,
    _input: TInput,
    _context: AgentContext
  ): Promise<TOutput> {
    // Default implementation: return output unchanged
    return output;
  }

  // ===========================================
  // Prompt Building
  // ===========================================

  /**
   * Build the complete prompt for the model
   * Override this method to customize prompt construction
   */
  protected buildPrompt(input: TInput, context: AgentContext): string {
    const systemContext = this.buildSystemContext(context);
    const inputJson = JSON.stringify(input, null, 2);

    // Use context caching for system prompt
    let systemPromptContent = this.systemPrompt;
    if (this.enableContextCaching) {
      const cache = getContextCache();
      const cacheResult = cache.getOrCachePrompt(this.systemPrompt, this.modelId);
      systemPromptContent = cacheResult.content;

      if (cacheResult.cached) {
        this.log('debug', `Using cached system prompt (${cache.getStats().hitRate.toFixed(2)} hit rate)`);
      }
    }

    return `${systemPromptContent}

${systemContext}

## Input
\`\`\`json
${inputJson}
\`\`\`

## Instructions
Analyze the input and provide your response according to the expected output schema.
Be thorough, specific, and actionable in your response.`;
  }

  /**
   * Build system context from AgentContext
   */
  protected buildSystemContext(context: AgentContext): string {
    return `## Context
- Session ID: ${context.sessionId}
- Phase: ${context.phase}
- Video Type: ${context.videoType}
- Accumulated Cost: $${context.accumulatedCost?.toFixed(2) || '0.00'}`;
  }

  // ===========================================
  // Metrics & Cost Calculation
  // ===========================================

  /**
   * Calculate execution metrics
   */
  protected calculateMetrics(
    startTime: number,
    response: { usage?: { inputTokens?: number; outputTokens?: number } },
    retryCount: number
  ): AgentMetrics {
    const duration = Date.now() - startTime;
    const usage = response.usage;

    const inputTokens = usage?.inputTokens || 0;
    const outputTokens = usage?.outputTokens || 0;
    const tokensUsed = inputTokens + outputTokens;

    const cost = calculateTokenCost(this.modelId, inputTokens, outputTokens);

    return {
      duration,
      tokensUsed,
      inputTokens,
      outputTokens,
      cost,
      retryCount,
    };
  }

  // ===========================================
  // Error Handling
  // ===========================================

  /**
   * Create a success result
   */
  protected createSuccessResult(
    data: TOutput,
    metrics: AgentMetrics
  ): AgentResult<TOutput> {
    return {
      success: true,
      data,
      metrics,
      agentName: this.name,
      timestamp: new Date(),
    };
  }

  /**
   * Create an error result
   */
  protected createErrorResult(
    error: AgentError,
    startTime: number,
    retryCount: number
  ): AgentResult<TOutput> {
    return {
      success: false,
      error,
      metrics: {
        duration: Date.now() - startTime,
        tokensUsed: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        retryCount,
      },
      agentName: this.name,
      timestamp: new Date(),
    };
  }

  /**
   * Check if an error is retryable
   */
  protected isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retryable errors
    if (message.includes('rate limit')) return true;
    if (message.includes('timeout')) return true;
    if (message.includes('503')) return true;
    if (message.includes('429')) return true;
    if (message.includes('temporarily')) return true;

    // Non-retryable errors
    if (message.includes('validation')) return false;
    if (message.includes('invalid')) return false;
    if (message.includes('unauthorized')) return false;
    if (message.includes('forbidden')) return false;

    return true; // Default to retryable
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Delay execution
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log agent activity
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name}] [${level.toUpperCase()}]`;

    if (data) {
      console[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`);
    }
  }
}

// ===========================================
// Type Exports
// ===========================================

export type { AgentContext, AgentResult, AgentMetrics, AgentError };
