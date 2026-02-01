/**
 * Jest test setup file
 * This file runs before each test suite
 */

// Polyfill MouseEvent for tests that use click handlers
// (Jest's node environment doesn't provide browser globals)
global.MouseEvent = class MouseEvent extends Event {
  clientX: number;
  clientY: number;
  button: number;

  constructor(type: string, eventInitDict?: MouseEventInit) {
    super(type, eventInitDict);
    this.clientX = eventInitDict?.clientX ?? 0;
    this.clientY = eventInitDict?.clientY ?? 0;
    this.button = eventInitDict?.button ?? 0;
  }
} as any;

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
