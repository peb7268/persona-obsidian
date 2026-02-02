import { CalendarJobHandler } from '../CalendarJobHandler';
import { CalendarFetchService, CalendarEvent, FetchResult } from '../CalendarFetchService';
import { JobQueueService, JobInfo } from '../JobQueueService';
import { CalendarLogger } from '../CalendarLogger';
import { PersonaSettings, DEFAULT_SETTINGS } from '../../types';
import { App, TFile, TFolder, Vault } from 'obsidian';

// Mock dependencies
jest.mock('../CalendarFetchService');
jest.mock('../JobQueueService');
jest.mock('../CalendarLogger');

describe('CalendarJobHandler', () => {
  let handler: CalendarJobHandler;
  let mockApp: jest.Mocked<App>;
  let mockVault: jest.Mocked<Vault>;
  let mockCalendarFetchService: jest.Mocked<CalendarFetchService>;
  let mockJobQueueService: jest.Mocked<JobQueueService>;
  let mockLogger: jest.Mocked<CalendarLogger>;
  let mockSettings: PersonaSettings;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSettings = {
      ...DEFAULT_SETTINGS,
      personaRoot: '/test/persona',
      business: 'TestBusiness',
      calendar: {
        autoFetchDaily: false,
        fetchOnStartup: false,
        meetingNoteFolder: 'Archive/Meetings',
      },
    };

    // Mock Vault
    mockVault = {
      getAbstractFileByPath: jest.fn(),
      create: jest.fn(),
      createFolder: jest.fn(),
    } as any;

    // Mock App
    mockApp = {
      vault: mockVault,
    } as any;

    // Mock services
    mockCalendarFetchService = new CalendarFetchService(
      {} as any,
      {} as any,
      {} as any,
      mockSettings
    ) as jest.Mocked<CalendarFetchService>;

    mockJobQueueService = new JobQueueService(mockSettings) as jest.Mocked<JobQueueService>;
    mockLogger = new CalendarLogger(mockSettings) as jest.Mocked<CalendarLogger>;

    handler = new CalendarJobHandler(
      mockApp,
      mockCalendarFetchService,
      mockJobQueueService,
      mockLogger,
      mockSettings
    );
  });

  describe('handleJob', () => {
    it('should fetch events and return success result', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: { date: '2026-02-01' },
      };

      const mockEvents: CalendarEvent[] = [
        {
          uid: 'event-1',
          title: 'Team Meeting',
          startDate: '2026-02-01T10:00:00-07:00',
          endDate: '2026-02-01T11:00:00-07:00',
        },
      ];

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: true,
        events: mockEvents,
      });

      // Mock that file doesn't exist (will be created)
      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.create.mockResolvedValue({} as TFile);

      const result = await handler.handleJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
      expect(result.notesCreated).toHaveLength(1);
      expect(mockVault.create).toHaveBeenCalled();
    });

    it('should return failure when fetch fails', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: { date: '2026-02-01' },
      };

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: false,
        events: [],
        error: 'Connection failed',
      });

      const result = await handler.handleJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
      expect(result.eventsProcessed).toBe(0);
    });

    it('should skip existing notes (idempotency)', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: { date: '2026-02-01' },
      };

      const mockEvents: CalendarEvent[] = [
        {
          uid: 'event-1',
          title: 'Team Meeting',
          startDate: '2026-02-01T10:00:00-07:00',
          endDate: '2026-02-01T11:00:00-07:00',
        },
      ];

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: true,
        events: mockEvents,
      });

      // Mock that file already exists - must be instanceof TFile
      const mockFile = Object.create(TFile.prototype);
      mockFile.path = 'existing.md';
      mockVault.getAbstractFileByPath.mockImplementation((path: string) => {
        if (path.endsWith('.md')) {
          return mockFile;
        }
        return null;
      });

      const result = await handler.handleJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
      expect(result.notesCreated).toHaveLength(0);
      expect(result.notesSkipped).toHaveLength(1);
      expect(mockVault.create).not.toHaveBeenCalled();
      expect(mockLogger.logMeetingNoteSkipped).toHaveBeenCalledWith('Team Meeting', 'already exists');
    });

    it('should use today date when no date in payload', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: {},
      };

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: true,
        events: [],
      });

      await handler.handleJob(mockJob);

      expect(mockCalendarFetchService.fetchEventsForDate).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Object)
      );
    });
  });

  describe('event categorization', () => {
    const testCases = [
      { title: '1:1 with John', expected: '1to1' },
      { title: 'John Smith 1-on-1', expected: '1to1' },
      { title: 'One on One with Jane', expected: '1to1' },
      { title: 'Daily Standup', expected: 'Scrum' },
      { title: 'Sprint Planning', expected: 'Scrum' },
      { title: 'Retrospective', expected: 'Scrum' },
      { title: 'Grooming Session', expected: 'Scrum' },
      { title: 'Leadership Team Meeting', expected: 'Leadership' },
      { title: 'Exec Sync', expected: 'Leadership' },
      { title: 'All-Hands Meeting', expected: 'Leadership' },
      { title: 'Town Hall', expected: 'Leadership' },
      { title: 'Product Review', expected: 'PandE' },
      { title: 'Engineering Sync', expected: 'PandE' },
      { title: 'Architecture Discussion', expected: 'PandE' },
      { title: 'Random Meeting', expected: 'Ad-Hoc' },
      { title: 'Customer Call', expected: 'Ad-Hoc' },
    ];

    testCases.forEach(({ title, expected }) => {
      it(`should categorize "${title}" as ${expected}`, async () => {
        const mockJob: JobInfo = {
          id: 'job-123',
          shortId: 'abc123',
          type: 'calendar_fetch',
          status: 'running',
          payload: { date: '2026-02-01' },
        };

        mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
          success: true,
          events: [{
            uid: 'event-1',
            title,
            startDate: '2026-02-01T10:00:00-07:00',
            endDate: '2026-02-01T11:00:00-07:00',
          }],
        });

        mockVault.getAbstractFileByPath.mockReturnValue(null);
        mockVault.create.mockResolvedValue({} as TFile);

        await handler.handleJob(mockJob);

        expect(mockVault.create).toHaveBeenCalledWith(
          expect.stringContaining(`Archive/Meetings/${expected}/`),
          expect.any(String)
        );
      });
    });
  });

  describe('note content generation', () => {
    it('should include frontmatter with correct fields', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: { date: '2026-02-01' },
      };

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: true,
        events: [{
          uid: 'event-1',
          title: 'Team Meeting',
          startDate: '2026-02-01T10:00:00-07:00',
          endDate: '2026-02-01T11:00:00-07:00',
          location: 'Room 101',
          attendees: ['Alice', 'Bob'],
          organizer: 'alice@example.com',
        }],
      });

      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.create.mockResolvedValue({} as TFile);

      await handler.handleJob(mockJob);

      const createCall = mockVault.create.mock.calls[0];
      const content = createCall[1];

      expect(content).toContain('---');
      expect(content).toContain('date: 2026-02-01');
      expect(content).toContain('searchableSubject: Team Meeting');
      expect(content).toContain('type: meeting');
      expect(content).toContain('organizer: alice@example.com');
      expect(content).toContain('People:: [[Alice]], [[Bob]]');
      expect(content).toContain('Location:: Room 101');
      expect(content).toContain('## Notes');
      expect(content).toContain('## Action Items');
    });
  });

  describe('folder creation', () => {
    it('should create folder hierarchy if needed', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: { date: '2026-02-01' },
      };

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: true,
        events: [{
          uid: 'event-1',
          title: 'Team Meeting',
          startDate: '2026-02-01T10:00:00-07:00',
          endDate: '2026-02-01T11:00:00-07:00',
        }],
      });

      // No folders or files exist
      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.create.mockResolvedValue({} as TFile);
      mockVault.createFolder.mockResolvedValue({} as TFolder);

      await handler.handleJob(mockJob);

      // Should create folder hierarchy
      expect(mockVault.createFolder).toHaveBeenCalled();
    });

    it('should not create folder if it exists', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: { date: '2026-02-01' },
      };

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: true,
        events: [{
          uid: 'event-1',
          title: 'Team Meeting',
          startDate: '2026-02-01T10:00:00-07:00',
          endDate: '2026-02-01T11:00:00-07:00',
        }],
      });

      // Folder exists, file doesn't
      mockVault.getAbstractFileByPath.mockImplementation((path: string) => {
        if (path.endsWith('.md')) {
          return null; // File doesn't exist
        }
        return { path } as TFolder; // Folder exists
      });
      mockVault.create.mockResolvedValue({} as TFile);

      await handler.handleJob(mockJob);

      expect(mockVault.createFolder).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle file creation errors gracefully', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: { date: '2026-02-01' },
      };

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: true,
        events: [{
          uid: 'event-1',
          title: 'Team Meeting',
          startDate: '2026-02-01T10:00:00-07:00',
          endDate: '2026-02-01T11:00:00-07:00',
        }],
      });

      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.create.mockRejectedValue(new Error('Disk full'));

      const result = await handler.handleJob(mockJob);

      expect(result.success).toBe(true); // Job still succeeds
      expect(result.eventsProcessed).toBe(1);
      expect(result.notesCreated).toHaveLength(0);
      expect(result.notesSkipped).toHaveLength(1);
      expect(mockLogger.logError).toHaveBeenCalled();
    });
  });

  describe('filename sanitization', () => {
    it('should sanitize special characters in filenames', async () => {
      const mockJob: JobInfo = {
        id: 'job-123',
        shortId: 'abc123',
        type: 'calendar_fetch',
        status: 'running',
        payload: { date: '2026-02-01' },
      };

      mockCalendarFetchService.fetchEventsForDate.mockResolvedValue({
        success: true,
        events: [{
          uid: 'event-1',
          title: 'Q1/Q2 Review: Budget <$1M>',
          startDate: '2026-02-01T10:00:00-07:00',
          endDate: '2026-02-01T11:00:00-07:00',
        }],
      });

      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.create.mockResolvedValue({} as TFile);

      await handler.handleJob(mockJob);

      const createCall = mockVault.create.mock.calls[0];
      const filePath = createCall[0];
      const filename = filePath.split('/').pop();

      // Filename should not contain special characters (exclude path separators)
      expect(filename).not.toMatch(/[<>:"\\|?*]/);
      expect(filename).toContain('Q1Q2 Review Budget $1M');
    });
  });
});
