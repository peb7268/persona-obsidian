import { CalendarFetchService, CalendarEvent, FetchResult } from '../CalendarFetchService';
import { MCPClientService, MCPConnectionState } from '../MCPClientService';
import { CalendarLogger } from '../CalendarLogger';
import { TimezoneResolver } from '../TimezoneResolver';
import { PersonaSettings, DEFAULT_SETTINGS } from '../../types';

// Mock dependencies
jest.mock('../MCPClientService');
jest.mock('../CalendarLogger');
jest.mock('../TimezoneResolver');

describe('CalendarFetchService', () => {
  let service: CalendarFetchService;
  let mockMCPClient: jest.Mocked<MCPClientService>;
  let mockLogger: jest.Mocked<CalendarLogger>;
  let mockTimezoneResolver: jest.Mocked<TimezoneResolver>;
  let mockSettings: PersonaSettings;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSettings = {
      ...DEFAULT_SETTINGS,
      personaRoot: '/test/persona',
      business: 'TestBusiness',
      mcp: {
        ical: {
          enabled: true,
          command: 'uvx',
          args: ['mcp-ical'],
          enabledCalendars: [],
        },
      },
    };

    mockMCPClient = new MCPClientService() as jest.Mocked<MCPClientService>;
    mockLogger = new CalendarLogger(mockSettings) as jest.Mocked<CalendarLogger>;
    mockTimezoneResolver = new TimezoneResolver() as jest.Mocked<TimezoneResolver>;

    // Setup default mocks
    mockMCPClient.isConnected.mockReturnValue(true);
    mockMCPClient.connect.mockResolvedValue();
    mockMCPClient.callTool.mockResolvedValue({
      success: true,
      result: [],
    });

    mockTimezoneResolver.resolve.mockReturnValue({
      isoString: '2026-02-01T14:00:00-07:00',
      offsetMinutes: -420,
      originalSpec: 'America/Denver',
      wasConverted: false,
      isFloatingTime: false,
      confidence: 'high',
    });

    service = new CalendarFetchService(
      mockMCPClient,
      mockLogger,
      mockTimezoneResolver,
      mockSettings
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    service.resetCircuitBreaker();
  });

  describe('fetchEventsForDate', () => {
    it('should fetch events successfully', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: true,
        result: [
          { title: 'Meeting 1', start: '2026-02-01T10:00:00', end: '2026-02-01T11:00:00' },
          { title: 'Meeting 2', start: '2026-02-01T14:00:00', end: '2026-02-01T15:00:00' },
        ],
      });

      const resultPromise = service.fetchEventsForDate(new Date('2026-02-01'));
      jest.runAllTimers();
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(2);
      expect(result.error).toBeUndefined();
    });

    it('should connect if not already connected', async () => {
      mockMCPClient.isConnected.mockReturnValue(false);
      mockMCPClient.callTool.mockResolvedValue({ success: true, result: [] });

      const resultPromise = service.fetchEventsForDate(new Date('2026-02-01'));
      jest.runAllTimers();
      await resultPromise;

      expect(mockMCPClient.connect).toHaveBeenCalled();
    });

    it('should log fetch start and complete', async () => {
      mockMCPClient.callTool.mockResolvedValue({ success: true, result: [] });

      const resultPromise = service.fetchEventsForDate(new Date('2026-02-01'));
      jest.runAllTimers();
      await resultPromise;

      expect(mockLogger.logFetchStart).toHaveBeenCalled();
      expect(mockLogger.logFetchComplete).toHaveBeenCalled();
    });

    it('should return circuit open error when circuit is open', async () => {
      // Use real timers but minimal retry delays for this test
      jest.useRealTimers();

      // Trip the circuit by forcing multiple failures
      mockMCPClient.callTool.mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      // Fail 5 times to trip circuit (use minimal delay options)
      for (let i = 0; i < 5; i++) {
        await service.fetchEventsForDate(new Date('2026-02-01'), {
          maxRetries: 1,
          baseDelayMs: 1,
        });
      }

      // Now circuit should be open
      const result = await service.fetchEventsForDate(new Date('2026-02-01'));

      expect(result.success).toBe(false);
      expect(result.circuitOpen).toBe(true);
      expect(result.error).toContain('circuit breaker');
    });
  });

  describe('fetchTodaysEvents', () => {
    it('should call fetchEventsForDate with today\'s date', async () => {
      mockMCPClient.callTool.mockResolvedValue({ success: true, result: [] });
      const spy = jest.spyOn(service, 'fetchEventsForDate');

      const resultPromise = service.fetchTodaysEvents();
      jest.runAllTimers();
      await resultPromise;

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it('should retry on retryable errors', async () => {
      let callCount = 0;
      mockMCPClient.callTool.mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          return { success: false, error: 'Connection timeout' };
        }
        return { success: true, result: [] };
      });

      const result = await service.fetchEventsForDate(new Date('2026-02-01'), {
        maxRetries: 3,
        baseDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
      expect(mockLogger.logRetry).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: false,
        error: 'Invalid date format',
      });

      const result = await service.fetchEventsForDate(new Date('2026-02-01'), {
        maxRetries: 3,
        baseDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(mockMCPClient.callTool).toHaveBeenCalledTimes(1);
    });

    it('should log failure after exhausting retries', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      const result = await service.fetchEventsForDate(new Date('2026-02-01'), {
        maxRetries: 3,
        baseDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(mockLogger.logFetchFailure).toHaveBeenCalled();
    });
  });

  describe('circuit breaker', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it('should trip after consecutive failures', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      // 5 failures to trip circuit
      for (let i = 0; i < 5; i++) {
        await service.fetchEventsForDate(new Date('2026-02-01'), {
          maxRetries: 1,
          baseDelayMs: 10,
        });
      }

      expect(service.isCircuitOpen()).toBe(true);
      expect(mockLogger.logCircuitBreaker).toHaveBeenCalledWith('open', expect.any(String));
    });

    it('should reset on successful fetch', async () => {
      mockMCPClient.callTool
        .mockResolvedValueOnce({ success: false, error: 'timeout' })
        .mockResolvedValueOnce({ success: false, error: 'timeout' })
        .mockResolvedValueOnce({ success: true, result: [] });

      await service.fetchEventsForDate(new Date('2026-02-01'), { maxRetries: 1, baseDelayMs: 10 });
      await service.fetchEventsForDate(new Date('2026-02-01'), { maxRetries: 1, baseDelayMs: 10 });
      await service.fetchEventsForDate(new Date('2026-02-01'), { maxRetries: 1, baseDelayMs: 10 });

      // Circuit should not be open after success
      expect(service.isCircuitOpen()).toBe(false);
    });

    it('should allow half-open state after cooldown', async () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      mockMCPClient.callTool.mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      // Trip circuit (using real time behavior simulated)
      for (let i = 0; i < 5; i++) {
        const promise = service.fetchEventsForDate(new Date('2026-02-01'), {
          maxRetries: 1,
          baseDelayMs: 1,
        });
        jest.runAllTimers();
        await promise;
      }

      expect(service.isCircuitOpen()).toBe(true);

      // Advance past cooldown (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // Circuit should be half-open now
      expect(service.isCircuitOpen()).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('event transformation', () => {
    it('should transform events with timezone resolution', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: true,
        result: [
          {
            uid: 'event1',
            title: 'Team Meeting',
            start: '2026-02-01T10:00:00',
            end: '2026-02-01T11:00:00',
            timezone: 'America/Denver',
            location: 'Room 101',
            attendees: ['Alice', 'Bob'],
          },
        ],
      });

      const result = await service.fetchEventsForDate(new Date('2026-02-01'));

      expect(result.success).toBe(true);
      expect(result.events[0]).toMatchObject({
        uid: 'event1',
        title: 'Team Meeting',
        location: 'Room 101',
      });
      expect(mockTimezoneResolver.resolve).toHaveBeenCalled();
    });

    it('should handle different event response formats', async () => {
      // Test events nested in "events" property
      mockMCPClient.callTool.mockResolvedValue({
        success: true,
        result: {
          events: [
            { title: 'Meeting', start: '2026-02-01T10:00:00', end: '2026-02-01T11:00:00' },
          ],
        },
      });

      const result = await service.fetchEventsForDate(new Date('2026-02-01'));

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
    });

    it('should handle MCP content format', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: true,
        result: {
          content: JSON.stringify([
            { title: 'Meeting', start: '2026-02-01T10:00:00', end: '2026-02-01T11:00:00' },
          ]),
        },
      });

      const result = await service.fetchEventsForDate(new Date('2026-02-01'));

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
    });

    it('should skip events without title', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: true,
        result: [
          { start: '2026-02-01T10:00:00', end: '2026-02-01T11:00:00' }, // No title
          { title: 'Valid', start: '2026-02-01T14:00:00', end: '2026-02-01T15:00:00' },
        ],
      });

      const result = await service.fetchEventsForDate(new Date('2026-02-01'));

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Valid');
    });

    it('should parse comma-separated attendees', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: true,
        result: [
          {
            title: 'Meeting',
            start: '2026-02-01T10:00:00',
            end: '2026-02-01T11:00:00',
            attendees: 'Alice, Bob, Charlie',
          },
        ],
      });

      const result = await service.fetchEventsForDate(new Date('2026-02-01'));

      expect(result.events[0].attendees).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('connection errors', () => {
    it('should handle connection failure', async () => {
      mockMCPClient.isConnected.mockReturnValue(false);
      mockMCPClient.connect.mockRejectedValue(new Error('Permission denied'));

      const result = await service.fetchEventsForDate(new Date('2026-02-01'));

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
      expect(mockLogger.logMCPConnection).toHaveBeenCalledWith('failed', 'ical', expect.any(String));
    });
  });

  describe('getLastError', () => {
    it('should return null initially', () => {
      expect(service.getLastError()).toBeNull();
    });

    it('should return last error after failure', async () => {
      mockMCPClient.callTool.mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      await service.fetchEventsForDate(new Date('2026-02-01'), {
        maxRetries: 1,
        baseDelayMs: 10,
      });

      expect(service.getLastError()?.message).toContain('Test error');
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker state', async () => {
      jest.useRealTimers();

      mockMCPClient.callTool.mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      // Trip circuit
      for (let i = 0; i < 5; i++) {
        await service.fetchEventsForDate(new Date('2026-02-01'), {
          maxRetries: 1,
          baseDelayMs: 10,
        });
      }

      expect(service.isCircuitOpen()).toBe(true);

      service.resetCircuitBreaker();

      expect(service.isCircuitOpen()).toBe(false);
      expect(service.getLastError()).toBeNull();
    });
  });
});
