import * as path from 'path';

// We'll import types but create service fresh each test
type TaskQueueServiceType = import('../TaskQueueService').TaskQueueService;
type QueuedTaskType = import('../TaskQueueService').QueuedTask;

describe('TaskQueueService', () => {
  let service: TaskQueueServiceType;
  let TaskQueueService: typeof import('../TaskQueueService').TaskQueueService;
  let fs: jest.Mocked<typeof import('fs')>;
  const testStatePath = '/test/state';
  const testQueuePath = path.join(testStatePath, 'queue.json');

  beforeEach(() => {
    // Reset module registry to get fresh instances
    jest.resetModules();

    // Re-require fs mock
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
      mkdirSync: jest.fn(),
    }));

    // Get fresh module references
    fs = require('fs');
    TaskQueueService = require('../TaskQueueService').TaskQueueService;

    // Create fresh service for each test
    service = new TaskQueueService(testStatePath, 2);
  });

  afterEach(() => {
    jest.resetModules();
  });

  /**
   * Helper to create a mock task
   */
  function createMockTask(overrides: Partial<QueuedTaskType> = {}): Omit<QueuedTaskType, 'attempts' | 'queuedAt'> {
    return {
      id: `task-${Date.now()}-${Math.random()}`,
      content: 'Test task content',
      instance: 'TestBusiness',
      type: 'agent-task',
      line: 42,
      sourcePath: '/test/daily/2025-01-15.md',
      ...overrides,
    };
  }

  describe('constructor', () => {
    it('should create with default max concurrent of 2', () => {
      const svc = new TaskQueueService(testStatePath);
      expect(svc.getMaxConcurrent()).toBe(2);
    });

    it('should use provided max concurrent value', () => {
      const svc = new TaskQueueService(testStatePath, 5);
      expect(svc.getMaxConcurrent()).toBe(5);
    });

    it('should load existing queue from disk', () => {
      // Reset modules to configure the mock before service loads
      jest.resetModules();

      const existingQueue = {
        primary: [{ id: '1', content: 'Task 1', instance: 'Test', type: 'agent-task', line: 1, sourcePath: '/test.md', queuedAt: '2025-01-15T10:00:00Z', attempts: 0 }],
        secondary: [],
        dlq: [],
        lastUpdated: '2025-01-15T10:00:00Z',
      };

      jest.doMock('fs', () => ({
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockReturnValue(JSON.stringify(existingQueue)),
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
      }));

      const { TaskQueueService: FreshService } = require('../TaskQueueService');
      const svc = new FreshService(testStatePath);

      expect(svc.size()).toBe(1);
    });

    it('should create empty queue if file parse fails', () => {
      jest.resetModules();

      jest.doMock('fs', () => ({
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockReturnValue('invalid json'),
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
      }));

      const { TaskQueueService: FreshService } = require('../TaskQueueService');
      const svc = new FreshService(testStatePath);

      expect(svc.size()).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('should add task to primary queue', () => {
      const task = createMockTask();

      service.enqueue(task);

      expect(service.size()).toBe(1);
      const primary = service.getPrimary();
      expect(primary).toHaveLength(1);
      expect(primary[0].content).toBe('Test task content');
      expect(primary[0].attempts).toBe(0);
    });

    it('should set queuedAt timestamp', () => {
      const task = createMockTask();

      service.enqueue(task);

      const primary = service.getPrimary();
      expect(primary[0].queuedAt).toBeDefined();
      expect(new Date(primary[0].queuedAt).getTime()).toBeGreaterThan(0);
    });

    it('should persist queue to disk', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      const task = createMockTask();
      service.enqueue(task);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testQueuePath,
        expect.any(String)
      );
    });

    it('should create directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      const task = createMockTask();
      service.enqueue(task);

      expect(fs.mkdirSync).toHaveBeenCalledWith(testStatePath, { recursive: true });
    });
  });

  describe('dequeue', () => {
    it('should return undefined when queue is empty', () => {
      const task = service.dequeue();
      expect(task).toBeUndefined();
    });

    it('should return task from primary queue first', () => {
      service.enqueue(createMockTask({ id: 'primary-task', content: 'Primary' }));

      const task = service.dequeue();

      expect(task).toBeDefined();
      expect(task!.id).toBe('primary-task');
      expect(task!.content).toBe('Primary');
    });

    it('should increment attempts when dequeued', () => {
      service.enqueue(createMockTask());

      const task = service.dequeue();

      expect(task!.attempts).toBe(1);
    });

    it('should set lastAttemptAt when dequeued', () => {
      service.enqueue(createMockTask());

      const task = service.dequeue();

      expect(task!.lastAttemptAt).toBeDefined();
    });

    it('should return from secondary queue when primary is empty', () => {
      // Manually add to secondary queue by simulating failure
      service.enqueue(createMockTask({ id: 'task-1' }));
      const task = service.dequeue()!;
      service.handleFailure(task, 'First failure');

      // Now primary is empty, secondary has one
      const nextTask = service.dequeue();

      expect(nextTask).toBeDefined();
      expect(nextTask!.id).toBe('task-1');
      expect(nextTask!.attempts).toBe(2); // Was 1, now 2
    });

    it('should remove task from queue', () => {
      service.enqueue(createMockTask());
      expect(service.size()).toBe(1);

      service.dequeue();

      expect(service.size()).toBe(0);
    });
  });

  describe('peek', () => {
    it('should return undefined when queue is empty', () => {
      expect(service.peek()).toBeUndefined();
    });

    it('should return first task without removing it', () => {
      service.enqueue(createMockTask({ id: 'peek-task' }));

      const peeked = service.peek();
      expect(peeked).toBeDefined();
      expect(peeked!.id).toBe('peek-task');

      // Should still be in queue
      expect(service.size()).toBe(1);
    });

    it('should peek primary queue first', () => {
      service.enqueue(createMockTask({ id: 'primary' }));

      // Add to secondary via failure
      const task = service.dequeue()!;
      service.handleFailure(task, 'Error');
      service.enqueue(createMockTask({ id: 'new-primary' }));

      const peeked = service.peek();
      expect(peeked!.id).toBe('new-primary');
    });
  });

  describe('handleFailure', () => {
    it('should move task to secondary queue on first failure', () => {
      service.enqueue(createMockTask({ id: 'failing-task' }));
      const task = service.dequeue()!;

      service.handleFailure(task, 'First error');

      expect(service.getSecondary()).toHaveLength(1);
      expect(service.getDlq()).toHaveLength(0);
    });

    it('should store error message', () => {
      service.enqueue(createMockTask());
      const task = service.dequeue()!;

      service.handleFailure(task, 'Specific error message');

      const secondary = service.getSecondary();
      expect(secondary[0].lastError).toBe('Specific error message');
    });

    it('should move task to DLQ on second failure', () => {
      service.enqueue(createMockTask({ id: 'dlq-task' }));

      // First attempt and failure
      let task = service.dequeue()!;
      service.handleFailure(task, 'First error');

      // Second attempt and failure
      task = service.dequeue()!;
      service.handleFailure(task, 'Second error');

      expect(service.getSecondary()).toHaveLength(0);
      expect(service.getDlq()).toHaveLength(1);
      expect(service.getDlq()[0].id).toBe('dlq-task');
    });

    it('should persist state after failure', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      service.enqueue(createMockTask());
      const task = service.dequeue()!;
      service.handleFailure(task, 'Error');

      // Should have been called for enqueue, dequeue, and handleFailure
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('handleSuccess', () => {
    it('should persist state', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      service.enqueue(createMockTask());
      const task = service.dequeue()!;

      jest.clearAllMocks();
      service.handleSuccess(task);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('retryFromDlq', () => {
    it('should move task from DLQ back to primary', () => {
      // Get task to DLQ
      service.enqueue(createMockTask({ id: 'retry-task' }));
      let task = service.dequeue()!;
      service.handleFailure(task, 'First');
      task = service.dequeue()!;
      service.handleFailure(task, 'Second');

      expect(service.getDlq()).toHaveLength(1);

      const result = service.retryFromDlq('retry-task');

      expect(result).toBe(true);
      expect(service.getDlq()).toHaveLength(0);
      expect(service.getPrimary()).toHaveLength(1);
    });

    it('should reset attempts to 0', () => {
      service.enqueue(createMockTask({ id: 'reset-task' }));
      let task = service.dequeue()!;
      service.handleFailure(task, 'First');
      task = service.dequeue()!;
      service.handleFailure(task, 'Second');

      service.retryFromDlq('reset-task');

      const primary = service.getPrimary();
      expect(primary[0].attempts).toBe(0);
    });

    it('should clear lastError', () => {
      service.enqueue(createMockTask({ id: 'clear-error-task' }));
      let task = service.dequeue()!;
      service.handleFailure(task, 'First');
      task = service.dequeue()!;
      service.handleFailure(task, 'Second');

      service.retryFromDlq('clear-error-task');

      const primary = service.getPrimary();
      expect(primary[0].lastError).toBeUndefined();
    });

    it('should return false if task not found in DLQ', () => {
      const result = service.retryFromDlq('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('retryAllFromDlq', () => {
    it('should move all tasks from DLQ to primary', () => {
      // Add multiple tasks to DLQ
      service.enqueue(createMockTask({ id: 'task-1' }));
      service.enqueue(createMockTask({ id: 'task-2' }));

      let task = service.dequeue()!;
      service.handleFailure(task, 'Error');
      task = service.dequeue()!;
      service.handleFailure(task, 'Error');
      task = service.dequeue()!;
      service.handleFailure(task, 'Error');
      task = service.dequeue()!;
      service.handleFailure(task, 'Error');

      expect(service.getDlq()).toHaveLength(2);

      const count = service.retryAllFromDlq();

      expect(count).toBe(2);
      expect(service.getDlq()).toHaveLength(0);
      expect(service.getPrimary()).toHaveLength(2);
    });

    it('should return 0 if DLQ is empty', () => {
      const count = service.retryAllFromDlq();
      expect(count).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct queue counts', () => {
      service.enqueue(createMockTask({ id: 'p1' }));
      service.enqueue(createMockTask({ id: 'p2' }));

      // Move one to secondary
      const task = service.dequeue()!;
      service.handleFailure(task, 'Error');

      const stats = service.getStats();

      expect(stats.primary).toBe(1);
      expect(stats.secondary).toBe(1);
      expect(stats.dlq).toBe(0);
      expect(stats.total).toBe(2);
    });
  });

  describe('size', () => {
    it('should return total of primary + secondary', () => {
      service.enqueue(createMockTask());
      service.enqueue(createMockTask());

      expect(service.size()).toBe(2);
    });

    it('should not include DLQ in size', () => {
      service.enqueue(createMockTask({ id: 'dlq-task' }));
      let task = service.dequeue()!;
      service.handleFailure(task, 'First');
      task = service.dequeue()!;
      service.handleFailure(task, 'Second');

      expect(service.size()).toBe(0);
      expect(service.getDlq()).toHaveLength(1);
    });
  });

  describe('isEmpty', () => {
    it('should return true when queue is empty', () => {
      expect(service.isEmpty()).toBe(true);
    });

    it('should return false when queue has tasks', () => {
      service.enqueue(createMockTask());
      expect(service.isEmpty()).toBe(false);
    });
  });

  describe('canRunImmediately', () => {
    it('should return true when running count is below max', () => {
      expect(service.canRunImmediately(0)).toBe(true);
      expect(service.canRunImmediately(1)).toBe(true);
    });

    it('should return false when running count equals max', () => {
      expect(service.canRunImmediately(2)).toBe(false);
    });

    it('should return false when running count exceeds max', () => {
      expect(service.canRunImmediately(3)).toBe(false);
    });
  });

  describe('setMaxConcurrent', () => {
    it('should update max concurrent value', () => {
      service.setMaxConcurrent(5);
      expect(service.getMaxConcurrent()).toBe(5);
    });
  });

  describe('clear methods', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    });

    it('should clear primary queue', () => {
      service.enqueue(createMockTask());
      service.enqueue(createMockTask());

      service.clearPrimary();

      expect(service.getPrimary()).toHaveLength(0);
    });

    it('should clear secondary queue', () => {
      service.enqueue(createMockTask());
      const task = service.dequeue()!;
      service.handleFailure(task, 'Error');

      service.clearSecondary();

      expect(service.getSecondary()).toHaveLength(0);
    });

    it('should clear DLQ', () => {
      service.enqueue(createMockTask());
      let task = service.dequeue()!;
      service.handleFailure(task, 'First');
      task = service.dequeue()!;
      service.handleFailure(task, 'Second');

      service.clearDlq();

      expect(service.getDlq()).toHaveLength(0);
    });

    it('should clear all queues', () => {
      service.enqueue(createMockTask({ id: 'primary' }));
      service.enqueue(createMockTask({ id: 'secondary' }));

      const task = service.dequeue()!;
      service.handleFailure(task, 'Error');

      service.clearAll();

      expect(service.getPrimary()).toHaveLength(0);
      expect(service.getSecondary()).toHaveLength(0);
      expect(service.getDlq()).toHaveLength(0);
    });
  });

  describe('slot available callback', () => {
    it('should call callback when slot becomes available and queue has tasks', () => {
      const callback = jest.fn();
      service.setSlotAvailableCallback(callback);
      service.enqueue(createMockTask());

      service.notifySlotAvailable();

      expect(callback).toHaveBeenCalled();
    });

    it('should not call callback when queue is empty', () => {
      const callback = jest.fn();
      service.setSlotAvailableCallback(callback);

      service.notifySlotAvailable();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback if not set', () => {
      service.enqueue(createMockTask());

      // Should not throw
      expect(() => service.notifySlotAvailable()).not.toThrow();
    });
  });

  describe('getStatusString', () => {
    it('should return formatted status string', () => {
      service.enqueue(createMockTask());
      service.enqueue(createMockTask());

      const status = service.getStatusString(1);

      expect(status).toBe('Running: 1/2 | Queued: 2');
    });

    it('should include DLQ count when not empty', () => {
      service.enqueue(createMockTask());
      let task = service.dequeue()!;
      service.handleFailure(task, 'First');
      task = service.dequeue()!;
      service.handleFailure(task, 'Second');

      const status = service.getStatusString(0);

      expect(status).toContain('DLQ: 1');
    });

    it('should not include DLQ when empty', () => {
      service.enqueue(createMockTask());

      const status = service.getStatusString(0);

      expect(status).not.toContain('DLQ');
    });
  });

  describe('getPrimary/getSecondary/getDlq', () => {
    it('should return copies of arrays, not references', () => {
      service.enqueue(createMockTask());

      const primary1 = service.getPrimary();
      const primary2 = service.getPrimary();

      expect(primary1).not.toBe(primary2);
      expect(primary1).toEqual(primary2);
    });
  });
});
