import { ExecutionService } from '../ExecutionService';
import { PersonaSettings } from '../../types';
import { JobQueueService, JobInfo } from '../JobQueueService';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('obsidian', () => ({
  Notice: jest.fn(),
}));

// Mock providers
jest.mock('../../providers/ProviderRegistry', () => ({
  ProviderRegistry: jest.fn().mockImplementation(() => ({
    getProvider: jest.fn().mockReturnValue({
      displayName: 'Mock Provider',
      execute: jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' }),
    }),
    reinitialize: jest.fn(),
  })),
}));

describe('ExecutionService', () => {
  let service: ExecutionService;
  let mockSettings: PersonaSettings;
  let mockJobQueueService: jest.Mocked<JobQueueService>;

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();

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
      pythonPath: '/usr/bin/python3',
      supabaseUrl: 'http://localhost:54321',
      supabaseKey: 'test-key',
      providers: {},
      defaultProvider: 'claude',
    };

    mockJobQueueService = {
      createAgentActionJob: jest.fn().mockResolvedValue({
        id: 'test-uuid',
        shortId: 'abc12345',
        type: 'agent_action',
        status: 'pending',
        assignedTo: 'researcher',
      } as JobInfo),
      updateJobStatus: jest.fn().mockResolvedValue({ success: true }),
    } as unknown as jest.Mocked<JobQueueService>;

    service = new ExecutionService(mockSettings, mockJobQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to create a mock process that emits events
   */
  function createMockProcess(exitCode: number = 0, stderr: string = ''): any {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    setImmediate(() => {
      if (stderr) {
        mockProcess.stderr.emit('data', stderr);
      }
      mockProcess.emit('close', exitCode);
    });

    return mockProcess;
  }

  describe('runAgent', () => {
    it('should successfully run an agent', async () => {
      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.runAgent('researcher', 'process-queue');

      expect(result.success).toBe(true);
      expect(result.agent).toBe('researcher');
      expect(result.action).toBe('process-queue');
      expect(result.status).toBe('completed');
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
    });

    it('should call spawn with correct arguments', async () => {
      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      expect(spawn).toHaveBeenCalledWith(
        'bash',
        ['/test/persona/scripts/run-agent.sh', 'TestBusiness', 'researcher', 'process-queue'],
        expect.objectContaining({
          cwd: '/test/persona',
        })
      );
    });

    it('should use instance override when provided', async () => {
      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue', 'MHM');

      expect(spawn).toHaveBeenCalledWith(
        'bash',
        ['/test/persona/scripts/run-agent.sh', 'MHM', 'researcher', 'process-queue'],
        expect.any(Object)
      );
    });

    it('should prevent duplicate runs of the same agent', async () => {
      // Create a process that never closes (simulating a long-running agent)
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Start first run but don't await it
      const firstRunPromise = service.runAgent('researcher', 'process-queue');

      // Give the first run time to register
      await new Promise(resolve => setImmediate(resolve));

      // Try to start second run - should fail since first is running
      const secondResult = await service.runAgent('researcher', 'process-queue');

      expect(secondResult.success).toBe(false);
      expect(secondResult.status).toBe('failed');

      // Clean up first run
      mockProcess.emit('close', 0);
      await firstRunPromise;
    });

    it('should handle agent failure with non-zero exit code', async () => {
      const mockProcess = createMockProcess(1, 'Agent error');
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.runAgent('researcher', 'process-queue');

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });

    it('should handle spawn errors', async () => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const runPromise = service.runAgent('researcher', 'process-queue');

      setImmediate(() => {
        mockProcess.emit('error', new Error('Failed to spawn'));
      });

      const result = await runPromise;

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });

    it('should create job in queue service', async () => {
      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      expect(mockJobQueueService.createAgentActionJob).toHaveBeenCalledWith(
        'researcher',
        'process-queue',
        300
      );
    });

    it('should update job status to running after spawn', async () => {
      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      // First call should be to set status to running (note: may have third undefined arg)
      expect(mockJobQueueService.updateJobStatus).toHaveBeenCalledWith(
        'abc12345',
        'running',
        undefined
      );
    });

    it('should update job status to completed on success', async () => {
      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      expect(mockJobQueueService.updateJobStatus).toHaveBeenCalledWith(
        'abc12345',
        'completed',
        undefined
      );
    });

    it('should update job status to failed on error', async () => {
      const mockProcess = createMockProcess(1);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      expect(mockJobQueueService.updateJobStatus).toHaveBeenCalledWith(
        'abc12345',
        'failed',
        'Exit code: 1'
      );
    });

    it('should continue execution even if job creation fails', async () => {
      mockJobQueueService.createAgentActionJob.mockRejectedValue(
        new Error('Database error')
      );

      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.runAgent('researcher', 'process-queue');

      expect(result.success).toBe(true);
    });
  });

  describe('updateJobStatusWithRetry', () => {
    it('should succeed on first attempt', async () => {
      mockJobQueueService.updateJobStatus.mockResolvedValue({ success: true });

      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      // Should have called updateJobStatus for running and completed
      expect(mockJobQueueService.updateJobStatus).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple status updates', async () => {
      // All succeed
      mockJobQueueService.updateJobStatus.mockResolvedValue({ success: true });

      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      // First call: running, second call: completed
      const calls = mockJobQueueService.updateJobStatus.mock.calls;
      expect(calls[0][1]).toBe('running');
      expect(calls[1][1]).toBe('completed');
    });
  });

  describe('isAgentRunning', () => {
    it('should return false when no agent is running', () => {
      expect(service.isAgentRunning('researcher')).toBe(false);
    });

    it('should return true when agent is running', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      // Start agent but don't complete
      const runPromise = service.runAgent('researcher', 'process-queue');

      // Wait for the promise to start execution
      await new Promise(resolve => setImmediate(resolve));

      expect(service.isAgentRunning('researcher')).toBe(true);

      // Clean up
      mockProcess.emit('close', 0);
      await runPromise;
    });

    it('should return false after agent completes', async () => {
      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      expect(service.isAgentRunning('researcher')).toBe(false);
    });
  });

  describe('getRunningCount', () => {
    it('should return 0 when no agents running', () => {
      expect(service.getRunningCount()).toBe(0);
    });

    it('should return correct count of running agents', async () => {
      const mockProcess1 = new EventEmitter() as any;
      mockProcess1.stdout = new EventEmitter();
      mockProcess1.stderr = new EventEmitter();

      const mockProcess2 = new EventEmitter() as any;
      mockProcess2.stdout = new EventEmitter();
      mockProcess2.stderr = new EventEmitter();

      (spawn as jest.Mock)
        .mockReturnValueOnce(mockProcess1)
        .mockReturnValueOnce(mockProcess2);

      const run1 = service.runAgent('researcher', 'process-queue');
      const run2 = service.runAgent('assistant', 'morning-briefing');

      // Wait for both promises to start
      await new Promise(resolve => setImmediate(resolve));

      expect(service.getRunningCount()).toBe(2);

      // Clean up
      mockProcess1.emit('close', 0);
      mockProcess2.emit('close', 0);
      await Promise.all([run1, run2]);
    });
  });

  describe('getRunningExecutions', () => {
    it('should return empty array when no agents running', () => {
      expect(service.getRunningExecutions()).toEqual([]);
    });

    it('should return details of running agents', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const runPromise = service.runAgent('researcher', 'process-queue');

      // Wait for the promise to start
      await new Promise(resolve => setImmediate(resolve));

      const executions = service.getRunningExecutions();
      expect(executions).toHaveLength(1);
      expect(executions[0].agent).toBe('researcher');
      expect(executions[0].action).toBe('process-queue');
      expect(executions[0].startTime).toBeInstanceOf(Date);

      // Clean up
      mockProcess.emit('close', 0);
      await runPromise;
    });
  });

  describe('logSystemError', () => {
    it('should create log directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.appendFileSync as jest.Mock).mockReturnValue(undefined);

      // Trigger an error that would call logSystemError
      mockJobQueueService.updateJobStatus
        .mockResolvedValueOnce({ success: true }) // running
        .mockResolvedValueOnce({ success: false, error: 'Error' })
        .mockResolvedValueOnce({ success: false, error: 'Error' })
        .mockResolvedValueOnce({ success: false, error: 'Error' }); // All retries fail

      const mockProcess = createMockProcess(0);
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      await service.runAgent('researcher', 'process-queue');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });
  });

  describe('getAvailableInstances', () => {
    it('should return list of instance directories', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['MHM', 'PersonalMCO', '.hidden']);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      const instances = service.getAvailableInstances();

      expect(instances).toEqual(['MHM', 'PersonalMCO']);
    });

    it('should return empty array if instances directory does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const instances = service.getAvailableInstances();

      expect(instances).toEqual([]);
    });
  });

  describe('getProgress', () => {
    it('should return progress state from file', () => {
      const mockProgress = {
        agent: 'researcher',
        action: 'process-queue',
        started: '2025-01-15T10:00:00Z',
        step: 'Processing',
        progress: 50,
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockProgress));

      const progress = service.getProgress();

      expect(progress).toEqual(mockProgress);
    });

    it('should return null if progress file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const progress = service.getProgress();

      expect(progress).toBeNull();
    });

    it('should return null on parse error', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      const progress = service.getProgress();

      expect(progress).toBeNull();
    });
  });

  describe('clearProgress', () => {
    it('should delete progress file if it exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      service.clearProgress();

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('progress.json')
      );
    });

    it('should not throw if progress file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => service.clearProgress()).not.toThrow();
    });
  });

  describe('getElapsedTime', () => {
    it('should return empty string if no start time', () => {
      const progress = {
        agent: 'researcher',
        action: 'test',
      };

      const elapsed = service.getElapsedTime(progress as any);

      expect(elapsed).toBe('');
    });

    it('should return seconds for short durations', () => {
      const now = new Date();
      const started = new Date(now.getTime() - 30000); // 30 seconds ago

      const progress = {
        agent: 'researcher',
        action: 'test',
        started: started.toISOString(),
      };

      const elapsed = service.getElapsedTime(progress as any);

      expect(elapsed).toMatch(/^\d+s$/);
    });

    it('should return minutes and seconds for longer durations', () => {
      const now = new Date();
      const started = new Date(now.getTime() - 90000); // 90 seconds ago

      const progress = {
        agent: 'researcher',
        action: 'test',
        started: started.toISOString(),
      };

      const elapsed = service.getElapsedTime(progress as any);

      expect(elapsed).toMatch(/^\d+m \d+s$/);
    });
  });

  describe('reinitializeProviders', () => {
    it('should reinitialize provider registry', () => {
      const registry = service.getProviderRegistry();

      service.reinitializeProviders();

      expect(registry.reinitialize).toHaveBeenCalledWith(
        mockSettings.providers,
        mockSettings.defaultProvider
      );
    });
  });
});
