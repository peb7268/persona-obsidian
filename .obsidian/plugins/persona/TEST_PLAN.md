# Persona Plugin Test Plan

This document outlines the comprehensive testing strategy for the Persona Obsidian plugin, with a focus on headless testing suitable for Claude Code development.

## Testing Objectives

1. **Ensure Core Functionality**: Verify all plugin features work correctly
2. **Enable Rapid Iteration**: Support quick development cycles in Claude Code
3. **Prevent Regressions**: Catch breaking changes before deployment
4. **Maintain Code Quality**: Enforce coverage thresholds and best practices
5. **Separate Concerns**: Test UI and backend logic independently

## Test Types

### 1. Unit Tests
**Purpose**: Test individual functions and classes in isolation

**Scope**:
- Pure utility functions (SyntaxParser, string manipulation)
- Business logic services (DuplicateDetector, ExtractionService)
- Individual UI components (StatusBarManager, Modal classes)

**Tools**: Jest with Obsidian API mocks

**Coverage Target**: 80%+ for units with business logic

### 2. Integration Tests
**Purpose**: Test how components work together

**Scope**:
- Service interactions with mocked Obsidian API
- Plugin lifecycle (load, unload, settings)
- Command registration and execution
- File watcher interactions

**Tools**: Jest with comprehensive mocks

**Coverage Target**: 70%+ for integration scenarios

### 3. E2E Tests (Future)
**Purpose**: Test complete user workflows

**Scope**:
- Agent execution flows
- Note extraction workflows
- Status bar updates during agent runs

**Tools**: TBD (Playwright with Obsidian or manual QA)

**Status**: Not implemented yet (requires Obsidian automation)

## Test Coverage Matrix

### Services Layer

#### SyntaxParser (src/services/SyntaxParser.ts)
**Status**: ✅ Fully Tested

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Parse basic `[?]` syntax | Should extract question from `[?] Question` | HIGH | ✅ |
| Parse multiple questions | Should find all `[?]` markers in document | HIGH | ✅ |
| Handle markdown lists | Should parse `- [?] Question` format | HIGH | ✅ |
| Handle indentation | Should parse indented list items | MEDIUM | ✅ |
| Ignore invalid syntax | Should not match `[?]` in middle of line | HIGH | ✅ |
| Count questions | Should return correct count | MEDIUM | ✅ |
| Extract question strings | Should return array of question text | MEDIUM | ✅ |
| Handle empty content | Should return empty array | LOW | ✅ |
| Preserve line numbers | Should track original line numbers | MEDIUM | ✅ |

#### DuplicateDetector (src/services/DuplicateDetector.ts)
**Status**: ✅ Fully Tested

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Title extraction | Should extract from markdown heading | HIGH | ✅ |
| Title from first line | Should use first line if no heading | HIGH | ✅ |
| Tag extraction | Should find hashtags in content | MEDIUM | ✅ |
| Find duplicates | Should find similar titled notes | HIGH | ✅ |
| Similarity threshold | Should respect threshold setting | HIGH | ✅ |
| Skip index files | Should not match index.md files | MEDIUM | ✅ |
| Related subjects | Should find matching subject folders | HIGH | ✅ |
| Subject folder listing | Should list all subject folders | MEDIUM | ✅ |
| Recursive search | Should search nested folders | HIGH | ✅ |
| Empty vault handling | Should handle missing folders | MEDIUM | ✅ |

#### ExecutionService (src/services/ExecutionService.ts)
**Status**: ⏳ Pending

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| List instances | Should read persona directories | HIGH | ⏳ |
| Spawn agent process | Should execute bash command | HIGH | ⏳ |
| Prevent duplicates | Should not spawn if already running | HIGH | ⏳ |
| Read progress | Should parse progress.json | HIGH | ⏳ |
| Handle errors | Should capture stderr | HIGH | ⏳ |
| Track PIDs | Should maintain running process map | MEDIUM | ⏳ |
| Clean up zombies | Should kill stale processes | MEDIUM | ⏳ |

#### ExtractionService (src/services/ExtractionService.ts)
**Status**: ⏳ Pending

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Analyze content | Should detect note-worthy content | HIGH | ⏳ |
| Suggest titles | Should generate appropriate titles | HIGH | ⏳ |
| Detect duplicates | Should use DuplicateDetector | HIGH | ⏳ |
| Suggest location | Should recommend note vs subject folder | MEDIUM | ⏳ |
| Extract metadata | Should identify tags and links | MEDIUM | ⏳ |

#### TaskSyntaxService (src/services/TaskSyntaxService.ts)
**Status**: ⏳ Pending

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Enforce syntax | Should validate task format | HIGH | ⏳ |
| Fix common issues | Should auto-correct known problems | MEDIUM | ⏳ |
| Report violations | Should list syntax errors | MEDIUM | ⏳ |

### UI Layer

#### StatusBarManager (src/ui/StatusBar.ts)
**Status**: ✅ Fully Tested

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Initialize | Should show business name on load | HIGH | ✅ |
| Set ready state | Should display default state | HIGH | ✅ |
| Set running state | Should show agent name and spinner | HIGH | ✅ |
| Show progress | Should display question count | HIGH | ✅ |
| Show elapsed time | Should format time correctly | MEDIUM | ✅ |
| Set error state | Should display error message | HIGH | ✅ |
| Click handler | Should register and fire callbacks | MEDIUM | ✅ |
| Update business | Should update displayed business | MEDIUM | ✅ |

#### AgentModal (src/ui/AgentModal.ts)
**Status**: ⏳ Pending

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Display instances | Should list available personas | HIGH | ⏳ |
| Select instance | Should update UI on selection | HIGH | ⏳ |
| List agents | Should show available agent types | HIGH | ⏳ |
| Run agent button | Should trigger execution | HIGH | ⏳ |
| Show validation | Should prevent invalid runs | MEDIUM | ⏳ |
| Close on success | Should close after starting agent | LOW | ⏳ |

#### ExtractNoteModal (src/ui/ExtractNoteModal.ts)
**Status**: ⏳ Pending

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Show suggestions | Should display duplicate warnings | HIGH | ⏳ |
| Title input | Should allow custom title | HIGH | ⏳ |
| Location picker | Should show folder suggestions | HIGH | ⏳ |
| Create note | Should generate file with template | HIGH | ⏳ |
| Handle conflicts | Should warn on duplicate creation | MEDIUM | ⏳ |

#### LogViewerModal (src/ui/LogViewerModal.ts)
**Status**: ⏳ Pending

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Load logs | Should read log files | HIGH | ⏳ |
| Display logs | Should format with syntax highlighting | MEDIUM | ⏳ |
| Auto-scroll | Should scroll to bottom on update | LOW | ⏳ |
| Filter logs | Should allow filtering by level | MEDIUM | ⏳ |

#### SettingsTab (src/ui/SettingsTab.ts)
**Status**: ⏳ Pending

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Display settings | Should show all configuration options | HIGH | ⏳ |
| Save settings | Should persist to data.json | HIGH | ⏳ |
| Validate paths | Should check directory existence | MEDIUM | ⏳ |
| Reset defaults | Should restore default values | LOW | ⏳ |

### Plugin Core (src/main.ts)
**Status**: ⏳ Pending

| Feature | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| Plugin loads | Should register all commands | HIGH | ⏳ |
| Settings load | Should read data.json | HIGH | ⏳ |
| Ribbon icon | Should create if enabled | MEDIUM | ⏳ |
| Status bar | Should create if enabled | MEDIUM | ⏳ |
| File watcher | Should trigger on save if enabled | HIGH | ⏳ |
| Polling | Should check progress periodically | MEDIUM | ⏳ |
| Commands | Should register all palette commands | HIGH | ⏳ |
| Unload | Should clean up resources | MEDIUM | ⏳ |

## Test Execution Strategy

### Local Development (Claude Code)

```bash
# Watch mode for rapid iteration
npm run test:watch

# Run specific test suite while working
npm run test:services
npm run test:ui

# Full test run before commit
npm test
npm run test:coverage
```

### Continuous Integration

```bash
# CI pipeline (GitHub Actions)
1. Install dependencies
2. Run TypeScript compilation check
3. Run all tests
4. Generate coverage report
5. Fail if coverage < 70%
```

### Pre-Release

```bash
# Comprehensive testing
1. Run full test suite: npm test
2. Generate coverage: npm run test:coverage
3. Manual QA in Obsidian
4. Test on sample vault
5. Verify all commands work
```

## Test Data Strategy

### Mock Data Locations

1. **Inline Mocks**: Small, test-specific data defined in test files
2. **Mock Factories**: `src/__tests__/mocks/obsidian.ts` for Obsidian API
3. **Fixture Files** (Future): `src/__tests__/fixtures/` for complex test data

### Sample Vault Structure (for Integration Tests)

```
test-vault/
├── Resources/
│   └── Zettlekasten/
│       ├── Note 1.md
│       ├── Note 2.md
│       └── Subject Folder/
│           ├── index.md
│           └── Nested Note.md
└── Projects/
    └── Persona/
        ├── PersonalMCO/
        │   └── agents/
        └── BusinessX/
            └── agents/
```

## Coverage Targets

### Minimum Acceptable Coverage
- **Overall**: 70%
- **Critical paths**: 90% (agent execution, file creation)
- **UI components**: 60% (harder to test)
- **Pure utilities**: 95% (easy to test, high impact)

### Current Coverage (Update as tests are written)

```
✅ SyntaxParser:          100%
✅ DuplicateDetector:     95%
✅ StatusBarManager:      100%
⏳ ExecutionService:      0%
⏳ ExtractionService:     0%
⏳ TaskSyntaxService:     0%
⏳ AgentModal:            0%
⏳ ExtractNoteModal:      0%
⏳ LogViewerModal:        0%
⏳ SettingsTab:           0%
⏳ main.ts:               0%

Overall: ~30% (target: 70%)
```

## Testing Best Practices

### DO

✅ Test behavior, not implementation
✅ Use descriptive test names
✅ Keep tests independent
✅ Test edge cases and error conditions
✅ Mock external dependencies
✅ Use beforeEach/afterEach for setup/cleanup
✅ Aim for fast test execution
✅ Write tests before fixing bugs (TDD for bugs)

### DON'T

❌ Test private methods directly
❌ Rely on test execution order
❌ Make tests dependent on each other
❌ Skip tests without a comment
❌ Test implementation details
❌ Use actual file system or network calls
❌ Leave console.log in tests
❌ Commit failing tests

## Testing in Claude Code

### Advantages

1. **Headless Environment**: Tests run without Obsidian GUI
2. **Fast Iteration**: Quick feedback loop
3. **Automated Validation**: Catch issues immediately
4. **Coverage Tracking**: See what needs testing

### Workflow

1. Write feature code
2. Write tests in watch mode (`npm run test:watch`)
3. Verify coverage (`npm run test:coverage`)
4. Commit when tests pass and coverage is adequate

### Mock Obsidian API

Since Claude Code can't run Obsidian:
- Use `jest-environment-obsidian` for Obsidian module shimming
- Use custom mocks in `src/__tests__/mocks/obsidian.ts`
- Create mock vault structures as needed
- Test services and UI independently

## Roadmap

### Phase 1: Core Services (Current)
- ✅ SyntaxParser
- ✅ DuplicateDetector
- ✅ StatusBarManager
- ⏳ ExecutionService
- ⏳ ExtractionService

### Phase 2: UI Components
- ⏳ AgentModal
- ⏳ ExtractNoteModal
- ⏳ SettingsTab
- ⏳ LogViewerModal

### Phase 3: Integration
- ⏳ Plugin lifecycle
- ⏳ Command registration
- ⏳ Settings persistence
- ⏳ File watcher

### Phase 4: CI/CD
- ⏳ GitHub Actions workflow
- ⏳ Automated coverage reports
- ⏳ PR quality gates

### Phase 5: E2E (Future)
- ⏳ Playwright + Obsidian
- ⏳ Full workflow tests
- ⏳ Visual regression tests

## Appendix: Test Command Reference

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Run only service tests
npm run test:services

# Run only UI tests
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- SyntaxParser.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should parse"

# Update snapshots
npm test -- --updateSnapshot

# Verbose output
npm test -- --verbose

# Run tests with debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Clear Jest cache
npm test -- --clearCache
```

## Appendix: Mock Creation Guide

### Create Mock TFile

```typescript
import { createMockTFile } from '../../__tests__/mocks/obsidian';

const file = createMockTFile('path/to/file.md');
file.basename = 'file';
file.extension = 'md';
```

### Create Mock TFolder

```typescript
import { createMockTFolder, createMockTFile } from '../../__tests__/mocks/obsidian';

const folder = createMockTFolder('path/to/folder');
const file1 = createMockTFile('path/to/folder/note1.md');
const file2 = createMockTFile('path/to/folder/note2.md');

folder.children = [file1, file2];
```

### Mock Vault Operations

```typescript
import { createMockApp } from '../../__tests__/mocks/obsidian';

const mockApp = createMockApp();

// Mock reading a file
mockApp.vault.read = jest.fn().mockResolvedValue('file content');

// Mock getting files
mockApp.vault.getMarkdownFiles = jest.fn().mockReturnValue([
  createMockTFile('note1.md'),
  createMockTFile('note2.md'),
]);

// Mock path lookup
mockApp.vault.getAbstractFileByPath = jest.fn((path) => {
  if (path === 'existing/path') return createMockTFolder(path);
  return null;
});
```

## Conclusion

This test plan provides a comprehensive strategy for testing the Persona plugin in a headless environment. The focus is on:

1. **Unit testing** services and UI independently
2. **Mocking** the Obsidian API completely
3. **Rapid iteration** in Claude Code
4. **Coverage tracking** to ensure quality
5. **CI automation** for every commit

As you develop new features, refer to this plan and add tests following the established patterns. The testing infrastructure is now in place—the next step is to write tests for the remaining components.
