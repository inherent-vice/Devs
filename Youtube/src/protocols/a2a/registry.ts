/**
 * A2A Registry
 *
 * Central registry for agent discovery and management:
 * - Agent registration/deregistration
 * - Capability-based discovery
 * - Health monitoring
 * - Load balancing
 */

import { EventEmitter } from 'events';
import {
  AgentCard,
  AgentCardSchema,
  CapabilityQuery,
  A2AEvent,
  A2AEventType,
  A2AError,
  A2AErrorCodes,
} from './types.js';

// ===========================================
// Registry Types
// ===========================================

interface RegisteredAgent {
  card: AgentCard;
  registeredAt: Date;
  lastHeartbeat: Date;
  requestCount: number;
  errorCount: number;
  averageLatency: number;
}

interface RegistryOptions {
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;

  /** Agent timeout in milliseconds (no heartbeat) */
  agentTimeout?: number;

  /** Enable load balancing */
  loadBalancing?: boolean;
}

// ===========================================
// A2A Registry
// ===========================================

export class A2ARegistry extends EventEmitter {
  private agents = new Map<string, RegisteredAgent>();
  private capabilityIndex = new Map<string, Set<string>>(); // capability -> agent IDs
  private skillIndex = new Map<string, Set<string>>(); // skill -> agent IDs
  private heartbeatTimer?: NodeJS.Timeout;
  private options: Required<RegistryOptions>;

  constructor(options: RegistryOptions = {}) {
    super();
    this.options = {
      heartbeatInterval: options.heartbeatInterval || 30000,
      agentTimeout: options.agentTimeout || 90000,
      loadBalancing: options.loadBalancing ?? true,
    };
  }

  // ===========================================
  // Agent Registration
  // ===========================================

  /**
   * Register an agent with the registry
   */
  register(card: AgentCard): void {
    // Validate the agent card
    const validation = AgentCardSchema.safeParse(card);
    if (!validation.success) {
      throw new A2AError(
        `Invalid agent card: ${validation.error.message}`,
        A2AErrorCodes.INVALID_MESSAGE,
        false
      );
    }

    const agent: RegisteredAgent = {
      card: validation.data,
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
      requestCount: 0,
      errorCount: 0,
      averageLatency: 0,
    };

    // Store agent
    this.agents.set(card.id, agent);

    // Index capabilities
    for (const capability of card.capabilities) {
      if (!this.capabilityIndex.has(capability.name)) {
        this.capabilityIndex.set(capability.name, new Set());
      }
      this.capabilityIndex.get(capability.name)!.add(card.id);

      // Index tags
      for (const tag of capability.tags || []) {
        if (!this.skillIndex.has(tag)) {
          this.skillIndex.set(tag, new Set());
        }
        this.skillIndex.get(tag)!.add(card.id);
      }
    }

    // Index skills
    for (const skill of card.skills) {
      if (!this.skillIndex.has(skill)) {
        this.skillIndex.set(skill, new Set());
      }
      this.skillIndex.get(skill)!.add(card.id);
    }

    this.emit('agent_registered', { type: 'agent_registered', agentId: card.id, timestamp: new Date(), data: card });
    console.log(`[A2ARegistry] Agent registered: ${card.id} (${card.name})`);
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Remove from capability index
    for (const capability of agent.card.capabilities) {
      this.capabilityIndex.get(capability.name)?.delete(agentId);
    }

    // Remove from skill index
    for (const skill of agent.card.skills) {
      this.skillIndex.get(skill)?.delete(agentId);
    }

    this.agents.delete(agentId);
    this.emit('agent_unregistered', { type: 'agent_unregistered', agentId, timestamp: new Date(), data: null });
    console.log(`[A2ARegistry] Agent unregistered: ${agentId}`);
    return true;
  }

  /**
   * Update agent heartbeat
   */
  heartbeat(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = new Date();
    }
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: AgentCard['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      const oldStatus = agent.card.status;
      agent.card.status = status;
      if (oldStatus !== status) {
        this.emit('agent_status_changed', {
          type: 'agent_status_changed',
          agentId,
          timestamp: new Date(),
          data: { oldStatus, newStatus: status },
        });
      }
    }
  }

  // ===========================================
  // Agent Discovery
  // ===========================================

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): AgentCard | undefined {
    return this.agents.get(agentId)?.card;
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentCard[] {
    return Array.from(this.agents.values()).map(a => a.card);
  }

  /**
   * Find agents by capability query
   */
  findAgents(query: CapabilityQuery): AgentCard[] {
    let candidateIds = new Set<string>(this.agents.keys());

    // Filter by capabilities
    if (query.capabilities?.length) {
      const capableAgents = new Set<string>();
      for (const cap of query.capabilities) {
        const agentIds = this.capabilityIndex.get(cap);
        if (agentIds) {
          agentIds.forEach(id => capableAgents.add(id));
        }
      }
      candidateIds = this.intersection(candidateIds, capableAgents);
    }

    // Filter by skills
    if (query.skills?.length) {
      const skilledAgents = new Set<string>();
      for (const skill of query.skills) {
        const agentIds = this.skillIndex.get(skill);
        if (agentIds) {
          agentIds.forEach(id => skilledAgents.add(id));
        }
      }
      candidateIds = this.intersection(candidateIds, skilledAgents);
    }

    // Filter by tags
    if (query.tags?.length) {
      const taggedAgents = new Set<string>();
      for (const tag of query.tags) {
        const agentIds = this.skillIndex.get(tag);
        if (agentIds) {
          agentIds.forEach(id => taggedAgents.add(id));
        }
      }
      candidateIds = this.intersection(candidateIds, taggedAgents);
    }

    // Get agent cards
    let results: AgentCard[] = [];
    for (const id of candidateIds) {
      const agent = this.agents.get(id);
      if (agent) {
        // Filter by status
        if (query.status === 'active' && agent.card.status !== 'active') {
          continue;
        }

        // Filter by max cost
        if (query.maxCost !== undefined && agent.card.costEstimate) {
          if (agent.card.costEstimate.max > query.maxCost) {
            continue;
          }
        }

        results.push(agent.card);
      }
    }

    // Apply load balancing if enabled
    if (this.options.loadBalancing) {
      results = this.sortByLoad(results);
    }

    return results;
  }

  /**
   * Find the best agent for a task
   */
  findBestAgent(query: CapabilityQuery): AgentCard | undefined {
    const agents = this.findAgents(query);
    return agents[0]; // Already sorted by load
  }

  // ===========================================
  // Metrics & Monitoring
  // ===========================================

  /**
   * Record a request to an agent
   */
  recordRequest(agentId: string, latency: number, success: boolean): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.requestCount++;
      if (!success) {
        agent.errorCount++;
      }
      // Update running average latency
      const n = agent.requestCount;
      agent.averageLatency = agent.averageLatency * ((n - 1) / n) + latency / n;
    }
  }

  /**
   * Get agent statistics
   */
  getAgentStats(agentId: string): {
    requestCount: number;
    errorCount: number;
    errorRate: number;
    averageLatency: number;
  } | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;

    return {
      requestCount: agent.requestCount,
      errorCount: agent.errorCount,
      errorRate: agent.requestCount > 0 ? agent.errorCount / agent.requestCount : 0,
      averageLatency: agent.averageLatency,
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAgents: number;
    activeAgents: number;
    totalCapabilities: number;
    totalSkills: number;
  } {
    let activeCount = 0;
    for (const agent of this.agents.values()) {
      if (agent.card.status === 'active') {
        activeCount++;
      }
    }

    return {
      totalAgents: this.agents.size,
      activeAgents: activeCount,
      totalCapabilities: this.capabilityIndex.size,
      totalSkills: this.skillIndex.size,
    };
  }

  // ===========================================
  // Lifecycle
  // ===========================================

  /**
   * Start the registry (heartbeat monitoring)
   */
  start(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, this.options.heartbeatInterval);
    console.log('[A2ARegistry] Started');
  }

  /**
   * Stop the registry
   */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    console.log('[A2ARegistry] Stopped');
  }

  /**
   * Clear all registered agents
   */
  clear(): void {
    this.agents.clear();
    this.capabilityIndex.clear();
    this.skillIndex.clear();
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  private intersection(a: Set<string>, b: Set<string>): Set<string> {
    const result = new Set<string>();
    for (const item of a) {
      if (b.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  private sortByLoad(agents: AgentCard[]): AgentCard[] {
    return agents.sort((a, b) => {
      const statsA = this.getAgentStats(a.id);
      const statsB = this.getAgentStats(b.id);

      if (!statsA || !statsB) return 0;

      // Sort by error rate first, then by request count
      if (statsA.errorRate !== statsB.errorRate) {
        return statsA.errorRate - statsB.errorRate;
      }
      return statsA.requestCount - statsB.requestCount;
    });
  }

  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = this.options.agentTimeout;

    for (const [agentId, agent] of this.agents) {
      const elapsed = now - agent.lastHeartbeat.getTime();
      if (elapsed > timeout) {
        console.warn(`[A2ARegistry] Agent ${agentId} timed out (no heartbeat for ${elapsed}ms)`);
        this.updateStatus(agentId, 'inactive');
      }
    }
  }
}

// ===========================================
// Singleton Export
// ===========================================

let registryInstance: A2ARegistry | null = null;

export function getA2ARegistry(): A2ARegistry {
  if (!registryInstance) {
    registryInstance = new A2ARegistry();
  }
  return registryInstance;
}
