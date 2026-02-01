# Persona Obsidian Plugin

Run Persona AI agents directly from Obsidian with integrated status monitoring and note management.

## Features

- 🤖 **Agent Execution**: Run Persona agents on daily notes and research questions
- 📊 **Status Monitoring**: Real-time progress tracking in status bar
- 🔍 **Duplicate Detection**: Smart suggestions to avoid duplicate notes
- 📝 **Note Extraction**: Extract atomic notes from content
- 🔄 **Multi-Instance**: Switch between multiple business contexts
- ⚡ **Auto-Processing**: Automatic syntax enforcement and question detection

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Obsidian 1.5.0+

### Setup

```bash
# Navigate to plugin directory
cd .obsidian/plugins/persona

# Install dependencies
npm install

# Build plugin
npm run build

# Development mode (watch for changes)
npm run dev
```

### Testing

This plugin uses **headless testing** with Jest, allowing development and testing in environments like Claude Code without running Obsidian.

#### Quick Start

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Test Structure

- **Unit Tests**: Test individual services and components
- **Integration Tests**: Test component interactions
- **Mocked Obsidian API**: Full mock implementation for headless testing

See [TESTING.md](./TESTING.md) for comprehensive testing guide.

See [TEST_PLAN.md](./TEST_PLAN.md) for the complete test plan and coverage matrix.

#### Testing in Claude Code

The testing infrastructure is specifically designed for Claude Code:

1. **No Obsidian Required**: All tests use mocked Obsidian API
2. **Fast Feedback**: Watch mode for rapid iteration
3. **Coverage Tracking**: See what needs testing
4. **CI Integration**: Automated testing on every push

Example workflow:

```bash
# Start watch mode
npm run test:watch

# Make changes to code
# Tests auto-run and show results

# Check coverage when done
npm run test:coverage
```

### Project Structure

```
.obsidian/plugins/persona/
├── src/
│   ├── main.ts                    # Plugin entry point
│   ├── types.ts                   # Type definitions
│   ├── services/                  # Business logic
│   │   ├── ExecutionService.ts    # Agent execution
│   │   ├── DuplicateDetector.ts   # Duplicate detection
│   │   ├── ExtractionService.ts   # Note extraction
│   │   ├── SyntaxParser.ts        # Question syntax parsing
│   │   ├── TaskSyntaxService.ts   # Task syntax enforcement
│   │   └── __tests__/             # Service tests
│   ├── ui/                        # UI components
│   │   ├── StatusBar.ts           # Status bar manager
│   │   ├── AgentModal.ts          # Agent runner dialog
│   │   ├── ExtractNoteModal.ts    # Note extraction dialog
│   │   ├── LogViewerModal.ts      # Log viewer
│   │   ├── SettingsTab.ts         # Plugin settings
│   │   └── __tests__/             # UI tests
│   └── __tests__/
│       ├── setup.ts               # Test configuration
│       └── mocks/
│           └── obsidian.ts        # Obsidian API mocks
├── manifest.json                  # Plugin metadata
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── jest.config.js                 # Jest config
├── esbuild.config.mjs             # Build config
├── TESTING.md                     # Testing guide
├── TEST_PLAN.md                   # Test plan
└── README.md                      # This file
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Build in watch mode for development |
| `npm run build` | Production build with type checking |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:services` | Run only service tests |
| `npm run test:ui` | Run only UI tests |

### Building

```bash
# Development build (with watch)
npm run dev

# Production build
npm run build
```

The build process:
1. Runs TypeScript type checking
2. Bundles source files with esbuild
3. Outputs `main.js` in the plugin directory

### Configuration

Create `data.json` from `data.json.template`:

```json
{
  "personaRoot": "/path/to/vault/Projects/Persona",
  "business": "PersonalMCO",
  "showRibbonIcon": true,
  "showStatusBar": true,
  "autoProcessOnSave": true,
  "pollingEnabled": true,
  "pollingIntervalMinutes": 5
}
```

## Testing Philosophy

This plugin embraces **test-driven development** with a focus on:

1. **Headless Testing**: All tests run without Obsidian GUI
2. **Comprehensive Mocking**: Full Obsidian API mock implementation
3. **Rapid Iteration**: Watch mode for instant feedback
4. **Coverage Goals**: 70%+ coverage for all code
5. **CI Automation**: Tests run on every commit

### Why Headless Testing?

- ✅ **Claude Code Compatible**: Develop and test in any environment
- ✅ **Fast**: No GUI overhead
- ✅ **Reliable**: No UI flakiness
- ✅ **Automatable**: Perfect for CI/CD
- ✅ **Focused**: Test logic, not rendering

### Mock Obsidian API

The plugin includes comprehensive mocks in `src/__tests__/mocks/obsidian.ts`:

- `MockApp` - Obsidian app instance
- `MockVault` - Vault operations
- `MockWorkspace` - Workspace management
- `MockTFile` - File objects
- `MockTFolder` - Folder objects
- `MockModal` - Dialog modals
- `MockHTMLElement` - DOM elements
- And more...

Example usage:

```typescript
import { createMockApp, createMockTFile } from '../__tests__/mocks/obsidian';

const mockApp = createMockApp();
const mockFile = createMockTFile('note.md');

mockApp.vault.read = jest.fn().mockResolvedValue('content');
// Test your code with mocked Obsidian API
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass: `npm test`
5. Ensure coverage is adequate: `npm run test:coverage`
6. Submit a pull request

## CI/CD

GitHub Actions automatically:
- Runs tests on every push
- Generates coverage reports
- Builds the plugin
- Comments coverage on PRs

## Resources

- [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Jest Documentation](https://jestjs.io/)
- [jest-environment-obsidian](https://github.com/obsidian-community/jest-environment-obsidian)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## License

MIT

## Author

pbarrick
