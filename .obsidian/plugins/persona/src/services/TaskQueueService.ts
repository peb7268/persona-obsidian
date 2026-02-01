import * as fs from 'fs';
import * as path from 'path';

export interface QueuedTask {
  id: string;
  content: string;
  instance: string;
  type: 'agent-task' | 'queued-task';
  line: number;
  sourcePath: string;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: string;
}

export interface QueueState {
  primary: QueuedTask[];
  secondary: QueuedTask[];
  dlq: QueuedTask[];
  lastUpdated: string;
}

const DEFAULT_QUEUE_STATE: QueueState = {
  primary: [],
  secondary: [],
  dlq: [],
  lastUpdated: new Date().toISOString(),
};

/**
 * TaskQueueService - Manages task queue with retry semantics
 *
 * Queue Structure:
 * - Primary: First attempt tasks
 * - Secondary: Retry queue (failed once)
 * - DLQ: Dead Letter Queue (failed twice, needs manual intervention)
 *
 * Persists to queue.json in the instance state directory.
 */
export class TaskQueueService {
  private queuePath: string;
  private state: QueueState;
  private maxConcurrent: number;
  private onSlotAvailable?: () => void;

  constructor(statePath: string, maxConcurrent: number = 2) {
    this.queuePath = path.join(statePath, 'queue.json');
    this.maxConcurrent = maxConcurrent;
    this.state = this.loadQueue();
  }

  /**
   * Load queue from disk or create new
   */
  private loadQueue(): QueueState {
    try {
      if (fs.existsSync(this.queuePath)) {
        const content = fs.readFileSync(this.queuePath, 'utf8');
        return JSON.parse(content) as QueueState;
      }
    } catch (err) {
      console.error('Failed to load queue.json:', err);
    }
    return { ...DEFAULT_QUEUE_STATE };
  }

  /**
   * Persist queue to disk
   */
  private saveQueue(): void {
    this.state.lastUpdated = new Date().toISOString();
    try {
      const dir = path.dirname(this.queuePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.queuePath, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('Failed to save queue.json:', err);
    }
  }

  /**
   * Update max concurrent tasks setting
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }

  /**
   * Get max concurrent setting
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * Check if we can run a new task immediately
   */
  canRunImmediately(runningCount: number): boolean {
    return runningCount < this.maxConcurrent;
  }

  /**
   * Add task to primary queue
   */
  enqueue(task: Omit<QueuedTask, 'attempts' | 'queuedAt'>): void {
    const fullTask: QueuedTask = {
      ...task,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    };
    this.state.primary.push(fullTask);
    this.saveQueue();
    console.log(`Queued task: ${task.content} (primary: ${this.state.primary.length})`);
  }

  /**
   * Get next task (primary first, then secondary)
   */
  dequeue(): QueuedTask | undefined {
    let task: QueuedTask | undefined;

    if (this.state.primary.length > 0) {
      task = this.state.primary.shift();
    } else if (this.state.secondary.length > 0) {
      task = this.state.secondary.shift();
    }

    if (task) {
      task.attempts++;
      task.lastAttemptAt = new Date().toISOString();
      this.saveQueue();
    }

    return task;
  }

  /**
   * Peek at next task without removing it
   */
  peek(): QueuedTask | undefined {
    if (this.state.primary.length > 0) {
      return this.state.primary[0];
    }
    if (this.state.secondary.length > 0) {
      return this.state.secondary[0];
    }
    return undefined;
  }

  /**
   * Handle task failure - move to secondary or DLQ
   */
  handleFailure(task: QueuedTask, error: string): void {
    task.lastError = error;

    if (task.attempts < 2) {
      // Move to secondary (retry queue)
      this.state.secondary.push(task);
      console.log(`Task moved to secondary queue: ${task.content}`);
    } else {
      // Move to DLQ (dead letter queue)
      this.state.dlq.push(task);
      console.log(`Task moved to DLQ: ${task.content}`);
    }

    this.saveQueue();
  }

  /**
   * Mark task as completed (just save state, task already dequeued)
   */
  handleSuccess(task: QueuedTask): void {
    console.log(`Task completed: ${task.content}`);
    this.saveQueue();
  }

  /**
   * Retry a task from DLQ (manual intervention)
   */
  retryFromDlq(taskId: string): boolean {
    const index = this.state.dlq.findIndex((t) => t.id === taskId);
    if (index >= 0) {
      const task = this.state.dlq.splice(index, 1)[0];
      task.attempts = 0;
      task.lastError = undefined;
      this.state.primary.push(task);
      this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * Retry all tasks from DLQ
   */
  retryAllFromDlq(): number {
    const count = this.state.dlq.length;
    for (const task of this.state.dlq) {
      task.attempts = 0;
      task.lastError = undefined;
      this.state.primary.push(task);
    }
    this.state.dlq = [];
    this.saveQueue();
    return count;
  }

  /**
   * Get queue sizes for status display
   */
  getStats(): { primary: number; secondary: number; dlq: number; total: number } {
    return {
      primary: this.state.primary.length,
      secondary: this.state.secondary.length,
      dlq: this.state.dlq.length,
      total: this.state.primary.length + this.state.secondary.length,
    };
  }

  /**
   * Get total pending tasks (primary + secondary)
   */
  size(): number {
    return this.state.primary.length + this.state.secondary.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Get all tasks in primary queue
   */
  getPrimary(): QueuedTask[] {
    return [...this.state.primary];
  }

  /**
   * Get all tasks in secondary queue
   */
  getSecondary(): QueuedTask[] {
    return [...this.state.secondary];
  }

  /**
   * Get DLQ tasks for review
   */
  getDlq(): QueuedTask[] {
    return [...this.state.dlq];
  }

  /**
   * Clear primary queue
   */
  clearPrimary(): void {
    this.state.primary = [];
    this.saveQueue();
  }

  /**
   * Clear secondary queue
   */
  clearSecondary(): void {
    this.state.secondary = [];
    this.saveQueue();
  }

  /**
   * Clear DLQ
   */
  clearDlq(): void {
    this.state.dlq = [];
    this.saveQueue();
  }

  /**
   * Clear all queues
   */
  clearAll(): void {
    this.state.primary = [];
    this.state.secondary = [];
    this.state.dlq = [];
    this.saveQueue();
  }

  /**
   * Set callback for when a slot becomes available
   */
  setSlotAvailableCallback(callback: () => void): void {
    this.onSlotAvailable = callback;
  }

  /**
   * Notify that a slot is available (call when task completes)
   */
  notifySlotAvailable(): void {
    if (this.onSlotAvailable && this.size() > 0) {
      this.onSlotAvailable();
    }
  }

  /**
   * Get formatted status string for display
   */
  getStatusString(runningCount: number): string {
    const stats = this.getStats();
    return `Running: ${runningCount}/${this.maxConcurrent} | Queued: ${stats.total}${stats.dlq > 0 ? ` | DLQ: ${stats.dlq}` : ''}`;
  }
}
