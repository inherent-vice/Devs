/**
 * A2A Protocol Types
 *
 * Agent-to-Agent communication protocol for:
 * - Agent discovery and registration
 * - Capability negotiation
 * - Task delegation
 * - Result sharing
 *
 * Based on Google A2A Protocol specification
 */

import { z } from 'zod';

// ===========================================
// Agent Card Schema
// ===========================================

/**
 * Agent Card - Describes an agent's capabilities
 */
export const AgentCardSchema = z.object({
  /** Unique agent identifier */
  id: z.string(),

  /** Human-readable name */
  name: z.string(),

  /** Agent description */
  description: z.string(),

  /** Agent version */
  version: z.string().default('1.0.0'),

  /** Provider/owner information */
  provider: z.object({
    name: z.string(),
    url: z.string().optional(),
  }).optional(),

  /** Capabilities this agent provides */
  capabilities: z.array(z.object({
    /** Capability name */
    name: z.string(),

    /** Capability description */
    description: z.string(),

    /** Input schema (JSON Schema format) */
    inputSchema: z.record(z.any()).optional(),

    /** Output schema (JSON Schema format) */
    outputSchema: z.record(z.any()).optional(),

    /** Tags for discovery */
    tags: z.array(z.string()).optional(),
  })),

  /** Skills/domains this agent specializes in */
  skills: z.array(z.string()),

  /** Agent status */
  status: z.enum(['active', 'inactive', 'busy', 'error']).default('active'),

  /** Cost estimate per invocation */
  costEstimate: z.object({
    currency: z.string().default('USD'),
    min: z.number(),
    max: z.number(),
    unit: z.enum(['per_call', 'per_token', 'per_minute']),
  }).optional(),

  /** Rate limits */
  rateLimits: z.object({
    requestsPerMinute: z.number().optional(),
    tokensPerMinute: z.number().optional(),
    concurrentRequests: z.number().optional(),
  }).optional(),

  /** Communication endpoint */
  endpoint: z.string().optional(),

  /** Authentication requirements */
  authentication: z.object({
    type: z.enum(['none', 'api_key', 'oauth2', 'jwt']),
    config: z.record(z.any()).optional(),
  }).optional(),

  /** Metadata */
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export type AgentCard = z.infer<typeof AgentCardSchema>;

// ===========================================
// Task Delegation Schema
// ===========================================

/**
 * Task - Represents work to be delegated to an agent
 */
export const TaskSchema = z.object({
  /** Unique task identifier */
  id: z.string(),

  /** Task type/name */
  type: z.string(),

  /** Task description */
  description: z.string().optional(),

  /** Input data for the task */
  input: z.record(z.any()),

  /** Priority level */
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),

  /** Task timeout in milliseconds */
  timeout: z.number().optional(),

  /** Parent task ID (for subtasks) */
  parentTaskId: z.string().optional(),

  /** Requesting agent ID */
  requesterId: z.string(),

  /** Target agent ID (if known) */
  targetAgentId: z.string().optional(),

  /** Required capabilities */
  requiredCapabilities: z.array(z.string()).optional(),

  /** Context to pass to the agent */
  context: z.record(z.any()).optional(),

  /** Creation timestamp */
  createdAt: z.string().datetime(),

  /** Deadline timestamp */
  deadline: z.string().datetime().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Task Result - Response from an agent
 */
export const TaskResultSchema = z.object({
  /** Task ID this result belongs to */
  taskId: z.string(),

  /** Agent that executed the task */
  agentId: z.string(),

  /** Whether the task succeeded */
  success: z.boolean(),

  /** Result data (if successful) */
  data: z.any().optional(),

  /** Error information (if failed) */
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    retryable: z.boolean().default(false),
  }).optional(),

  /** Execution metrics */
  metrics: z.object({
    duration: z.number(),
    tokensUsed: z.number().optional(),
    cost: z.number().optional(),
  }),

  /** Completion timestamp */
  completedAt: z.string().datetime(),

  /** Any follow-up tasks suggested */
  suggestedTasks: z.array(TaskSchema).optional(),
});

export type TaskResult = z.infer<typeof TaskResultSchema>;

// ===========================================
// Message Schema
// ===========================================

/**
 * A2A Message - Communication between agents
 */
export const A2AMessageSchema = z.object({
  /** Message ID */
  id: z.string(),

  /** Message type */
  type: z.enum([
    'task_request',
    'task_result',
    'capability_query',
    'capability_response',
    'status_update',
    'heartbeat',
    'error',
  ]),

  /** Sender agent ID */
  from: z.string(),

  /** Recipient agent ID */
  to: z.string(),

  /** Message payload */
  payload: z.any(),

  /** Correlation ID for request/response matching */
  correlationId: z.string().optional(),

  /** Message timestamp */
  timestamp: z.string().datetime(),

  /** Time-to-live in milliseconds */
  ttl: z.number().optional(),
});

export type A2AMessage = z.infer<typeof A2AMessageSchema>;

// ===========================================
// Capability Query Schema
// ===========================================

export const CapabilityQuerySchema = z.object({
  /** Required skills */
  skills: z.array(z.string()).optional(),

  /** Required capability names */
  capabilities: z.array(z.string()).optional(),

  /** Tags to filter by */
  tags: z.array(z.string()).optional(),

  /** Maximum cost limit */
  maxCost: z.number().optional(),

  /** Required status */
  status: z.enum(['active', 'any']).default('active'),
});

export type CapabilityQuery = z.infer<typeof CapabilityQuerySchema>;

// ===========================================
// Event Types
// ===========================================

export type A2AEventType =
  | 'agent_registered'
  | 'agent_unregistered'
  | 'agent_status_changed'
  | 'task_submitted'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'message_received'
  | 'message_sent';

export interface A2AEvent {
  type: A2AEventType;
  agentId?: string;
  taskId?: string;
  timestamp: Date;
  data: unknown;
}

// ===========================================
// Error Types
// ===========================================

export class A2AError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'A2AError';
  }
}

export const A2AErrorCodes = {
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  CAPABILITY_NOT_FOUND: 'CAPABILITY_NOT_FOUND',
  TASK_TIMEOUT: 'TASK_TIMEOUT',
  TASK_FAILED: 'TASK_FAILED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;
