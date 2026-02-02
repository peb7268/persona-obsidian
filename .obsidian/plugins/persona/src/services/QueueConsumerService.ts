/**
 * QueueConsumerService - Polls Supabase for pending jobs and dispatches them to agents
 *
 * This service provides an active queue consumer that:
 * - Polls for pending jobs at a configurable interval
 * - Dispatches jobs to appropriate agents via ExecutionService
 * - Respects concurrency limits via ExecutionSlotManager
 * - Integrates with existing reliability features (heartbeat, timeout, orphan cleanup)
 */

import { JobQueueService, JobInfo } from './JobQueueService';
import { ExecutionService } from './ExecutionService';
import { ExecutionSlotManager } from './ExecutionSlotManager';
import { CalendarJobHandler, CalendarJobResult } from './CalendarJobHandler';
import { PersonaSettings } from '../types';

export interface ConsumerStatus {
  running: boolean;
  activeJobs: number;
  maxConcurrent: number;
  lastPollTime: Date | null;
  pollIntervalSeconds: number;
  runningAgents: string[];
}

export class QueueConsumerService {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastPollTime: Date | null = null;
  private pendingDispatches: Map<string, Promise<void>> = new Map();
  private calendarJobHandler: CalendarJobHandler | null = null;

  constructor(
    private jobQueueService: JobQueueService,
    private executionService: ExecutionService,
    private slotManager: ExecutionSlotManager,
    private settings: PersonaSettings
  ) {}

  /**
   * Set the calendar job handler (injected from main.ts)
   */
  setCalendarJobHandler(handler: CalendarJobHandler): void {
    this.calendarJobHandler = handler;
  }

  /**
   * Start the queue consumer polling loop
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[QueueConsumer] Already running');
      return;
    }

    this.running = true;
    console.log(`[QueueConsumer] Starting (interval: ${this.settings.queuePollIntervalSeconds}s, max concurrent: ${this.settings.maxConcurrentAgents})`);

    // Clean up orphaned jobs on startup
    await this.cleanupOrphanedJobs();

    // Initial poll after short delay
    setTimeout(() => this.poll(), 1000);

    // Schedule recurring polls
    const intervalMs = (this.settings.queuePollIntervalSeconds || 30) * 1000;
    this.pollInterval = setInterval(() => {
      this.poll();
    }, intervalMs);
  }

  /**
   * Clean up jobs that were orphaned (stuck in "running" state from a previous session)
   */
  private async cleanupOrphanedJobs(): Promise<void> {
    try {
      const hungThresholdMinutes = this.settings.hungThresholdMinutes || 10;
      const hungJobs = await this.jobQueueService.getHungJobs(hungThresholdMinutes);

      if (hungJobs.length === 0) {
        console.log('[QueueConsumer] No orphaned jobs found');
        return;
      }

      console.warn(`[QueueConsumer] Found ${hungJobs.length} orphaned job(s), marking as failed`);

      for (const job of hungJobs) {
        console.warn(`[QueueConsumer] Marking orphaned job ${job.shortId} (${job.assignedTo}) as failed - no heartbeat for ${hungThresholdMinutes}+ minutes`);
        await this.jobQueueService.updateJobStatus(
          job.shortId,
          'failed',
          `Orphaned - no heartbeat for ${hungThresholdMinutes}+ minutes (cleaned up on startup)`
        );
      }

      console.log(`[QueueConsumer] Cleaned up ${hungJobs.length} orphaned job(s)`);
    } catch (error) {
      console.error('[QueueConsumer] Failed to clean up orphaned jobs:', error);
    }
  }

  /**
   * Stop the queue consumer
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    console.log('QueueConsumerService stopped');

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Check if consumer is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current consumer status
   */
  getStatus(): ConsumerStatus {
    return {
      running: this.running,
      activeJobs: this.slotManager.getActiveCount(),
      maxConcurrent: this.slotManager.getMaxSlots(),
      lastPollTime: this.lastPollTime,
      pollIntervalSeconds: this.settings.queuePollIntervalSeconds || 30,
      runningAgents: this.slotManager.getRunningAgents(),
    };
  }

  /**
   * Update settings (called when settings change)
   */
  updateSettings(settings: PersonaSettings): void {
    this.settings = settings;
    this.slotManager.setMaxSlots(settings.maxConcurrentAgents || 2);

    // Restart with new interval if running
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  /**
   * Poll for pending jobs and dispatch them
   */
  private async poll(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.lastPollTime = new Date();

    try {
      // Get pending jobs from Supabase
      const pendingJobs = await this.jobQueueService.getPendingJobs();

      if (pendingJobs.length === 0) {
        return;
      }

      const slotStatus = this.slotManager.getStatus();
      console.log(`[QueueConsumer] Poll: ${pendingJobs.length} pending jobs, ${slotStatus.activeSlots}/${slotStatus.maxSlots} slots used`);

      // Try to dispatch jobs while we have capacity
      let dispatched = 0;
      for (const job of pendingJobs) {
        if (!this.running) break;
        if (!this.slotManager.hasCapacity()) {
          console.log(`[QueueConsumer] No capacity remaining, ${pendingJobs.length - dispatched} jobs still pending`);
          break;
        }

        const success = await this.tryDispatchJob(job);
        if (success) dispatched++;
      }

      if (dispatched > 0) {
        console.log(`[QueueConsumer] Dispatched ${dispatched} job(s) this poll cycle`);
      }
    } catch (error) {
      console.error('[QueueConsumer] Poll error:', error);
    }
  }

  /**
   * Attempt to dispatch a single job
   */
  private async tryDispatchJob(job: JobInfo): Promise<boolean> {
    const agent = job.assignedTo;

    // Skip jobs without an assigned agent
    if (!agent) {
      console.warn(`[QueueConsumer] Skipping job ${job.shortId}: no assignedTo field`);
      return false;
    }

    // Check if this agent is already running (in our slot manager)
    if (this.slotManager.isAgentRunning(agent)) {
      console.log(`[QueueConsumer] Skipping job ${job.shortId}: agent "${agent}" already running in slot`);
      return false;
    }

    // Also check ExecutionService's running state (for agents started outside consumer)
    if (this.executionService.isAgentRunning(agent)) {
      console.log(`[QueueConsumer] Skipping job ${job.shortId}: agent "${agent}" already running (external)`);
      return false;
    }

    // Check capacity before acquiring
    if (!this.slotManager.hasCapacity()) {
      const status = this.slotManager.getStatus();
      console.log(`[QueueConsumer] Queue blocked: ${status.activeSlots}/${status.maxSlots} slots full (running: ${status.runningAgents.join(', ')})`);
      return false;
    }

    // Try to acquire a slot
    const slotId = this.slotManager.acquireSlot(agent, job.shortId);
    if (slotId === null) {
      console.warn(`[QueueConsumer] Failed to acquire slot for job ${job.shortId}`);
      return false;
    }

    console.log(`[QueueConsumer] Dispatching job ${job.shortId} to agent "${agent}" (slot ${slotId})`);

    // Dispatch the job (don't await - let it run in background)
    const dispatchPromise = this.executeJobInSlot(job, slotId);
    this.pendingDispatches.set(job.shortId, dispatchPromise);

    return true;
  }

  /**
   * Execute a job and release its slot when done
   */
  private async executeJobInSlot(job: JobInfo, slotId: number): Promise<void> {
    const agent = job.assignedTo!;

    try {
      // Handle calendar_fetch jobs directly (no agent spawn)
      if (job.type === 'calendar_fetch') {
        await this.executeCalendarJob(job);
        return;
      }

      // Extract action from job payload
      const action = this.getActionFromJob(job);

      console.log(`QueueConsumer dispatching job ${job.shortId} to ${agent}:${action}`);

      // Execute via ExecutionService (handles heartbeat, timeout, status updates)
      const result = await this.executionService.runAgent(agent, action);

      if (result.success) {
        console.log(`QueueConsumer job ${job.shortId} completed successfully`);
      } else {
        console.log(`QueueConsumer job ${job.shortId} failed`);
      }
    } catch (error) {
      console.error(`QueueConsumer job ${job.shortId} error:`, error);
    } finally {
      // Always release the slot
      this.slotManager.releaseSlot(slotId);
      this.pendingDispatches.delete(job.shortId);
    }
  }

  /**
   * Execute a calendar_fetch job directly (no agent spawn)
   */
  private async executeCalendarJob(job: JobInfo): Promise<void> {
    if (!this.calendarJobHandler) {
      console.error(`CalendarJobHandler not set, cannot process job ${job.shortId}`);
      await this.jobQueueService.updateJobStatus(
        job.shortId,
        'failed',
        'Calendar service not initialized'
      );
      return;
    }

    // Mark job as running
    await this.jobQueueService.updateJobStatus(job.shortId, 'running');

    try {
      console.log(`QueueConsumer processing calendar job ${job.shortId}`);
      const result: CalendarJobResult = await this.calendarJobHandler.handleJob(job);

      if (result.success) {
        console.log(`Calendar job ${job.shortId} completed: ${result.notesCreated.length} notes created`);
        await this.jobQueueService.updateJobStatus(job.shortId, 'completed');
      } else {
        console.log(`Calendar job ${job.shortId} failed: ${result.error}`);
        await this.jobQueueService.updateJobStatus(job.shortId, 'failed', result.error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Calendar job ${job.shortId} error:`, error);
      await this.jobQueueService.updateJobStatus(job.shortId, 'failed', errorMsg);
    }
  }

  /**
   * Extract the action to run from a job
   */
  private getActionFromJob(job: JobInfo): string {
    // Check payload for explicit action (from createAgentActionJob)
    if (job.result?.action) {
      return job.result.action;
    }

    // Jobs may have action in their internal structure
    // The payload is stored in job.result for some job types
    const payload = job.result as { action?: string } | undefined;
    if (payload?.action) {
      return payload.action;
    }

    // Default actions based on job type
    const defaultActions: Record<string, string> = {
      'research': 'process-research-queue',
      'agent_action': 'default-action',
      'meeting_extract': 'extract-meetings',
    };

    return defaultActions[job.type] || 'process-research-queue';
  }

  /**
   * Force an immediate poll (useful for testing or manual trigger)
   */
  async pollNow(): Promise<void> {
    await this.poll();
  }

  /**
   * Get count of pending dispatches (jobs currently being executed by this consumer)
   */
  getPendingDispatchCount(): number {
    return this.pendingDispatches.size;
  }
}
