/**
 * Tests for QueueConsumerService
 */

import { QueueConsumerService, ConsumerStatus } from '../QueueConsumerService';
import { JobQueueService, JobInfo } from '../JobQueueService';
import { ExecutionService, ExecutionResult } from '../ExecutionService';
import { ExecutionSlotManager } from '../ExecutionSlotManager';
import { PersonaSettings, DEFAULT_SETTINGS } from '../../types';

// Mock the dependencies
jest.mock('../JobQueueService');
jest.mock('../ExecutionService');

describe('QueueConsumerService', () => {
  let queueConsumer: QueueConsumerService;
  let mockJobQueueService: jest.Mocked<JobQueueService>;
  let mockExecutionService: jest.Mocked<ExecutionService>;
  let slotManager: ExecutionSlotManager;
  let mockSettings: PersonaSettings;

  beforeEach(() => {
    jest.useFakeTimers();

    // Create mocks
    mockJobQueueService = {
      getPendingJobs: jest.fn().mockResolvedValue([]),
      getRunningJobs: jest.fn().mockResolvedValue([]),
      getHungJobs: jest.fn().mockResolvedValue([]), // For orphan cleanup on start
      updateJobStatus: jest.fn().mockResolvedValue({ success: true }),
      heartbeat: jest.fn().mockResolvedValue({ success: true }),
    } as unknown as jest.Mocked<JobQueueService>;

    mockExecutionService = {
      runAgent: jest.fn().mockResolvedValue({ success: true, agent: 'test', action: 'test', status: 'completed' }),
      isAgentRunning: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<ExecutionService>;

    slotManager = new ExecutionSlotManager(2);

    mockSettings = {
      ...DEFAULT_SETTINGS,
      queueConsumerEnabled: true,
      queuePollIntervalSeconds: 30,
      maxConcurrentAgents: 2,
    };

    queueConsumer = new QueueConsumerService(
      mockJobQueueService,
      mockExecutionService,
      slotManager,
      mockSettings
    );
  });

  afterEach(() => {
    queueConsumer.stop();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('start/stop lifecycle', () => {
    it('should start polling when start() is called', async () => {
      await queueConsumer.start();
      expect(queueConsumer.isRunning()).toBe(true);
    });

    it('should stop polling when stop() is called', async () => {
      await queueConsumer.start();
      queueConsumer.stop();
      expect(queueConsumer.isRunning()).toBe(false);
    });

    it('should not start twice', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await queueConsumer.start();
      await queueConsumer.start();
      expect(consoleSpy).toHaveBeenCalledWith('[QueueConsumer] Already running');
      consoleSpy.mockRestore();
    });

    it('should be safe to stop when not running', () => {
      expect(() => queueConsumer.stop()).not.toThrow();
    });

    it('should cleanup orphaned jobs on start', async () => {
      const hungJob = {
        id: 'uuid-hung',
        shortId: 'hung123',
        type: 'research',
        status: 'running',
        assignedTo: 'researcher',
      };
      mockJobQueueService.getHungJobs.mockResolvedValue([hungJob]);

      await queueConsumer.start();

      expect(mockJobQueueService.getHungJobs).toHaveBeenCalled();
      expect(mockJobQueueService.updateJobStatus).toHaveBeenCalledWith(
        'hung123',
        'failed',
        expect.stringContaining('Orphaned')
      );
    });
  });

  describe('getStatus', () => {
    it('should return correct initial status', () => {
      const status = queueConsumer.getStatus();
      expect(status.running).toBe(false);
      expect(status.activeJobs).toBe(0);
      expect(status.maxConcurrent).toBe(2);
      expect(status.lastPollTime).toBeNull();
      expect(status.pollIntervalSeconds).toBe(30);
      expect(status.runningAgents).toEqual([]);
    });

    it('should return running status after start', async () => {
      await queueConsumer.start();
      const status = queueConsumer.getStatus();
      expect(status.running).toBe(true);
    });
  });

  describe('polling behavior', () => {
    it('should poll after initial delay', async () => {
      await queueConsumer.start();

      // Advance past initial delay (1 second)
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Let async poll execute

      expect(mockJobQueueService.getPendingJobs).toHaveBeenCalled();
    });

    it('should poll at configured interval', async () => {
      await queueConsumer.start();

      // Initial poll
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(mockJobQueueService.getPendingJobs).toHaveBeenCalledTimes(1);

      // Wait for interval (30 seconds)
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
      expect(mockJobQueueService.getPendingJobs).toHaveBeenCalledTimes(2);
    });

    it('should update lastPollTime when polling', async () => {
      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      const status = queueConsumer.getStatus();
      expect(status.lastPollTime).not.toBeNull();
    });
  });

  describe('job dispatching', () => {
    const mockJob: JobInfo = {
      id: 'uuid-123',
      shortId: 'abc123',
      type: 'research',
      status: 'pending',
      assignedTo: 'researcher',
      createdAt: new Date(),
      updatedAt: new Date(),
      result: { action: 'process-research-queue' },
    };

    it('should dispatch pending jobs to ExecutionService', async () => {
      mockJobQueueService.getPendingJobs.mockResolvedValue([mockJob]);

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve(); // Additional tick for async dispatch

      expect(mockExecutionService.runAgent).toHaveBeenCalledWith('researcher', 'process-research-queue');
    });

    it('should skip jobs without assigned agent', async () => {
      const jobWithoutAgent = { ...mockJob, assignedTo: undefined };
      mockJobQueueService.getPendingJobs.mockResolvedValue([jobWithoutAgent as JobInfo]);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockExecutionService.runAgent).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not dispatch if agent is already running in slot manager', async () => {
      // Pre-acquire slot for researcher
      slotManager.acquireSlot('researcher', 'existing-job');
      mockJobQueueService.getPendingJobs.mockResolvedValue([mockJob]);

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockExecutionService.runAgent).not.toHaveBeenCalled();
    });

    it('should not dispatch if agent is running in ExecutionService', async () => {
      mockExecutionService.isAgentRunning.mockReturnValue(true);
      mockJobQueueService.getPendingJobs.mockResolvedValue([mockJob]);

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockExecutionService.runAgent).not.toHaveBeenCalled();
    });

    it('should respect max concurrent agents limit', async () => {
      const job1 = { ...mockJob, shortId: 'job1', assignedTo: 'researcher' };
      const job2 = { ...mockJob, shortId: 'job2', assignedTo: 'assistant' };
      const job3 = { ...mockJob, shortId: 'job3', assignedTo: 'ceo' };

      mockJobQueueService.getPendingJobs.mockResolvedValue([job1, job2, job3]);

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();

      // Should only dispatch 2 jobs (max concurrent)
      expect(mockExecutionService.runAgent).toHaveBeenCalledTimes(2);
    });

    it('should dispatch multiple different agents in parallel', async () => {
      const job1 = { ...mockJob, shortId: 'job1', assignedTo: 'researcher' };
      const job2 = { ...mockJob, shortId: 'job2', assignedTo: 'assistant' };

      mockJobQueueService.getPendingJobs.mockResolvedValue([job1, job2]);

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockExecutionService.runAgent).toHaveBeenCalledWith('researcher', 'process-research-queue');
      expect(mockExecutionService.runAgent).toHaveBeenCalledWith('assistant', 'process-research-queue');
    });
  });

  describe('updateSettings', () => {
    it('should update slot manager max slots', () => {
      const newSettings = { ...mockSettings, maxConcurrentAgents: 5 };
      queueConsumer.updateSettings(newSettings);

      const status = queueConsumer.getStatus();
      expect(status.maxConcurrent).toBe(5);
    });

    it('should restart with new interval if running', async () => {
      await queueConsumer.start();
      expect(queueConsumer.isRunning()).toBe(true);

      const newSettings = { ...mockSettings, queuePollIntervalSeconds: 60 };
      queueConsumer.updateSettings(newSettings);

      // Should still be running after settings update
      expect(queueConsumer.isRunning()).toBe(true);
      expect(queueConsumer.getStatus().pollIntervalSeconds).toBe(60);
    });
  });

  describe('pollNow', () => {
    it('should trigger immediate poll when running', async () => {
      await queueConsumer.start();
      mockJobQueueService.getPendingJobs.mockClear(); // Clear initial poll calls
      await queueConsumer.pollNow();
      expect(mockJobQueueService.getPendingJobs).toHaveBeenCalled();
    });

    it('should not poll when not running', async () => {
      await queueConsumer.pollNow();
      // pollNow calls poll() which checks this.running - so no call made
      expect(mockJobQueueService.getPendingJobs).not.toHaveBeenCalled();
    });
  });

  describe('getPendingDispatchCount', () => {
    it('should return 0 when no dispatches are pending', () => {
      expect(queueConsumer.getPendingDispatchCount()).toBe(0);
    });
  });

  describe('action extraction', () => {
    it('should use action from job result if present', async () => {
      const jobWithAction: JobInfo = {
        id: 'uuid-123',
        shortId: 'abc123',
        type: 'agent_action',
        status: 'pending',
        assignedTo: 'assistant',
        createdAt: new Date(),
        updatedAt: new Date(),
        result: { action: 'morning-briefing' },
      };

      mockJobQueueService.getPendingJobs.mockResolvedValue([jobWithAction]);

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockExecutionService.runAgent).toHaveBeenCalledWith('assistant', 'morning-briefing');
    });

    it('should use default action based on job type', async () => {
      const jobWithoutAction: JobInfo = {
        id: 'uuid-123',
        shortId: 'abc123',
        type: 'meeting_extract',
        status: 'pending',
        assignedTo: 'assistant',
        createdAt: new Date(),
        updatedAt: new Date(),
        result: null,
      };

      mockJobQueueService.getPendingJobs.mockResolvedValue([jobWithoutAction]);

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockExecutionService.runAgent).toHaveBeenCalledWith('assistant', 'extract-meetings');
    });
  });

  describe('error handling', () => {
    it('should handle poll errors gracefully', async () => {
      mockJobQueueService.getPendingJobs.mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalled();
      expect(queueConsumer.isRunning()).toBe(true); // Should keep running
      consoleSpy.mockRestore();
    });

    it('should handle execution errors and release slot', async () => {
      const mockJob: JobInfo = {
        id: 'uuid-123',
        shortId: 'abc123',
        type: 'research',
        status: 'pending',
        assignedTo: 'researcher',
        createdAt: new Date(),
        updatedAt: new Date(),
        result: { action: 'process-research-queue' },
      };

      mockJobQueueService.getPendingJobs.mockResolvedValue([mockJob]);
      mockExecutionService.runAgent.mockRejectedValue(new Error('Execution failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await queueConsumer.start();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve(); // Let error propagate

      // Slot should be released even after error
      expect(slotManager.isAgentRunning('researcher')).toBe(false);
      consoleSpy.mockRestore();
    });
  });
});
