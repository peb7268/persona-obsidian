/**
 * Tests for ExecutionSlotManager
 */

import { ExecutionSlotManager, SlotInfo } from '../ExecutionSlotManager';

describe('ExecutionSlotManager', () => {
  let slotManager: ExecutionSlotManager;

  beforeEach(() => {
    slotManager = new ExecutionSlotManager(2); // 2 slots max
  });

  describe('acquireSlot', () => {
    it('should acquire a slot when capacity is available', () => {
      const slotId = slotManager.acquireSlot('researcher', 'job-123');
      expect(slotId).not.toBeNull();
      expect(slotId).toBeGreaterThan(0);
    });

    it('should return null when agent is already running', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      const secondSlot = slotManager.acquireSlot('researcher', 'job-456');
      expect(secondSlot).toBeNull();
    });

    it('should allow different agents to run in parallel', () => {
      const slot1 = slotManager.acquireSlot('researcher', 'job-123');
      const slot2 = slotManager.acquireSlot('assistant', 'job-456');
      expect(slot1).not.toBeNull();
      expect(slot2).not.toBeNull();
    });

    it('should return null when max slots reached', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      slotManager.acquireSlot('assistant', 'job-456');
      const thirdSlot = slotManager.acquireSlot('ceo', 'job-789');
      expect(thirdSlot).toBeNull();
    });

    it('should increment slot IDs', () => {
      const slot1 = slotManager.acquireSlot('researcher', 'job-123');
      slotManager.releaseSlot(slot1!);
      const slot2 = slotManager.acquireSlot('assistant', 'job-456');
      expect(slot2).toBeGreaterThan(slot1!);
    });
  });

  describe('releaseSlot', () => {
    it('should release a slot and allow new acquisitions', () => {
      const slot1 = slotManager.acquireSlot('researcher', 'job-123');
      slotManager.releaseSlot(slot1!);
      const slot2 = slotManager.acquireSlot('researcher', 'job-456');
      expect(slot2).not.toBeNull();
    });

    it('should free capacity when released', () => {
      const slot1 = slotManager.acquireSlot('researcher', 'job-123');
      const slot2 = slotManager.acquireSlot('assistant', 'job-456');
      expect(slotManager.hasCapacity()).toBe(false);

      slotManager.releaseSlot(slot1!);
      expect(slotManager.hasCapacity()).toBe(true);
    });

    it('should handle releasing invalid slot IDs gracefully', () => {
      expect(() => slotManager.releaseSlot(999)).not.toThrow();
    });
  });

  describe('isAgentRunning', () => {
    it('should return true for running agent', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      expect(slotManager.isAgentRunning('researcher')).toBe(true);
    });

    it('should return false for non-running agent', () => {
      expect(slotManager.isAgentRunning('researcher')).toBe(false);
    });

    it('should return false after slot is released', () => {
      const slot = slotManager.acquireSlot('researcher', 'job-123');
      slotManager.releaseSlot(slot!);
      expect(slotManager.isAgentRunning('researcher')).toBe(false);
    });
  });

  describe('getActiveCount', () => {
    it('should return 0 when no slots are used', () => {
      expect(slotManager.getActiveCount()).toBe(0);
    });

    it('should return correct count of active slots', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      expect(slotManager.getActiveCount()).toBe(1);

      slotManager.acquireSlot('assistant', 'job-456');
      expect(slotManager.getActiveCount()).toBe(2);
    });

    it('should decrease count when slots are released', () => {
      const slot = slotManager.acquireSlot('researcher', 'job-123');
      slotManager.acquireSlot('assistant', 'job-456');
      expect(slotManager.getActiveCount()).toBe(2);

      slotManager.releaseSlot(slot!);
      expect(slotManager.getActiveCount()).toBe(1);
    });
  });

  describe('getActiveSlots', () => {
    it('should return empty array when no slots are used', () => {
      expect(slotManager.getActiveSlots()).toEqual([]);
    });

    it('should return slot info for active slots', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      const slots = slotManager.getActiveSlots();
      expect(slots).toHaveLength(1);
      expect(slots[0].agent).toBe('researcher');
      expect(slots[0].jobId).toBe('job-123');
      expect(slots[0].startTime).toBeInstanceOf(Date);
    });
  });

  describe('getMaxSlots', () => {
    it('should return configured max slots', () => {
      expect(slotManager.getMaxSlots()).toBe(2);
    });
  });

  describe('setMaxSlots', () => {
    it('should update max slots', () => {
      slotManager.setMaxSlots(5);
      expect(slotManager.getMaxSlots()).toBe(5);
    });

    it('should allow more acquisitions after increasing max', () => {
      slotManager.acquireSlot('researcher', 'job-1');
      slotManager.acquireSlot('assistant', 'job-2');
      expect(slotManager.hasCapacity()).toBe(false);

      slotManager.setMaxSlots(3);
      expect(slotManager.hasCapacity()).toBe(true);
      const slot3 = slotManager.acquireSlot('ceo', 'job-3');
      expect(slot3).not.toBeNull();
    });
  });

  describe('hasCapacity', () => {
    it('should return true when under capacity', () => {
      expect(slotManager.hasCapacity()).toBe(true);
      slotManager.acquireSlot('researcher', 'job-123');
      expect(slotManager.hasCapacity()).toBe(true);
    });

    it('should return false when at capacity', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      slotManager.acquireSlot('assistant', 'job-456');
      expect(slotManager.hasCapacity()).toBe(false);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return max slots when none are used', () => {
      expect(slotManager.getAvailableSlots()).toBe(2);
    });

    it('should return remaining slots', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      expect(slotManager.getAvailableSlots()).toBe(1);
    });

    it('should return 0 when at capacity', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      slotManager.acquireSlot('assistant', 'job-456');
      expect(slotManager.getAvailableSlots()).toBe(0);
    });
  });

  describe('getRunningAgents', () => {
    it('should return empty array when no agents running', () => {
      expect(slotManager.getRunningAgents()).toEqual([]);
    });

    it('should return list of running agent names', () => {
      slotManager.acquireSlot('researcher', 'job-123');
      slotManager.acquireSlot('assistant', 'job-456');
      const running = slotManager.getRunningAgents();
      expect(running).toContain('researcher');
      expect(running).toContain('assistant');
      expect(running).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle max slots of 1', () => {
      const singleSlotManager = new ExecutionSlotManager(1);
      const slot1 = singleSlotManager.acquireSlot('researcher', 'job-1');
      expect(slot1).not.toBeNull();
      const slot2 = singleSlotManager.acquireSlot('assistant', 'job-2');
      expect(slot2).toBeNull();
    });

    it('should handle max slots of 0', () => {
      const zeroSlotManager = new ExecutionSlotManager(0);
      const slot = zeroSlotManager.acquireSlot('researcher', 'job-1');
      expect(slot).toBeNull();
    });
  });
});
