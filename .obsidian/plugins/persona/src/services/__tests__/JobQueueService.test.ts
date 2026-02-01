import { JobQueueService } from '../JobQueueService';
import { PersonaSettings } from '../../types';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

describe('JobQueueService', () => {
  let service: JobQueueService;
  let mockSettings: PersonaSettings;

  beforeEach(() => {
    // Override global fake timers for these tests
    jest.useRealTimers();

    mockSettings = {
      personaRoot: '/test/persona',
      business: 'TestBusiness',
      showRibbonIcon: true,
      showStatusBar: true,
      autoProcessOnSave: true,
      pollingEnabled: false,
      pollingIntervalMinutes: 5,
      zettelkastenPath: 'Resources/Zettlekasten',
      duplicateThreshold: 80,
      defaultTags: ['test'],
    };

    service = new JobQueueService(mockSettings);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to create a mock process that emits events
   */
  function createMockProcess(
    stdoutData?: string,
    stderrData?: string,
    exitCode: number = 0
  ): any {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    // Emit events asynchronously using setImmediate
    setImmediate(() => {
      if (stdoutData) {
        mockProcess.stdout.emit('data', stdoutData);
      }
      if (stderrData) {
        mockProcess.stderr.emit('data', stderrData);
      }
      mockProcess.emit('close', exitCode);
    });

    return mockProcess;
  }

  /**
   * Helper to setup spawn mock with response
   */
  function setupSpawnMock(response: any, exitCode: number = 0) {
    const mockProcess = createMockProcess(JSON.stringify(response), '', exitCode);
    (spawn as jest.Mock).mockReturnValue(mockProcess);
    return mockProcess;
  }

  describe('createJob', () => {
    it('should create a job and return job info', async () => {
      const jobData = {
        id: 'test-uuid',
        shortId: 'abc12345',
        type: 'research',
        status: 'pending',
        assignedTo: 'researcher',
      };

      setupSpawnMock(jobData);

      const result = await service.createJob(
        'research',
        { question: 'What is AI?' },
        'researcher'
      );

      expect(result.shortId).toBe('abc12345');
      expect(result.type).toBe('research');
      expect(result.status).toBe('pending');
      expect(result.assignedTo).toBe('researcher');
    });

    it('should call bridge script with correct arguments', async () => {
      setupSpawnMock({ shortId: 'test' });

      await service.createJob(
        'research',
        { question: 'Test question' },
        'researcher',
        'test.md',
        42,
        ['tag1', 'tag2']
      );

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining([
          expect.stringContaining('bridge.py'),
          'create_job',
          expect.any(String),
        ]),
        expect.objectContaining({
          cwd: expect.stringContaining('python'),
        })
      );

      // Check the JSON payload
      const calls = (spawn as jest.Mock).mock.calls;
      const jsonArg = JSON.parse(calls[0][1][2]);
      expect(jsonArg.type).toBe('research');
      expect(jsonArg.payload.question).toBe('Test question');
      expect(jsonArg.agent).toBe('researcher');
      expect(jsonArg.sourceFile).toBe('test.md');
      expect(jsonArg.sourceLine).toBe(42);
      expect(jsonArg.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle bridge script errors', async () => {
      const mockProcess = createMockProcess('', 'Python error', 1);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await expect(
        service.createJob('research', { question: 'Test' })
      ).rejects.toThrow('Bridge script failed');
    });

    it('should handle JSON parse errors', async () => {
      const mockProcess = createMockProcess('invalid json', '', 0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await expect(
        service.createJob('research', { question: 'Test' })
      ).rejects.toThrow('Failed to parse bridge response');
    });

    it('should handle error responses from bridge', async () => {
      setupSpawnMock({ error: 'Job creation failed' });

      await expect(
        service.createJob('research', { question: 'Test' })
      ).rejects.toThrow('Job creation failed');
    });
  });

  describe('createResearchJob', () => {
    it('should create research job with correct type and payload', async () => {
      const question = 'What is quantum computing?';
      const sourceFile = 'daily/2024-02-01.md';

      setupSpawnMock({
        shortId: 'res12345',
        type: 'research',
        status: 'pending',
      });

      const result = await service.createResearchJob(question, sourceFile);

      expect(result.type).toBe('research');
      expect(result.shortId).toBe('res12345');

      // Verify the call
      const calls = (spawn as jest.Mock).mock.calls;
      const jsonArg = JSON.parse(calls[0][1][2]);
      expect(jsonArg.type).toBe('research');
      expect(jsonArg.payload.question).toBe(question);
      expect(jsonArg.agent).toBe('researcher');
      expect(jsonArg.sourceFile).toBe(sourceFile);
      expect(jsonArg.tags).toContain('research');
      expect(jsonArg.tags).toContain('daily-note');
    });
  });

  describe('createMeetingExtractionJob', () => {
    it('should create meeting extraction job with correct payload', async () => {
      const meeting = {
        title: 'Standup',
        time_str: '9:00 AM',
      };
      const sourceFile = 'daily/2024-02-01.md';

      setupSpawnMock({
        shortId: 'meet1234',
        type: 'meeting_extract',
      });

      await service.createMeetingExtractionJob(meeting, sourceFile);

      const calls = (spawn as jest.Mock).mock.calls;
      const jsonArg = JSON.parse(calls[0][1][2]);
      expect(jsonArg.type).toBe('meeting_extract');
      expect(jsonArg.payload.meeting).toEqual(meeting);
      expect(jsonArg.agent).toBe('assistant');
      expect(jsonArg.tags).toContain('meeting');
      expect(jsonArg.tags).toContain('extraction');
    });
  });

  describe('createAgentActionJob', () => {
    it('should create agent action job with correct payload', async () => {
      setupSpawnMock({
        shortId: 'agent123',
        type: 'agent_action',
      });

      await service.createAgentActionJob('researcher', 'process-queue', 300);

      const calls = (spawn as jest.Mock).mock.calls;
      const jsonArg = JSON.parse(calls[0][1][2]);
      expect(jsonArg.type).toBe('agent_action');
      expect(jsonArg.payload.agent).toBe('researcher');
      expect(jsonArg.payload.action).toBe('process-queue');
      expect(jsonArg.payload.timeout).toBe(300);
      expect(jsonArg.tags).toContain('agent');
      expect(jsonArg.tags).toContain('legacy');
    });

    it('should use default timeout if not provided', async () => {
      setupSpawnMock({ shortId: 'test' });

      await service.createAgentActionJob('assistant', 'morning-briefing');

      const calls = (spawn as jest.Mock).mock.calls;
      const jsonArg = JSON.parse(calls[0][1][2]);
      expect(jsonArg.payload.timeout).toBe(300);
    });
  });

  describe('getJobStatus', () => {
    it('should retrieve job status by ID', async () => {
      setupSpawnMock({
        id: 'full-uuid',
        shortId: 'abc12345',
        type: 'research',
        status: 'running',
        assignedTo: 'researcher',
        pid: 12345,
      });

      const result = await service.getJobStatus('abc12345');

      expect(result.shortId).toBe('abc12345');
      expect(result.status).toBe('running');
      expect(result.pid).toBe(12345);

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining(['get_job_status', 'abc12345']),
        expect.any(Object)
      );
    });

    it('should handle job not found', async () => {
      setupSpawnMock({ error: 'Job not found' });

      await expect(service.getJobStatus('invalid')).rejects.toThrow('Job not found');
    });
  });

  describe('getPendingJobs', () => {
    it('should retrieve pending jobs without filter', async () => {
      setupSpawnMock({
        jobs: [
          { shortId: 'job1', type: 'research' },
          { shortId: 'job2', type: 'meeting_extract' },
        ],
      });

      const result = await service.getPendingJobs();

      expect(result).toHaveLength(2);
      expect(result[0].shortId).toBe('job1');
      expect(result[1].shortId).toBe('job2');
    });

    it('should filter by agent when provided', async () => {
      setupSpawnMock({
        jobs: [{ shortId: 'job1', assignedTo: 'researcher' }],
      });

      await service.getPendingJobs('researcher');

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining(['get_pending_jobs', 'researcher']),
        expect.any(Object)
      );
    });
  });

  describe('getRunningJobs', () => {
    it('should retrieve running jobs', async () => {
      setupSpawnMock({
        jobs: [
          { shortId: 'job1', status: 'running', pid: 123 },
          { shortId: 'job2', status: 'running', pid: 456 },
        ],
      });

      const result = await service.getRunningJobs();

      expect(result).toHaveLength(2);
      expect(result[0].pid).toBe(123);
      expect(result[1].pid).toBe(456);
    });
  });

  describe('getJobLogs', () => {
    it('should retrieve job logs with default limit', async () => {
      setupSpawnMock({
        logs: [
          { timestamp: '2024-02-01T10:00:00Z', level: 'info', message: 'Started' },
          { timestamp: '2024-02-01T10:01:00Z', level: 'info', message: 'Processing' },
        ],
      });

      const result = await service.getJobLogs('abc12345');

      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Started');

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining(['get_job_logs', 'abc12345', '50']),
        expect.any(Object)
      );
    });

    it('should respect custom limit', async () => {
      setupSpawnMock({ logs: [] });

      await service.getJobLogs('abc12345', 100);

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining(['get_job_logs', 'abc12345', '100']),
        expect.any(Object)
      );
    });
  });

  describe('getJobSummary', () => {
    it('should retrieve job summary with all statuses', async () => {
      setupSpawnMock({
        pending: 5,
        running: 2,
        completed: 100,
        failed: 3,
        cancelled: 1,
        hung: 0,
      });

      const result = await service.getJobSummary();

      expect(result.pending).toBe(5);
      expect(result.running).toBe(2);
      expect(result.completed).toBe(100);
      expect(result.failed).toBe(3);
      expect(result.cancelled).toBe(1);
      expect(result.hung).toBe(0);

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining(['get_job_summary']),
        expect.any(Object)
      );
    });
  });

  describe('checkBridgeAvailable', () => {
    it('should return true when bridge is available', async () => {
      setupSpawnMock({
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        hung: 0,
      });

      const result = await service.checkBridgeAvailable();

      expect(result).toBe(true);
    });

    it('should return false when bridge fails', async () => {
      const mockProcess = createMockProcess('', 'Connection error', 1);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.checkBridgeAvailable();

      expect(result).toBe(false);
    });

    it('should return false on spawn error', async () => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Emit error asynchronously
      setImmediate(() => {
        mockProcess.emit('error', new Error('Spawn failed'));
      });

      const result = await service.checkBridgeAvailable();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle process spawn errors', async () => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const jobPromise = service.createJob('research', { question: 'Test' });

      setImmediate(() => {
        mockProcess.emit('error', new Error('Failed to spawn'));
      });

      await expect(jobPromise).rejects.toThrow('Failed to run bridge script');
    });

    it('should handle partial JSON data', async () => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const summaryPromise = service.getJobSummary();

      setImmediate(() => {
        mockProcess.stdout.emit('data', '{"pending":');
        mockProcess.stdout.emit('data', '5,"running":2}');
        mockProcess.emit('close', 0);
      });

      const result = await summaryPromise;

      expect(result.pending).toBe(5);
      expect(result.running).toBe(2);
    });

    it('should accumulate stderr for error messages', async () => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const jobPromise = service.createJob('research', { question: 'Test' });

      setImmediate(() => {
        mockProcess.stderr.emit('data', 'Error line 1\n');
        mockProcess.stderr.emit('data', 'Error line 2');
        mockProcess.emit('close', 1);
      });

      await expect(jobPromise).rejects.toThrow('Error line 1\nError line 2');
    });

    it('should report missing Python dependencies error', async () => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const summaryPromise = service.getJobSummary();

      setImmediate(() => {
        mockProcess.stderr.emit(
          'data',
          'Traceback (most recent call last):\n'
        );
        mockProcess.stderr.emit(
          'data',
          '  File "bridge.py", line 8, in <module>\n'
        );
        mockProcess.stderr.emit(
          'data',
          '    from dotenv import load_dotenv\n'
        );
        mockProcess.stderr.emit(
          'data',
          "ModuleNotFoundError: No module named 'dotenv'\n"
        );
        mockProcess.emit('close', 1);
      });

      await expect(summaryPromise).rejects.toThrow(
        /ModuleNotFoundError.*dotenv/
      );
    });

    it('should report missing supabase dependency error', async () => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const summaryPromise = service.getJobSummary();

      setImmediate(() => {
        mockProcess.stderr.emit(
          'data',
          'Traceback (most recent call last):\n'
        );
        mockProcess.stderr.emit(
          'data',
          '  File "bridge.py", line 10, in <module>\n'
        );
        mockProcess.stderr.emit(
          'data',
          '    from persona.core.job_store import JobStore\n'
        );
        mockProcess.stderr.emit(
          'data',
          "ModuleNotFoundError: No module named 'supabase'\n"
        );
        mockProcess.emit('close', 1);
      });

      await expect(summaryPromise).rejects.toThrow(
        /ModuleNotFoundError.*supabase/
      );
    });
  });

  describe('integration scenarios', () => {
    it('should create multiple jobs sequentially', async () => {
      // Setup mocks for two sequential calls
      setupSpawnMock({ shortId: 'job1' });

      const job1 = await service.createResearchJob('Question 1', 'file1.md');

      setupSpawnMock({ shortId: 'job2' });

      const job2 = await service.createResearchJob('Question 2', 'file2.md');

      expect(job1.shortId).toBe('job1');
      expect(job2.shortId).toBe('job2');
      expect(spawn).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed job types', async () => {
      // Research job
      setupSpawnMock({ shortId: 'res1', type: 'research' });
      await service.createResearchJob('Question', 'file.md');

      // Meeting job
      setupSpawnMock({ shortId: 'meet1', type: 'meeting_extract' });
      await service.createMeetingExtractionJob({ title: 'Standup' }, 'file.md');

      // Agent action
      setupSpawnMock({ shortId: 'agent1', type: 'agent_action' });
      await service.createAgentActionJob('assistant', 'morning-briefing');

      expect(spawn).toHaveBeenCalledTimes(3);
    });
  });
});
