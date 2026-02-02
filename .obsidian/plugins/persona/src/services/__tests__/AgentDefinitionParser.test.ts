import { AgentDefinitionParser, ParsedAgentDefinition } from '../AgentDefinitionParser';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('AgentDefinitionParser', () => {
  let parser: AgentDefinitionParser;

  beforeEach(() => {
    jest.clearAllMocks();
    parser = new AgentDefinitionParser();
  });

  describe('parseAgentFile', () => {
    it('should return null if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result).toBeNull();
    });

    it('should parse basic frontmatter', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Research specialist
tier: specialist
---

# Researcher Agent

Agent content here.
`);

      const result = parser.parseAgentFile('/test/researcher.md');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('researcher');
      expect(result!.role).toBe('Research specialist');
      expect(result!.tier).toBe('specialist');
    });

    it('should parse model field', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Researcher
tier: specialist
model: opus
---
`);

      const result = parser.parseAgentFile('/test/researcher.md');

      expect(result!.model).toBe('opus');
    });

    it('should parse provider field', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Researcher
tier: specialist
provider: gemini
---
`);

      const result = parser.parseAgentFile('/test/researcher.md');

      expect(result!.provider).toBe('gemini');
    });

    it('should parse priority field', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: assistant
role: Assistant
tier: core
priority: high
---
`);

      const result = parser.parseAgentFile('/test/assistant.md');

      expect(result!.priority).toBe('high');
    });

    it('should return null if no frontmatter', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`
# Agent without frontmatter

Just content, no YAML.
`);

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result).toBeNull();
    });

    it('should return null if frontmatter not closed', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: incomplete
role: Missing closing delimiter

Content without closing ---.
`);

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result).toBeNull();
    });

    it('should handle file read errors', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result).toBeNull();
    });

    it('should handle empty frontmatter', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---

---

Content only.
`);

      const result = parser.parseAgentFile('/test/agent.md');

      // Empty frontmatter with just newline is valid
      expect(result).not.toBeNull();
      expect(result!.name).toBe('');
      expect(result!.role).toBe('');
      expect(result!.tier).toBe('');
    });

    it('should handle frontmatter with extra whitespace', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name:   spaced-name
role:  Spaced role
tier: specialist
---
`);

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result!.name).toBe('spaced-name');
      expect(result!.role).toBe('Spaced role');
    });

    it('should ignore lines without colons', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
This is a comment
role: Researcher
---
`);

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result!.name).toBe('researcher');
      expect(result!.role).toBe('Researcher');
    });

    it('should handle values containing colons', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Research: Deep Analysis
tier: specialist
---
`);

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result!.role).toBe('Research: Deep Analysis');
    });
  });

  describe('getProviderOverride', () => {
    it('should return provider and model from agent definition', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Researcher
tier: specialist
provider: gemini
model: pro
---
`);

      const override = parser.getProviderOverride('/test/researcher.md');

      expect(override.provider).toBe('gemini');
      expect(override.model).toBe('pro');
    });

    it('should return undefined values if not specified', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Researcher
tier: specialist
---
`);

      const override = parser.getProviderOverride('/test/researcher.md');

      expect(override.provider).toBeUndefined();
      expect(override.model).toBeUndefined();
    });

    it('should return empty object if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const override = parser.getProviderOverride('/nonexistent.md');

      expect(override.provider).toBeUndefined();
      expect(override.model).toBeUndefined();
    });

    it('should return only provider if model not specified', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Researcher
tier: specialist
provider: jules
---
`);

      const override = parser.getProviderOverride('/test/researcher.md');

      expect(override.provider).toBe('jules');
      expect(override.model).toBeUndefined();
    });

    it('should return only model if provider not specified', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Researcher
tier: specialist
model: opus
---
`);

      const override = parser.getProviderOverride('/test/researcher.md');

      expect(override.provider).toBeUndefined();
      expect(override.model).toBe('opus');
    });
  });

  describe('buildAgentPath', () => {
    it('should build correct path', () => {
      const path = parser.buildAgentPath('/persona', 'MHM', 'researcher');

      expect(path).toBe('/persona/instances/MHM/agents/researcher.md');
    });

    it('should handle different persona roots', () => {
      const path = parser.buildAgentPath('/custom/path', 'TestBusiness', 'assistant');

      expect(path).toBe('/custom/path/instances/TestBusiness/agents/assistant.md');
    });

    it('should handle agent names with hyphens', () => {
      const path = parser.buildAgentPath('/persona', 'MHM', 'project-manager');

      expect(path).toBe('/persona/instances/MHM/agents/project-manager.md');
    });
  });

  describe('agentExists', () => {
    it('should return true if agent file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const exists = parser.agentExists('/persona', 'MHM', 'researcher');

      expect(exists).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(
        '/persona/instances/MHM/agents/researcher.md'
      );
    });

    it('should return false if agent file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const exists = parser.agentExists('/persona', 'MHM', 'nonexistent');

      expect(exists).toBe(false);
    });
  });

  describe('full agent definition parsing', () => {
    it('should parse complete agent definition', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Research specialist
tier: specialist
model: opus
provider: claude
priority: high
---

# Researcher Agent

## Role
Conducts deep research on various topics.

## Actions
- process-research-queue

## Tools
- Grep
- Read
- WebSearch
`);

      const result = parser.parseAgentFile('/test/researcher.md');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('researcher');
      expect(result!.role).toBe('Research specialist');
      expect(result!.tier).toBe('specialist');
      expect(result!.model).toBe('opus');
      expect(result!.provider).toBe('claude');
      expect(result!.priority).toBe('high');
    });

    it('should parse MHM assistant agent definition', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: assistant
role: Primary user interface and task orchestrator
tier: core
model: sonnet
---

# Assistant Agent

Core agent that interfaces with the user.
`);

      const result = parser.parseAgentFile('/test/assistant.md');

      expect(result!.name).toBe('assistant');
      expect(result!.role).toBe('Primary user interface and task orchestrator');
      expect(result!.tier).toBe('core');
      expect(result!.model).toBe('sonnet');
      expect(result!.provider).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle Windows-style line endings', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      // Note: The parser uses \n in regex, so Windows files would need to be normalized
      // This test documents current behavior - Windows line endings are not supported
      (fs.readFileSync as jest.Mock).mockReturnValue('---\r\nname: researcher\r\nrole: Test\r\ntier: specialist\r\n---\r\n');

      const result = parser.parseAgentFile('/test/agent.md');

      // Current behavior: Windows line endings not supported (returns null)
      // This is acceptable as most tools normalize line endings
      expect(result).toBeNull();
    });

    it('should handle frontmatter with --- in content', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Researcher
tier: specialist
---

# Agent

Some content with --- in the middle.

More content.
`);

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('researcher');
    });

    it('should handle unknown fields gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`---
name: researcher
role: Researcher
tier: specialist
unknown_field: some value
another_unknown: more stuff
---
`);

      const result = parser.parseAgentFile('/test/agent.md');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('researcher');
      // Unknown fields are ignored, not causing errors
    });
  });
});
