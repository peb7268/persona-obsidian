# Persona Plugin Testing Guide

This guide explains how to test the Persona Obsidian plugin in a headless environment, perfect for development in Claude Code or CI/CD pipelines.

## Table of Contents

- [Quick Start](#quick-start)
- [Testing Architecture](#testing-architecture)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Organization](#test-organization)
- [Mocking Obsidian API](#mocking-obsidian-api)
- [Coverage Reports](#coverage-reports)
- [Continuous Integration](#continuous-integration)
- [Best Practices](#best-practices)

## Quick Start

### Installation

Install testing dependencies:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Testing Architecture

### Framework Stack

- **Test Runner**: Jest 29.7+
- **Test Environment**: jest-environment-obsidian
- **TypeScript Support**: ts-jest
- **Coverage**: Istanbul (built into Jest)

### Why jest-environment-obsidian?

The Obsidian module is closed-source and cannot be imported in a standard Node.js environment. The `jest-environment-obsidian` package provides:

- Automatic shimming of Obsidian module imports
- Mock implementations of core Obsidian classes
- Seamless integration with Jest's testing framework

### Directory Structure

```
.obsidian/plugins/persona/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts              # Global test configuration
│   │   └── mocks/
│   │       └── obsidian.ts       # Mock Obsidian API implementations
│   ├── services/
│   │   ├── __tests__/
│   │   │   ├── SyntaxParser.test.ts
│   │   │   └── DuplicateDetector.test.ts
│   │   └── *.ts
│   └── ui/
│       ├── __tests__/
│       │   └── StatusBar.test.ts
│       └── *.ts
├── jest.config.js                # Jest configuration
└── coverage/                     # Generated coverage reports
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (re-runs tests on file changes)

```bash
npm run test:watch
```

### Run Specific Test Suite

```bash
# Run only service tests
npm run test:services

# Run only UI tests
npm run test:ui
```

### Run a Single Test File

```bash
npm test -- SyntaxParser.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should parse"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Update Snapshots

```bash
npm test -- --updateSnapshot
```

## Writing Tests

### Test File Naming Convention

- Place tests next to source files in `__tests__/` directory
- Name test files: `<SourceFile>.test.ts`
- Example: `src/services/__tests__/SyntaxParser.test.ts` tests `src/services/SyntaxParser.ts`

### Basic Test Structure

```typescript
import { SomeService } from '../SomeService';

describe('SomeService', () => {
  let service: SomeService;

  beforeEach(() => {
    // Setup before each test
    service = new SomeService();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });

  describe('someMethod', () => {
    it('should do something', () => {
      const result = service.someMethod('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      const result = service.someMethod('');
      expect(result).toBeNull();
    });
  });
});
```

### Testing Services with Obsidian Dependencies

Services that use Obsidian classes (App, Vault, TFile, etc.) need mocked instances:

```typescript
import { DuplicateDetector } from '../DuplicateDetector';
import { createMockApp, createMockTFile } from '../../__tests__/mocks/obsidian';

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;
  let mockApp: MockApp;

  beforeEach(() => {
    mockApp = createMockApp();
    const settings = {
      zettelkastenPath: 'Resources/Zettlekasten',
      duplicateThreshold: 70,
      // ... other settings
    };

    detector = new DuplicateDetector(mockApp as any, settings);
  });

  it('should find duplicates', async () => {
    // Setup mock vault structure
    const mockFolder = createMockTFolder('Resources/Zettlekasten');
    const mockFile = createMockTFile('Resources/Zettlekasten/Test.md');
    mockFolder.children = [mockFile];

    mockApp.vault.getAbstractFileByPath = jest.fn(() => mockFolder);

    // Test the service
    const duplicates = await detector.findDuplicates('Test');

    expect(duplicates.length).toBeGreaterThan(0);
  });
});
```

### Testing UI Components

UI components interact with DOM elements. Use mock HTML elements:

```typescript
import { StatusBarManager } from '../StatusBar';
import { MockHTMLElement } from '../../__tests__/mocks/obsidian';

describe('StatusBarManager', () => {
  let statusBar: StatusBarManager;
  let mockEl: MockHTMLElement;

  beforeEach(() => {
    mockEl = new MockHTMLElement();
    const settings = { business: 'TestBusiness', /* ... */ };
    statusBar = new StatusBarManager(mockEl as any, settings);
  });

  it('should display business name', () => {
    statusBar.setReady();
    expect(mockEl.setText).toHaveBeenCalledWith('Persona: TestBusiness');
  });
});
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});

it('should handle promises', () => {
  return service.asyncMethod().then(result => {
    expect(result).toBeDefined();
  });
});
```

### Testing Errors

```typescript
it('should throw error for invalid input', () => {
  expect(() => {
    service.methodThatThrows('bad');
  }).toThrow('Expected error message');
});

it('should handle rejected promises', async () => {
  await expect(service.asyncMethodThatFails()).rejects.toThrow('Error');
});
```

### Jest Matchers

Common matchers:

```typescript
// Equality
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3);         // Floating point

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith(arg1, arg2);
```

## Test Organization

### Group Related Tests

Use `describe` blocks to organize tests:

```typescript
describe('UserService', () => {
  describe('authentication', () => {
    it('should login user', () => { /* ... */ });
    it('should logout user', () => { /* ... */ });
  });

  describe('profile management', () => {
    it('should update profile', () => { /* ... */ });
    it('should delete profile', () => { /* ... */ });
  });
});
```

### Test Lifecycle Hooks

```typescript
beforeAll(() => {
  // Runs once before all tests in this file
});

beforeEach(() => {
  // Runs before each test
});

afterEach(() => {
  // Runs after each test
});

afterAll(() => {
  // Runs once after all tests in this file
});
```

### Skipping Tests

```typescript
it.skip('should do something', () => {
  // This test will be skipped
});

describe.skip('Feature', () => {
  // All tests in this block will be skipped
});
```

### Focusing Tests

```typescript
it.only('should run only this test', () => {
  // Only this test will run
});

describe.only('Feature', () => {
  // Only tests in this block will run
});
```

## Mocking Obsidian API

### Available Mock Classes

The `src/__tests__/mocks/obsidian.ts` file provides:

- `MockApp` - Mock Obsidian App
- `MockWorkspace` - Mock Workspace
- `MockVault` - Mock Vault
- `MockPlugin` - Mock Plugin base class
- `MockModal` - Mock Modal dialog
- `MockHTMLElement` - Mock DOM elements
- `MockTFile` - Mock file objects
- `MockTFolder` - Mock folder objects
- `MockNotice` - Mock notification
- `MockSetting` - Mock settings UI

### Factory Functions

```typescript
import {
  createMockApp,
  createMockPlugin,
  createMockTFile,
  createMockTFolder,
} from '../__tests__/mocks/obsidian';

const app = createMockApp();
const plugin = createMockPlugin(app);
const file = createMockTFile('path/to/file.md');
const folder = createMockTFolder('path/to/folder');
```

### Customizing Mock Behavior

```typescript
const mockApp = createMockApp();

// Override specific methods
mockApp.vault.read = jest.fn().mockResolvedValue('file content');
mockApp.vault.getMarkdownFiles = jest.fn().mockReturnValue([
  createMockTFile('note1.md'),
  createMockTFile('note2.md'),
]);

// Verify method calls
expect(mockApp.vault.read).toHaveBeenCalledWith(expectedFile);
expect(mockApp.vault.read).toHaveBeenCalledTimes(1);
```

### Creating Mock Vault Structure

```typescript
const mockRootFolder = createMockTFolder('vault');
const mockSubFolder = createMockTFolder('vault/notes');
const mockFile1 = createMockTFile('vault/notes/note1.md');
const mockFile2 = createMockTFile('vault/notes/note2.md');

mockSubFolder.children = [mockFile1, mockFile2];
mockRootFolder.children = [mockSubFolder];

mockApp.vault.getAbstractFileByPath = jest.fn((path) => {
  if (path === 'vault') return mockRootFolder;
  if (path === 'vault/notes') return mockSubFolder;
  return null;
});
```

## Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

### View Coverage Report

After running coverage, open `coverage/index.html` in a browser to see detailed reports.

### Coverage Thresholds

The project enforces minimum coverage thresholds (configured in `jest.config.js`):

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Tests will fail if coverage drops below these thresholds.

### Coverage in CI

GitHub Actions automatically generates and uploads coverage reports. You can view coverage trends over time in the Actions tab.

## Continuous Integration

### GitHub Actions Workflow

Tests run automatically on:

- Push to any branch
- Pull requests
- Manual workflow dispatch

### CI Configuration

See `.github/workflows/test.yml` for the full configuration.

### Running Tests Locally Like CI

```bash
# Run the same commands as CI
npm install
npm run build  # Verify TypeScript compilation
npm test       # Run all tests
npm run test:coverage  # Generate coverage
```

## Best Practices

### 1. Test Behavior, Not Implementation

**Good:**
```typescript
it('should display running status', () => {
  statusBar.setRunning('agent');
  expect(statusBar.isRunning()).toBe(true);
});
```

**Bad:**
```typescript
it('should set internal flag', () => {
  statusBar.setRunning('agent');
  expect(statusBar['_isRunning']).toBe(true);  // Testing private implementation
});
```

### 2. Keep Tests Independent

Each test should be able to run in isolation:

```typescript
// Good - each test sets up its own data
beforeEach(() => {
  service = new Service();
});

it('test 1', () => {
  const result = service.method();
  expect(result).toBe('expected');
});

it('test 2', () => {
  const result = service.method();
  expect(result).toBe('expected');
});
```

### 3. Use Descriptive Test Names

```typescript
// Good
it('should return empty array when no files match pattern', () => { /* ... */ });

// Bad
it('test1', () => { /* ... */ });
```

### 4. Test Edge Cases

```typescript
describe('parseInput', () => {
  it('should handle valid input', () => { /* ... */ });
  it('should handle empty string', () => { /* ... */ });
  it('should handle null input', () => { /* ... */ });
  it('should handle undefined input', () => { /* ... */ });
  it('should handle very long input', () => { /* ... */ });
  it('should handle special characters', () => { /* ... */ });
});
```

### 5. One Assertion Per Test (Generally)

```typescript
// Good
it('should return correct title', () => {
  const result = parser.extractTitle(content);
  expect(result).toBe('Expected Title');
});

it('should trim whitespace from title', () => {
  const result = parser.extractTitle('  Title  ');
  expect(result).toBe('Title');
});

// Sometimes multiple related assertions are OK
it('should parse complete match object', () => {
  const result = parser.parse(content)[0];
  expect(result.type).toBe('research-question');
  expect(result.content).toBe('Question text');
  expect(result.line).toBe(1);
});
```

### 6. Mock External Dependencies

```typescript
// Good - mock file system access
mockApp.vault.read = jest.fn().mockResolvedValue('content');

// Bad - actually read from disk
const content = await app.vault.read(file);
```

### 7. Use Setup and Teardown

```typescript
describe('Service', () => {
  let service: Service;
  let mockDependency: MockDependency;

  beforeEach(() => {
    mockDependency = new MockDependency();
    service = new Service(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ... tests
});
```

## Troubleshooting

### TypeScript Errors in Tests

If you see TypeScript errors about missing types:

```bash
npm install --save-dev @types/jest
```

### Mock Not Working

Make sure you're using `jest.fn()` not `vi.fn()` (which is for Vitest):

```typescript
// Correct
mockApp.vault.read = jest.fn();

// Wrong
mockApp.vault.read = vi.fn();
```

### Tests Hanging

If tests hang, you might have async code without proper cleanup:

```typescript
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});
```

### Coverage Not Updating

Delete the coverage directory and regenerate:

```bash
rm -rf coverage
npm run test:coverage
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [jest-environment-obsidian](https://github.com/obsidian-community/jest-environment-obsidian)
- [Obsidian Plugin Development](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Getting Help

- Check existing test files for examples
- Review the mock implementations in `src/__tests__/mocks/obsidian.ts`
- Run tests in verbose mode: `npm test -- --verbose`
- Use watch mode during development: `npm run test:watch`
