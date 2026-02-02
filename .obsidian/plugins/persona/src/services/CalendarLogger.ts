/**
 * CalendarLogger - Structured logging for calendar operations.
 *
 * Logs to instances/{business}/logs/calendar/calendar-{date}.log
 */

import * as fs from 'fs';
import * as path from 'path';
import { PersonaSettings } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface CalendarLogEntry {
  timestamp: string;
  level: LogLevel;
  operation: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface FetchMetrics {
  fetchAttempts: number;
  fetchSuccesses: number;
  fetchFailures: number;
  totalEventsProcessed: number;
  avgFetchTimeMs: number;
  lastSuccessfulFetch: Date | null;
  circuitBreakerTrips: number;
}

/**
 * Logger for calendar operations.
 *
 * Provides structured logging with levels, operation tags, and metadata.
 * Writes to local files for debugging calendar integration issues.
 */
export class CalendarLogger {
  private logDir: string;
  private metrics: FetchMetrics = {
    fetchAttempts: 0,
    fetchSuccesses: 0,
    fetchFailures: 0,
    totalEventsProcessed: 0,
    avgFetchTimeMs: 0,
    lastSuccessfulFetch: null,
    circuitBreakerTrips: 0,
  };
  private fetchTimes: number[] = [];
  private minLevel: LogLevel;

  constructor(settings: PersonaSettings, minLevel: LogLevel = 'info') {
    this.logDir = path.join(
      settings.personaRoot,
      'instances',
      settings.business,
      'logs',
      'calendar'
    );
    this.minLevel = minLevel;
  }

  /**
   * Log fetch operation start.
   */
  logFetchStart(calendar: string, date: Date): void {
    this.log('info', 'fetch:start', `Fetching events for ${this.formatDate(date)}`, {
      calendar,
      date: date.toISOString(),
    });
    this.metrics.fetchAttempts++;
  }

  /**
   * Log successful fetch completion.
   */
  logFetchComplete(eventCount: number, fetchTimeMs: number, retryCount: number): void {
    this.log('info', 'fetch:complete', `Fetch completed successfully`, {
      eventCount,
      fetchTimeMs,
      retryCount,
    });
    this.metrics.fetchSuccesses++;
    this.metrics.totalEventsProcessed += eventCount;
    this.metrics.lastSuccessfulFetch = new Date();
    this.updateAvgFetchTime(fetchTimeMs);
  }

  /**
   * Log fetch failure.
   */
  logFetchFailure(error: string, retryCount: number): void {
    this.log('error', 'fetch:failed', `Fetch failed after ${retryCount} retries`, {
      error,
      retryCount,
    });
    this.metrics.fetchFailures++;
  }

  /**
   * Log retry attempt.
   */
  logRetry(attempt: number, delayMs: number, error: Error): void {
    this.log('warn', 'fetch:retry', `Retrying after error (attempt ${attempt})`, {
      attempt,
      delayMs,
      error: error.message,
    });
  }

  /**
   * Log circuit breaker state change.
   */
  logCircuitBreaker(state: 'open' | 'closed' | 'half-open', reason?: string): void {
    const level: LogLevel = state === 'open' ? 'warn' : 'info';
    this.log(level, 'circuit:state', `Circuit breaker ${state}`, {
      state,
      reason,
    });
    if (state === 'open') {
      this.metrics.circuitBreakerTrips++;
    }
  }

  /**
   * Log timezone conversion.
   */
  logTimezoneConversion(
    original: string,
    converted: string,
    eventUid: string,
    confidence: string
  ): void {
    this.log('debug', 'timezone:convert', `Converted timezone`, {
      original,
      converted,
      eventUid,
      confidence,
    });
  }

  /**
   * Log meeting note creation.
   */
  logMeetingNoteCreated(eventTitle: string, notePath: string): void {
    this.log('info', 'note:created', `Created meeting note`, {
      eventTitle,
      notePath,
    });
  }

  /**
   * Log meeting note skipped (duplicate).
   */
  logMeetingNoteSkipped(eventTitle: string, reason: string): void {
    this.log('debug', 'note:skipped', `Skipped meeting note`, {
      eventTitle,
      reason,
    });
  }

  /**
   * Log general error.
   */
  logError(operation: string, error: Error): void {
    this.log('error', operation, error.message, {
      stack: error.stack,
    });
  }

  /**
   * Log MCP connection state.
   */
  logMCPConnection(state: string, serverName: string, error?: string): void {
    const level: LogLevel = error ? 'error' : 'info';
    this.log(level, 'mcp:connection', `MCP ${serverName} ${state}`, {
      state,
      serverName,
      error,
    });
  }

  /**
   * Get current metrics.
   */
  getMetrics(): FetchMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (for testing).
   */
  resetMetrics(): void {
    this.metrics = {
      fetchAttempts: 0,
      fetchSuccesses: 0,
      fetchFailures: 0,
      totalEventsProcessed: 0,
      avgFetchTimeMs: 0,
      lastSuccessfulFetch: null,
      circuitBreakerTrips: 0,
    };
    this.fetchTimes = [];
  }

  // ---- Private methods ----

  private log(
    level: LogLevel,
    operation: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: CalendarLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      metadata,
    };

    // Console output
    const prefix = `[Calendar ${level.toUpperCase()}]`;
    if (metadata) {
      console.log(prefix, `${operation}: ${message}`, metadata);
    } else {
      console.log(prefix, `${operation}: ${message}`);
    }

    // File output
    this.writeToFile(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private writeToFile(entry: CalendarLogEntry): void {
    try {
      // Ensure log directory exists
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // Create dated log file
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `calendar-${date}.log`);

      // Format log line
      const levelPad = entry.level.toUpperCase().padEnd(5);
      const operationPad = entry.operation.padEnd(20);
      let line = `[${entry.timestamp}] ${levelPad} ${operationPad} ${entry.message}`;
      if (entry.metadata) {
        line += ` ${JSON.stringify(entry.metadata)}`;
      }
      line += '\n';

      // Append to file
      fs.appendFileSync(logFile, line);
    } catch (err) {
      // Silently fail if logging fails - don't disrupt main functionality
      console.error('Failed to write to calendar log:', err);
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private updateAvgFetchTime(timeMs: number): void {
    this.fetchTimes.push(timeMs);
    // Keep last 10 for rolling average
    if (this.fetchTimes.length > 10) {
      this.fetchTimes.shift();
    }
    this.metrics.avgFetchTimeMs = Math.round(
      this.fetchTimes.reduce((a, b) => a + b, 0) / this.fetchTimes.length
    );
  }
}
