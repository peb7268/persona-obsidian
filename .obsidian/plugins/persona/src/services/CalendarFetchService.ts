/**
 * CalendarFetchService - Fetch calendar events with reliability features.
 *
 * Features:
 * - Retry with exponential backoff
 * - Circuit breaker for sustained failures
 * - Timeout handling
 * - Structured logging
 */

import { MCPClientService, MCPConnectionState } from './MCPClientService';
import { CalendarLogger } from './CalendarLogger';
import { TimezoneResolver, TimezoneResolution } from './TimezoneResolver';
import { PersonaSettings } from '../types';

export interface CalendarEvent {
  uid: string;
  title: string;
  startDate: string;           // ISO8601 with offset
  endDate: string;             // ISO8601 with offset
  calendar: string;
  location?: string;
  attendees?: string[];
  organizer?: string;
  originalTimezone: string;
  startResolution: TimezoneResolution;
  endResolution: TimezoneResolution;
}

export interface FetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  calendars?: string[];
}

export interface FetchResult {
  success: boolean;
  events: CalendarEvent[];
  fetchTimeMs: number;
  retryCount: number;
  error?: string;
  circuitOpen?: boolean;
}

const DEFAULT_FETCH_OPTIONS: Required<Omit<FetchOptions, 'calendars'>> = {
  timeoutMs: 30000,
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Service for fetching calendar events via MCP.
 *
 * Provides reliability features including retry with exponential backoff
 * and circuit breaker pattern for sustained failures.
 */
export class CalendarFetchService {
  private consecutiveFailures = 0;
  private circuitOpenUntil: Date | null = null;
  private lastError: Error | null = null;

  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private mcpClient: MCPClientService,
    private logger: CalendarLogger,
    private timezoneResolver: TimezoneResolver,
    private settings: PersonaSettings
  ) {}

  /**
   * Fetch events for today.
   */
  async fetchTodaysEvents(options?: FetchOptions): Promise<FetchResult> {
    return this.fetchEventsForDate(new Date(), options);
  }

  /**
   * Fetch events for a specific date.
   */
  async fetchEventsForDate(date: Date, options?: FetchOptions): Promise<FetchResult> {
    const opts = { ...DEFAULT_FETCH_OPTIONS, ...options };
    const startTime = Date.now();

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      this.logger.logCircuitBreaker('open', 'Circuit breaker is open');
      return {
        success: false,
        events: [],
        fetchTimeMs: Date.now() - startTime,
        retryCount: 0,
        error: 'Calendar service temporarily unavailable (circuit breaker open)',
        circuitOpen: true,
      };
    }

    // Ensure MCP connection
    if (!this.mcpClient.isConnected()) {
      try {
        const config = MCPClientService.configFromSettings(this.settings.mcp.ical);
        await this.mcpClient.connect(config);
        this.logger.logMCPConnection('connected', 'ical');
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.logMCPConnection('failed', 'ical', error);
        this.recordFailure(err instanceof Error ? err : new Error(error));
        return {
          success: false,
          events: [],
          fetchTimeMs: Date.now() - startTime,
          retryCount: 0,
          error,
        };
      }
    }

    const calendar = opts.calendars?.[0] || 'all';
    this.logger.logFetchStart(calendar, date);

    try {
      const { events, retryCount } = await this.fetchWithRetry(date, opts);
      const fetchTimeMs = Date.now() - startTime;

      this.logger.logFetchComplete(events.length, fetchTimeMs, retryCount);
      this.recordSuccess();

      return {
        success: true,
        events,
        fetchTimeMs,
        retryCount,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const fetchTimeMs = Date.now() - startTime;

      this.logger.logFetchFailure(error, opts.maxRetries);
      this.recordFailure(err instanceof Error ? err : new Error(error));

      return {
        success: false,
        events: [],
        fetchTimeMs,
        retryCount: opts.maxRetries,
        error,
      };
    }
  }

  /**
   * Get circuit breaker state.
   */
  isCircuitOpen(): boolean {
    if (!this.circuitOpenUntil) {
      return false;
    }

    if (new Date() > this.circuitOpenUntil) {
      // Cooldown expired - allow probe request
      this.logger.logCircuitBreaker('half-open', 'Attempting probe request');
      return false;
    }

    return true;
  }

  /**
   * Get last error.
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Reset circuit breaker (for testing).
   */
  resetCircuitBreaker(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = null;
    this.lastError = null;
  }

  // ---- Private methods ----

  private async fetchWithRetry(
    date: Date,
    opts: Required<Omit<FetchOptions, 'calendars'>> & { calendars?: string[] }
  ): Promise<{ events: CalendarEvent[]; retryCount: number }> {
    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
      try {
        const events = await this.fetchOnce(date, opts);
        return { events, retryCount: attempt };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        retryCount = attempt + 1;

        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        if (attempt === opts.maxRetries - 1) {
          break;
        }

        // Calculate backoff delay
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
          opts.maxDelayMs
        );

        this.logger.logRetry(attempt + 1, delay, lastError);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Fetch failed after retries');
  }

  private async fetchOnce(
    date: Date,
    opts: { timeoutMs: number; calendars?: string[] }
  ): Promise<CalendarEvent[]> {
    // Format date for MCP tool
    const dateStr = this.formatDateForMCP(date);

    // Call MCP tool with timeout
    const result = await Promise.race([
      this.mcpClient.callTool('get_events', {
        date: dateStr,
        calendar: opts.calendars?.[0],
      }),
      this.createTimeout(opts.timeoutMs),
    ]);

    if (!result.success) {
      throw new Error(result.error || 'MCP tool call failed');
    }

    // Parse and transform events
    return this.parseEvents(result.result);
  }

  private parseEvents(rawEvents: any): CalendarEvent[] {
    if (!Array.isArray(rawEvents)) {
      // Handle different response formats
      if (rawEvents?.events && Array.isArray(rawEvents.events)) {
        rawEvents = rawEvents.events;
      } else if (rawEvents?.content) {
        // MCP content format
        try {
          const parsed = typeof rawEvents.content === 'string'
            ? JSON.parse(rawEvents.content)
            : rawEvents.content;
          rawEvents = Array.isArray(parsed) ? parsed : parsed.events || [];
        } catch {
          return [];
        }
      } else {
        return [];
      }
    }

    return rawEvents.map((event: any) => this.transformEvent(event)).filter(Boolean);
  }

  private transformEvent(raw: any): CalendarEvent | null {
    if (!raw || !raw.title) {
      return null;
    }

    const uid = raw.uid || raw.id || `${raw.title}-${raw.start}`;
    const originalTimezone = raw.timezone || raw.tzid || '';

    // Resolve start time
    const startResolution = this.timezoneResolver.resolve(
      raw.start || raw.startDate,
      originalTimezone
    );

    // Resolve end time
    const endResolution = this.timezoneResolver.resolve(
      raw.end || raw.endDate,
      originalTimezone
    );

    // Log timezone conversion if it was converted
    if (startResolution.wasConverted || startResolution.confidence !== 'high') {
      this.logger.logTimezoneConversion(
        startResolution.originalSpec,
        startResolution.isoString,
        uid,
        startResolution.confidence
      );
    }

    return {
      uid,
      title: raw.title || raw.summary || 'Untitled',
      startDate: startResolution.isoString,
      endDate: endResolution.isoString,
      calendar: raw.calendar || raw.calendarName || 'Default',
      location: raw.location,
      attendees: this.parseAttendees(raw.attendees),
      organizer: raw.organizer,
      originalTimezone,
      startResolution,
      endResolution,
    };
  }

  private parseAttendees(attendees: any): string[] | undefined {
    if (!attendees) return undefined;
    if (Array.isArray(attendees)) {
      return attendees.map((a: any) => {
        if (typeof a === 'string') return a;
        return a.name || a.email || String(a);
      });
    }
    if (typeof attendees === 'string') {
      return attendees.split(',').map(s => s.trim());
    }
    return undefined;
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('mcp server not responding')
    );
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.lastError = null;

    // Close circuit if it was half-open
    if (this.circuitOpenUntil) {
      this.logger.logCircuitBreaker('closed', 'Probe request succeeded');
      this.circuitOpenUntil = null;
    }
  }

  private recordFailure(error: Error): void {
    this.consecutiveFailures++;
    this.lastError = error;

    if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.tripCircuit();
    }
  }

  private tripCircuit(): void {
    this.circuitOpenUntil = new Date(Date.now() + this.CIRCUIT_BREAKER_COOLDOWN_MS);
    this.logger.logCircuitBreaker(
      'open',
      `${this.consecutiveFailures} consecutive failures`
    );
  }

  private formatDateForMCP(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), ms);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
