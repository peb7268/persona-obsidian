/**
 * Jest test setup file
 * This file runs before each test suite
 */

// Global test utilities
global.console = {
  ...console,
  // Suppress console errors in tests unless debugging
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock timers for testing time-dependent code
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});
