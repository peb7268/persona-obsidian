/**
 * ExecutionSlotManager - Manages concurrent execution slots for agents
 *
 * Provides slot-based concurrency control where:
 * - Maximum N agents can run simultaneously (configurable)
 * - Only ONE job per agent type at a time (researcher can't overlap researcher)
 * - Different agent types CAN run in parallel (researcher + assistant OK)
 */

export interface SlotInfo {
  slotId: number;
  agent: string;
  jobId: string;
  startTime: Date;
}

export interface IExecutionSlotManager {
  acquireSlot(agent: string, jobId: string): number | null;
  releaseSlot(slotId: number): void;
  isAgentRunning(agent: string): boolean;
  getActiveCount(): number;
  getActiveSlots(): SlotInfo[];
  getMaxSlots(): number;
  setMaxSlots(max: number): void;
}

export class ExecutionSlotManager implements IExecutionSlotManager {
  private slots: Map<number, SlotInfo> = new Map();
  private agentToSlot: Map<string, number> = new Map();
  private nextSlotId = 1;

  constructor(private maxSlots: number) {}

  /**
   * Attempt to acquire a slot for an agent
   * @returns slot ID if acquired, null if agent already running or no capacity
   */
  acquireSlot(agent: string, jobId: string): number | null {
    // Check if this agent is already running
    if (this.agentToSlot.has(agent)) {
      return null;
    }

    // Check if we have capacity
    if (this.slots.size >= this.maxSlots) {
      return null;
    }

    // Acquire slot
    const slotId = this.nextSlotId++;
    const slotInfo: SlotInfo = {
      slotId,
      agent,
      jobId,
      startTime: new Date(),
    };

    this.slots.set(slotId, slotInfo);
    this.agentToSlot.set(agent, slotId);

    return slotId;
  }

  /**
   * Release a slot when execution completes
   */
  releaseSlot(slotId: number): void {
    const slot = this.slots.get(slotId);
    if (slot) {
      this.agentToSlot.delete(slot.agent);
      this.slots.delete(slotId);
    }
  }

  /**
   * Check if an agent is currently running
   */
  isAgentRunning(agent: string): boolean {
    return this.agentToSlot.has(agent);
  }

  /**
   * Get number of active slots
   */
  getActiveCount(): number {
    return this.slots.size;
  }

  /**
   * Get all active slot information
   */
  getActiveSlots(): SlotInfo[] {
    return Array.from(this.slots.values());
  }

  /**
   * Get maximum number of slots
   */
  getMaxSlots(): number {
    return this.maxSlots;
  }

  /**
   * Update maximum slots (for settings changes)
   */
  setMaxSlots(max: number): void {
    this.maxSlots = max;
  }

  /**
   * Check if there's capacity for another job
   */
  hasCapacity(): boolean {
    return this.slots.size < this.maxSlots;
  }

  /**
   * Get number of available slots
   */
  getAvailableSlots(): number {
    return Math.max(0, this.maxSlots - this.slots.size);
  }

  /**
   * Get list of agents currently running
   */
  getRunningAgents(): string[] {
    return Array.from(this.agentToSlot.keys());
  }
}
