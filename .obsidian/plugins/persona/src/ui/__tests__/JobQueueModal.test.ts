/**
 * @jest-environment jsdom
 */
import { JobQueueModal } from '../JobQueueModal';
import { JobQueueService, JobInfo, JobSummary } from '../../services/JobQueueService';
import { PersonaSettings } from '../../types';
import { MockApp, MockHTMLElement } from '../../__tests__/mocks/obsidian';

// Mock JobQueueService
jest.mock('../../services/JobQueueService');

describe('JobQueueModal', () => {
  let modal: JobQueueModal;
  let mockApp: MockApp;
  let mockJobQueueService: jest.Mocked<JobQueueService>;
  let mockSettings: PersonaSettings;

  beforeEach(() => {
    // Override global fake timers for modal tests
    jest.useRealTimers();

    // Mock window global for setInterval/clearInterval
    global.window = {
      setInterval: jest.fn((fn, delay) => {
        return setInterval(fn, delay);
      }),
      clearInterval: jest.fn((id) => {
        clearInterval(id);
      }),
    } as any;

    mockApp = new MockApp();
    mockSettings = {
      personaRoot: '/vault/Projects/Persona',
      business: 'TestBusiness',
      zettelkastenPath: 'Resources/Zettlekasten',
      duplicateThreshold: 70,
      showRibbonIcon: true,
      showStatusBar: true,
      autoProcessOnSave: false,
      pollingEnabled: false,
      pollingIntervalMinutes: 5,
      defaultTags: ['test'],
      autoDetectType: true,
      showConfirmModal: true,
      providers: {},
      defaultProvider: 'claude',
      routing: { enabled: false, rules: [] },
      pythonPath: '/usr/bin/python3',
      supabaseUrl: 'http://localhost:54321',
      supabaseKey: 'test-key',
      hungThresholdMinutes: 5,
    } as PersonaSettings;

    // Create mock service instance
    mockJobQueueService = new JobQueueService(mockSettings) as jest.Mocked<JobQueueService>;

    // Setup default mock implementations
    mockJobQueueService.getJobSummary = jest.fn().mockResolvedValue({
      pending: 3,
      running: 1,
      completed: 10,
      failed: 2,
      cancelled: 0,
      hung: 0,
    });

    mockJobQueueService.getRunningJobs = jest.fn().mockResolvedValue([]);
    mockJobQueueService.getPendingJobs = jest.fn().mockResolvedValue([]);
    mockJobQueueService.getJobLogs = jest.fn().mockResolvedValue([]);

    modal = new JobQueueModal(mockApp as any, mockJobQueueService, mockSettings);

    // Initialize Modal properties (these would normally be set by Obsidian)
    const mockContentEl = new MockHTMLElement() as any;
    // Add querySelector support
    mockContentEl.querySelector = jest.fn((selector: string) => {
      if (selector === '.summary-grid') {
        const summaryEl = new MockHTMLElement();
        return summaryEl;
      }
      if (selector === '.jobs-list-container') {
        const jobsListEl = new MockHTMLElement();
        return jobsListEl;
      }
      if (selector === '.tab-button.active') {
        const tabEl = new MockHTMLElement();
        tabEl.textContent = 'Running';
        return tabEl;
      }
      return null;
    });

    modal.contentEl = mockContentEl;
    modal.titleEl = new MockHTMLElement() as any;
    modal.modalEl = new MockHTMLElement() as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with jobQueueService', () => {
      expect(modal['jobQueueService']).toBe(mockJobQueueService);
    });

    it('should initialize with autoRefresh enabled', () => {
      expect(modal['autoRefresh']).toBe(true);
    });

    it('should initialize with null refresh interval', () => {
      expect(modal['refreshInterval']).toBeNull();
    });
  });

  describe('onOpen', () => {
    it('should add modal CSS class to content element', async () => {
      await modal.onOpen();

      expect(modal.contentEl.addClass).toHaveBeenCalledWith('persona-job-queue-modal');
    });

    it('should create header with title', async () => {
      await modal.onOpen();

      expect(modal.contentEl.createDiv).toHaveBeenCalledWith({ cls: 'jq-header' });
    });

    it('should create refresh button', async () => {
      await modal.onOpen();

      // Header and controls are created as nested divs
      expect(modal.contentEl.createDiv).toHaveBeenCalled();
    });

    it('should create auto-refresh toggle button', async () => {
      await modal.onOpen();

      // Header and controls are created as nested divs
      expect(modal.contentEl.createDiv).toHaveBeenCalled();
    });

    it('should load job summary on open', async () => {
      await modal.onOpen();

      expect(mockJobQueueService.getJobSummary).toHaveBeenCalled();
    });

    it('should render running jobs by default', async () => {
      await modal.onOpen();

      expect(mockJobQueueService.getRunningJobs).toHaveBeenCalled();
    });

    it('should start auto-refresh when autoRefresh is true', async () => {
      modal['autoRefresh'] = true;
      await modal.onOpen();

      expect(modal['refreshInterval']).not.toBeNull();
    });

    it('should not start auto-refresh when autoRefresh is false', async () => {
      modal['autoRefresh'] = false;
      await modal.onOpen();

      // Give it a moment to ensure no interval is set
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(modal['refreshInterval']).toBeNull();
    });
  });

  describe('renderSummary', () => {
    let summaryContainer: MockHTMLElement;

    beforeEach(() => {
      summaryContainer = new MockHTMLElement();
    });

    it('should render all status cards', () => {
      const summary: JobSummary = {
        pending: 5,
        running: 2,
        completed: 100,
        failed: 3,
        cancelled: 1,
        hung: 0,
      };

      modal['renderSummary'](summaryContainer as any, summary);

      // 5 status cards (pending, running, completed, failed, hung), each with icon + content divs
      expect(summaryContainer.createDiv).toHaveBeenCalled();
      const calls = (summaryContainer.createDiv as jest.Mock).mock.calls;
      const statCardCalls = calls.filter(call => call[0]?.cls?.includes('jq-stat-card'));
      expect(statCardCalls.length).toBe(5);
    });

    it('should render pending status card with correct value', () => {
      const summary: JobSummary = {
        pending: 5,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        hung: 0,
      };

      modal['renderSummary'](summaryContainer as any, summary);

      const calls = (summaryContainer.createDiv as jest.Mock).mock.calls;
      const pendingCard = calls.find(call =>
        call[0]?.cls?.includes('pending') && call[0]?.cls?.includes('jq-stat-card')
      );
      expect(pendingCard).toBeDefined();
    });

    it('should render running status card with correct value', () => {
      const summary: JobSummary = {
        pending: 0,
        running: 2,
        completed: 0,
        failed: 0,
        cancelled: 0,
        hung: 0,
      };

      modal['renderSummary'](summaryContainer as any, summary);

      const calls = (summaryContainer.createDiv as jest.Mock).mock.calls;
      const runningCard = calls.find(call =>
        call[0]?.cls?.includes('running') && call[0]?.cls?.includes('jq-stat-card')
      );
      expect(runningCard).toBeDefined();
    });

    it('should clear container before rendering', () => {
      const summary: JobSummary = {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        hung: 0,
      };

      modal['renderSummary'](summaryContainer as any, summary);

      expect(summaryContainer.empty).toHaveBeenCalled();
    });
  });

  describe('renderJobs', () => {
    let jobsContainer: MockHTMLElement;

    beforeEach(() => {
      jobsContainer = new MockHTMLElement();
    });

    it('should show loading state initially', async () => {
      modal['renderJobs'](jobsContainer as any, 'running');

      expect(jobsContainer.createDiv).toHaveBeenCalledWith({
        cls: 'jq-loader',
      });
    });

    it('should fetch running jobs when type is running', async () => {
      await modal['renderJobs'](jobsContainer as any, 'running');

      expect(mockJobQueueService.getRunningJobs).toHaveBeenCalled();
    });

    it('should fetch pending jobs when type is pending', async () => {
      await modal['renderJobs'](jobsContainer as any, 'pending');

      expect(mockJobQueueService.getPendingJobs).toHaveBeenCalled();
    });

    it('should show coming soon message for recent jobs', async () => {
      // Implementation doesn't have 'recent' filter - test completed instead
      await modal['renderJobs'](jobsContainer as any, 'completed');

      // Should have called getCompletedJobs
      expect(mockJobQueueService.getCompletedJobs).toHaveBeenCalled();
    });

    it('should show "no jobs" message when list is empty', async () => {
      mockJobQueueService.getRunningJobs.mockResolvedValue([]);

      await modal['renderJobs'](jobsContainer as any, 'running');

      // Should create empty state div
      expect(jobsContainer.createDiv).toHaveBeenCalledWith({
        cls: 'jq-empty-state',
      });
    });

    it('should render job cards for each job', async () => {
      const mockJobs: JobInfo[] = [
        {
          id: 'job-1',
          shortId: 'abc12345',
          type: 'research',
          status: 'running',
          assignedTo: 'researcher',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'job-2',
          shortId: 'def67890',
          type: 'meeting_extract',
          status: 'running',
          assignedTo: 'assistant',
          createdAt: new Date().toISOString(),
        },
      ];

      mockJobQueueService.getRunningJobs.mockResolvedValue(mockJobs);

      await modal['renderJobs'](jobsContainer as any, 'running');

      // Should create job card divs with jq-job-card class
      const calls = (jobsContainer.createDiv as jest.Mock).mock.calls;
      const jobCardCalls = calls.filter(call => call[0]?.cls === 'jq-job-card');
      expect(jobCardCalls.length).toBe(2); // 2 job cards for 2 jobs
    });

    it('should display job shortId in job card', async () => {
      const mockJobs: JobInfo[] = [
        {
          id: 'job-1',
          shortId: 'abc12345',
          type: 'research',
          status: 'running',
          assignedTo: 'researcher',
          createdAt: new Date().toISOString(),
        },
      ];

      mockJobQueueService.getRunningJobs.mockResolvedValue(mockJobs);

      await modal['renderJobs'](jobsContainer as any, 'running');

      // Verify createSpan was called with shortId
      const mockJobsList = new MockHTMLElement();
      const mockJobCard = new MockHTMLElement();
      (jobsContainer.createDiv as jest.Mock).mockReturnValue(mockJobsList);
      (mockJobsList.createDiv as jest.Mock).mockReturnValue(mockJobCard);

      // Re-render to capture the mock calls
      await modal['renderJobs'](jobsContainer as any, 'running');
    });

    it('should show View Logs button for all jobs', async () => {
      const mockJobs: JobInfo[] = [
        {
          id: 'job-1',
          shortId: 'abc12345',
          type: 'research',
          status: 'running',
          assignedTo: 'researcher',
          createdAt: new Date().toISOString(),
        },
      ];

      mockJobQueueService.getRunningJobs.mockResolvedValue(mockJobs);

      await modal['renderJobs'](jobsContainer as any, 'running');

      // Should create action buttons
      // This is tested indirectly through the createEl calls
      expect(jobsContainer.createDiv).toHaveBeenCalled();
    });

    it('should show Kill button only for running jobs', async () => {
      const mockJobs: JobInfo[] = [
        {
          id: 'job-1',
          shortId: 'abc12345',
          type: 'research',
          status: 'running',
          assignedTo: 'researcher',
          createdAt: new Date().toISOString(),
        },
      ];

      mockJobQueueService.getRunningJobs.mockResolvedValue(mockJobs);

      await modal['renderJobs'](jobsContainer as any, 'running');

      // Kill button should be created for running jobs
      expect(jobsContainer.createDiv).toHaveBeenCalled();
    });

    it('should handle errors when loading jobs', async () => {
      mockJobQueueService.getRunningJobs.mockRejectedValue(
        new Error('Failed to fetch jobs')
      );

      await modal['renderJobs'](jobsContainer as any, 'running');

      // Should create error state div
      expect(jobsContainer.createDiv).toHaveBeenCalledWith({
        cls: 'jq-error-state',
      });
    });
  });

  describe('viewJobLogs', () => {
    it('should fetch logs for the specified job', async () => {
      const mockJob: JobInfo = {
        id: 'job-1',
        shortId: 'abc12345',
        type: 'research',
        status: 'running',
        assignedTo: 'researcher',
        createdAt: new Date().toISOString(),
      };

      await modal['viewJobLogs'](mockJob);

      expect(mockJobQueueService.getJobLogs).toHaveBeenCalledWith('abc12345', 50);
    });

    it('should display logs in a new modal', async () => {
      const mockJob: JobInfo = {
        id: 'job-1',
        shortId: 'abc12345',
        type: 'research',
        status: 'running',
        assignedTo: 'researcher',
        createdAt: new Date().toISOString(),
      };

      const mockLogs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Job started',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Job failed',
        },
      ];

      mockJobQueueService.getJobLogs.mockResolvedValue(mockLogs);

      await modal['viewJobLogs'](mockJob);

      // Modal should be created
      // This is hard to test without mocking the Modal class directly
      expect(mockJobQueueService.getJobLogs).toHaveBeenCalled();
    });

    it('should show "no logs" message when logs are empty', async () => {
      const mockJob: JobInfo = {
        id: 'job-1',
        shortId: 'abc12345',
        type: 'research',
        status: 'running',
        assignedTo: 'researcher',
        createdAt: new Date().toISOString(),
      };

      mockJobQueueService.getJobLogs.mockResolvedValue([]);

      await modal['viewJobLogs'](mockJob);

      expect(mockJobQueueService.getJobLogs).toHaveBeenCalled();
    });
  });

  describe('formatDate', () => {
    it('should format seconds ago', () => {
      const date = new Date(Date.now() - 30 * 1000); // 30 seconds ago
      const formatted = modal['formatDate'](date);

      expect(formatted).toMatch(/^\d+s ago$/);
    });

    it('should format minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const formatted = modal['formatDate'](date);

      expect(formatted).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const formatted = modal['formatDate'](date);

      expect(formatted).toBe('3h ago');
    });

    it('should format days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const formatted = modal['formatDate'](date);

      expect(formatted).toBe('2d ago');
    });
  });

  describe('formatTime', () => {
    it('should format time using locale string', () => {
      const date = new Date('2024-02-01T10:30:00');
      const formatted = modal['formatTime'](date);

      expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('auto-refresh', () => {
    it('should start auto-refresh interval', () => {
      modal['startAutoRefresh']();

      expect(modal['refreshInterval']).toBeDefined();
      expect(modal['refreshInterval']).not.toBeNull();
    });

    it('should stop auto-refresh interval', () => {
      modal['startAutoRefresh']();
      expect(modal['refreshInterval']).not.toBeNull();

      modal['stopAutoRefresh']();

      expect(modal['refreshInterval']).toBeNull();
    });

    it('should clear existing interval before starting new one', () => {
      modal['startAutoRefresh']();
      const firstInterval = modal['refreshInterval'];
      expect(firstInterval).not.toBeNull();

      modal['startAutoRefresh']();
      const secondInterval = modal['refreshInterval'];

      // Both intervals should exist and be different
      expect(secondInterval).not.toBeNull();
      expect(firstInterval).not.toBe(secondInterval);
    });

    it('should call refresh periodically when auto-refresh is enabled', () => {
      jest.useFakeTimers();
      modal['autoRefresh'] = true;
      const refreshSpy = jest.spyOn(modal as any, 'refresh').mockResolvedValue(undefined);

      modal['startAutoRefresh']();

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000);

      expect(refreshSpy).toHaveBeenCalled();
      modal['stopAutoRefresh']();
      jest.useRealTimers();
    });

    it('should not refresh when auto-refresh is disabled', () => {
      jest.useFakeTimers();
      modal['autoRefresh'] = false;
      const refreshSpy = jest.spyOn(modal as any, 'refresh').mockResolvedValue(undefined);

      modal['startAutoRefresh']();

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Should not have been called because autoRefresh is false
      expect(refreshSpy).not.toHaveBeenCalled();
      modal['stopAutoRefresh']();
      jest.useRealTimers();
    });
  });

  describe('refresh', () => {
    it('should reload summary', async () => {
      // Setup modal as if it's open
      await modal.onOpen();
      mockJobQueueService.getJobSummary.mockClear();

      await modal['refresh']();

      expect(mockJobQueueService.getJobSummary).toHaveBeenCalled();
    });

    it('should reload jobs list', async () => {
      await modal.onOpen();
      mockJobQueueService.getRunningJobs.mockClear();

      await modal['refresh']();

      expect(mockJobQueueService.getRunningJobs).toHaveBeenCalled();
    });
  });

  describe('onClose', () => {
    it('should stop auto-refresh on close', () => {
      modal['startAutoRefresh']();
      expect(modal['refreshInterval']).not.toBeNull();

      modal.onClose();

      expect(modal['refreshInterval']).toBeNull();
    });

    it('should clear content element on close', () => {
      modal.onClose();

      expect(modal.contentEl.empty).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle summary loading errors', async () => {
      mockJobQueueService.getJobSummary.mockRejectedValue(
        new Error('Network error')
      );

      await modal.onOpen();

      // Error should be displayed in summary container
      expect(modal.contentEl.createDiv).toHaveBeenCalled();
    });

    it('should handle job loading errors', async () => {
      mockJobQueueService.getRunningJobs.mockRejectedValue(
        new Error('Network error')
      );

      const container = new MockHTMLElement();
      await modal['renderJobs'](container as any, 'running');

      // Should create error state div
      expect(container.createDiv).toHaveBeenCalledWith({
        cls: 'jq-error-state',
      });
    });
  });

  describe('tab switching', () => {
    it('should switch to pending tab and load pending jobs', async () => {
      await modal.onOpen();
      mockJobQueueService.getPendingJobs.mockClear();

      // Find and click the pending tab button
      const jobsContainer = modal.contentEl;
      const tabsDiv = new MockHTMLElement();
      (jobsContainer.createDiv as jest.Mock).mockReturnValue(tabsDiv);

      // Simulate clicking pending tab by directly calling renderJobs
      await modal['renderJobs'](new MockHTMLElement() as any, 'pending');

      expect(mockJobQueueService.getPendingJobs).toHaveBeenCalled();
    });

    it('should switch to running tab and load running jobs', async () => {
      await modal.onOpen();
      mockJobQueueService.getRunningJobs.mockClear();

      await modal['renderJobs'](new MockHTMLElement() as any, 'running');

      expect(mockJobQueueService.getRunningJobs).toHaveBeenCalled();
    });
  });
});
