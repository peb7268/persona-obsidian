import { CalendarLogger, LogLevel, FetchMetrics } from '../CalendarLogger';
import { PersonaSettings, DEFAULT_SETTINGS } from '../../types';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('CalendarLogger', () => {
  let logger: CalendarLogger;
  let mockSettings: PersonaSettings;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSettings = {
      ...DEFAULT_SETTINGS,
      personaRoot: '/test/persona',
      business: 'TestBusiness',
    };

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.appendFileSync as jest.Mock).mockImplementation(() => {});

    logger = new CalendarLogger(mockSettings);
  });

  describe('logFetchStart', () => {
    it('should log fetch start with calendar and date', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const date = new Date('2026-02-01T10:00:00Z');

      logger.logFetchStart('Personal', date);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar INFO]'),
        expect.stringContaining('fetch:start'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should increment fetchAttempts metric', () => {
      const date = new Date('2026-02-01T10:00:00Z');

      logger.logFetchStart('Personal', date);
      logger.logFetchStart('Personal', date);

      const metrics = logger.getMetrics();
      expect(metrics.fetchAttempts).toBe(2);
    });
  });

  describe('logFetchComplete', () => {
    it('should log successful fetch completion', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logFetchComplete(5, 1500, 0);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar INFO]'),
        expect.stringContaining('fetch:complete'),
        expect.objectContaining({
          eventCount: 5,
          fetchTimeMs: 1500,
          retryCount: 0,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should update metrics on successful fetch', () => {
      logger.logFetchComplete(10, 2000, 1);

      const metrics = logger.getMetrics();
      expect(metrics.fetchSuccesses).toBe(1);
      expect(metrics.totalEventsProcessed).toBe(10);
      expect(metrics.lastSuccessfulFetch).not.toBeNull();
      expect(metrics.avgFetchTimeMs).toBe(2000);
    });

    it('should calculate rolling average of fetch times', () => {
      logger.logFetchComplete(5, 1000, 0);
      logger.logFetchComplete(5, 2000, 0);
      logger.logFetchComplete(5, 3000, 0);

      const metrics = logger.getMetrics();
      expect(metrics.avgFetchTimeMs).toBe(2000); // (1000+2000+3000)/3
    });
  });

  describe('logFetchFailure', () => {
    it('should log fetch failure', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logFetchFailure('Connection timeout', 3);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar ERROR]'),
        expect.stringContaining('fetch:failed'),
        expect.objectContaining({
          error: 'Connection timeout',
          retryCount: 3,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should increment failure count', () => {
      logger.logFetchFailure('Error 1', 3);
      logger.logFetchFailure('Error 2', 3);

      const metrics = logger.getMetrics();
      expect(metrics.fetchFailures).toBe(2);
    });
  });

  describe('logRetry', () => {
    it('should log retry attempt at warn level', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Timeout');

      logger.logRetry(1, 1000, error);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar WARN]'),
        expect.stringContaining('fetch:retry'),
        expect.objectContaining({
          attempt: 1,
          delayMs: 1000,
          error: 'Timeout',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logCircuitBreaker', () => {
    it('should log circuit breaker open at warn level', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logCircuitBreaker('open', '5 consecutive failures');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar WARN]'),
        expect.stringContaining('circuit:state'),
        expect.objectContaining({
          state: 'open',
          reason: '5 consecutive failures',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should increment circuit breaker trips on open', () => {
      logger.logCircuitBreaker('open', 'reason 1');
      logger.logCircuitBreaker('open', 'reason 2');

      const metrics = logger.getMetrics();
      expect(metrics.circuitBreakerTrips).toBe(2);
    });

    it('should not increment trips on close', () => {
      logger.logCircuitBreaker('closed', 'recovered');

      const metrics = logger.getMetrics();
      expect(metrics.circuitBreakerTrips).toBe(0);
    });
  });

  describe('logTimezoneConversion', () => {
    it('should log timezone conversion at debug level', () => {
      // Create logger with debug level
      const debugLogger = new CalendarLogger(mockSettings, 'debug');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      debugLogger.logTimezoneConversion(
        'Eastern Standard Time',
        '2026-02-01T14:00:00-05:00',
        'event123',
        'medium'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar DEBUG]'),
        expect.stringContaining('timezone:convert'),
        expect.objectContaining({
          original: 'Eastern Standard Time',
          converted: '2026-02-01T14:00:00-05:00',
          eventUid: 'event123',
          confidence: 'medium',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logMeetingNoteCreated', () => {
    it('should log meeting note creation', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logMeetingNoteCreated('Team Standup', 'Archive/Meetings/Scrum/2026-02-01 - Team Standup.md');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar INFO]'),
        expect.stringContaining('note:created'),
        expect.objectContaining({
          eventTitle: 'Team Standup',
          notePath: 'Archive/Meetings/Scrum/2026-02-01 - Team Standup.md',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logMeetingNoteSkipped', () => {
    it('should log skipped meeting note at debug level', () => {
      const debugLogger = new CalendarLogger(mockSettings, 'debug');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      debugLogger.logMeetingNoteSkipped('Team Standup', 'already exists');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar DEBUG]'),
        expect.stringContaining('note:skipped'),
        expect.objectContaining({
          eventTitle: 'Team Standup',
          reason: 'already exists',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logError', () => {
    it('should log error with stack trace', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Test error');

      logger.logError('test:operation', error);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar ERROR]'),
        expect.stringContaining('test:operation'),
        expect.objectContaining({
          stack: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logMCPConnection', () => {
    it('should log successful connection at info level', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logMCPConnection('connected', 'ical');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar INFO]'),
        expect.stringContaining('mcp:connection'),
        expect.objectContaining({
          state: 'connected',
          serverName: 'ical',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log failed connection at error level', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logMCPConnection('failed', 'ical', 'Permission denied');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Calendar ERROR]'),
        expect.stringContaining('mcp:connection'),
        expect.objectContaining({
          state: 'failed',
          serverName: 'ical',
          error: 'Permission denied',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getMetrics', () => {
    it('should return a copy of metrics', () => {
      const metrics1 = logger.getMetrics();
      const metrics2 = logger.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });

    it('should have correct initial values', () => {
      const metrics = logger.getMetrics();

      expect(metrics.fetchAttempts).toBe(0);
      expect(metrics.fetchSuccesses).toBe(0);
      expect(metrics.fetchFailures).toBe(0);
      expect(metrics.totalEventsProcessed).toBe(0);
      expect(metrics.avgFetchTimeMs).toBe(0);
      expect(metrics.lastSuccessfulFetch).toBeNull();
      expect(metrics.circuitBreakerTrips).toBe(0);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to initial values', () => {
      // Generate some activity
      logger.logFetchStart('Personal', new Date());
      logger.logFetchComplete(10, 1500, 0);
      logger.logFetchFailure('Error', 3);
      logger.logCircuitBreaker('open', 'test');

      // Reset
      logger.resetMetrics();

      const metrics = logger.getMetrics();
      expect(metrics.fetchAttempts).toBe(0);
      expect(metrics.fetchSuccesses).toBe(0);
      expect(metrics.fetchFailures).toBe(0);
      expect(metrics.totalEventsProcessed).toBe(0);
      expect(metrics.avgFetchTimeMs).toBe(0);
      expect(metrics.lastSuccessfulFetch).toBeNull();
      expect(metrics.circuitBreakerTrips).toBe(0);
    });
  });

  describe('file writing', () => {
    it('should create log directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logFetchStart('Personal', new Date());

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs/calendar'),
        { recursive: true }
      );

      consoleSpy.mockRestore();
    });

    it('should append to dated log file', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logFetchStart('Personal', new Date());

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/calendar-\d{4}-\d{2}-\d{2}\.log$/),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    it('should handle file write errors gracefully', () => {
      (fs.appendFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      expect(() => {
        logger.logFetchStart('Personal', new Date());
      }).not.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to write to calendar log:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('log level filtering', () => {
    it('should not log debug when level is info', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.logMeetingNoteSkipped('Event', 'skipped'); // debug level

      // Debug should not be logged when minLevel is info
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log debug when level is debug', () => {
      const debugLogger = new CalendarLogger(mockSettings, 'debug');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      debugLogger.logMeetingNoteSkipped('Event', 'skipped');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log error when level is warn', () => {
      const warnLogger = new CalendarLogger(mockSettings, 'warn');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      warnLogger.logFetchFailure('Error', 3); // error level

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
