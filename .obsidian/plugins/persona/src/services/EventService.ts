/**
 * EventService - Supabase Realtime subscription for job status updates
 *
 * This service provides real-time job status updates by subscribing to
 * PostgreSQL changes via Supabase Realtime. This replaces the polling-based
 * approach with instant push notifications.
 *
 * Architecture:
 * - Subscribes to INSERT/UPDATE/DELETE on the jobs table
 * - Emits events to registered listeners when job state changes
 * - Works with both local Supabase and cloud deployments
 */

import { createClient, SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { PersonaSettings } from '../types';
import { JobInfo } from './JobQueueService';

export type JobChangeEvent = 'job:created' | 'job:updated' | 'job:deleted';
export type JobChangeCallback = (event: JobChangeEvent, job: JobInfo, oldJob?: JobInfo) => void;

// Map Supabase row to JobInfo
interface JobRow {
  id: string;
  short_id: string;
  job_type: string;
  status: string;
  assigned_to?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  result?: any;
  payload?: any;
  pid?: number;
  exit_code?: number;
}

function rowToJobInfo(row: JobRow): JobInfo {
  return {
    id: row.id,
    shortId: row.short_id,
    type: row.job_type,
    status: row.status,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    error: row.error_message,
    result: row.result,
    payload: row.payload,
    pid: row.pid,
    exitCode: row.exit_code,
  };
}

export class EventService {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private listeners: Set<JobChangeCallback> = new Set();
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private settings: PersonaSettings) {}

  /**
   * Initialize the Supabase client
   */
  private initClient(): SupabaseClient {
    if (!this.settings.supabaseUrl || !this.settings.supabaseKey) {
      throw new Error('Supabase URL and key are required for EventService');
    }

    return createClient(this.settings.supabaseUrl, this.settings.supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  /**
   * Start listening for job changes
   */
  async start(): Promise<void> {
    if (this.connected) {
      console.log('[EventService] Already connected');
      return;
    }

    try {
      this.client = this.initClient();

      // Subscribe to postgres changes on the jobs table
      this.channel = this.client
        .channel('job-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'jobs',
          },
          (payload: RealtimePostgresChangesPayload<JobRow>) => {
            this.handleJobChange(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log('[EventService] Connected to Supabase Realtime');
          } else if (status === 'CLOSED') {
            this.connected = false;
            console.log('[EventService] Disconnected from Supabase Realtime');
            this.attemptReconnect();
          } else if (status === 'CHANNEL_ERROR') {
            this.connected = false;
            console.error('[EventService] Channel error');
            this.attemptReconnect();
          }
        });
    } catch (error) {
      console.error('[EventService] Failed to connect:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Stop listening for job changes
   */
  async stop(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    if (this.client) {
      await this.client.removeAllChannels();
      this.client = null;
    }

    this.connected = false;
    console.log('[EventService] Stopped');
  }

  /**
   * Attempt to reconnect after a disconnect
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[EventService] Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[EventService] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      await this.stop();
      await this.start();
    }, delay);
  }

  /**
   * Handle a job change event from Supabase
   */
  private handleJobChange(payload: RealtimePostgresChangesPayload<JobRow>): void {
    const { eventType, new: newRow, old: oldRow } = payload;

    let event: JobChangeEvent;
    let job: JobInfo | null = null;
    let oldJob: JobInfo | undefined;

    switch (eventType) {
      case 'INSERT':
        event = 'job:created';
        job = rowToJobInfo(newRow as JobRow);
        break;
      case 'UPDATE':
        event = 'job:updated';
        job = rowToJobInfo(newRow as JobRow);
        oldJob = oldRow ? rowToJobInfo(oldRow as JobRow) : undefined;
        break;
      case 'DELETE':
        event = 'job:deleted';
        job = oldRow ? rowToJobInfo(oldRow as JobRow) : null;
        break;
      default:
        console.warn('[EventService] Unknown event type:', eventType);
        return;
    }

    if (!job) {
      console.warn('[EventService] No job data in event');
      return;
    }

    // Log status transitions for debugging
    if (eventType === 'UPDATE' && oldJob && oldJob.status !== job.status) {
      console.log(`[EventService] Job ${job.shortId} status: ${oldJob.status} → ${job.status}`);
    }

    // Notify all listeners
    this.listeners.forEach((callback) => {
      try {
        callback(event, job!, oldJob);
      } catch (error) {
        console.error('[EventService] Listener error:', error);
      }
    });
  }

  /**
   * Register a callback to be notified of job changes
   */
  onJobChange(callback: JobChangeCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Update settings (may require reconnection)
   */
  async updateSettings(settings: PersonaSettings): Promise<void> {
    const urlChanged = this.settings.supabaseUrl !== settings.supabaseUrl;
    const keyChanged = this.settings.supabaseKey !== settings.supabaseKey;

    this.settings = settings;

    // Reconnect if credentials changed
    if ((urlChanged || keyChanged) && this.connected) {
      console.log('[EventService] Credentials changed, reconnecting...');
      await this.stop();
      await this.start();
    }
  }

  /**
   * Get current connection status for debugging
   */
  getStatus(): { connected: boolean; reconnectAttempts: number; listenerCount: number } {
    return {
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
      listenerCount: this.listeners.size,
    };
  }
}
