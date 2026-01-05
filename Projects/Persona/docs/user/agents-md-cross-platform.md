# AGENTS.md Cross-Platform Guide

## Overview

Persona now uses the **AGENTS.md** standard for agent documentation, enabling cross-platform compatibility with 20+ AI coding tools. This guide explains how AGENTS.md works and how it enables provider-agnostic agent execution.

## What is AGENTS.md?

AGENTS.md is an open standard (part of the Linux Foundation's Agentic AI Foundation) for providing AI-specific project instructions. Think of it as "a README for AI agents" - it tells any AI tool how to work with your codebase.

### Key Characteristics

- **Free-form Markdown**: No required schema, just semantic headings
- **Hierarchical**: Nearest file in directory tree takes precedence
- **Concise**: Recommended 150 lines or less
- **Universal**: Supported by 20+ AI platforms

## Persona's AGENTS.md Hierarchy

```
Persona/
├── AGENTS.md                    # Root: System architecture, commands
├── CLAUDE.md                    # Claude-specific enforcement rules
├── instances/
│   ├── MHM/
│   │   ├── AGENTS.md           # Business context, agent roster
│   │   └── agents/
│   │       └── AGENTS.md       # Agent execution guide
│   └── PersonalMCO/
│       ├── AGENTS.md           # Business context
│       └── agents/
│           └── AGENTS.md       # Agent execution guide
└── templates/
    └── agents/
        └── AGENTS.md           # Template documentation
```

### How Tools Read the Hierarchy

1. AI tool starts in working directory
2. Reads nearest AGENTS.md first
3. May also read parent AGENTS.md files for context
4. Tool-specific files (like CLAUDE.md) provide enforcement rules

## Supported AI Platforms

| Platform | AGENTS.md Support | Notes |
|----------|-------------------|-------|
| Claude Code | Via CLAUDE.md reference | Primary development tool |
| Cursor IDE | Native | Popular AI code editor |
| GitHub Copilot | Native (Aug 2025+) | Integrated in VS Code |
| Google Gemini CLI | Native | Also reads AGENTS.md directly |
| Google Jules | Native | Async coding agent |
| OpenAI Codex | Supported | Via configuration |
| Aider | Via .aider.conf.yml | Terminal AI pair programmer |
| Windsurf | Native | AI-first IDE |
| Zed Editor | Native | Fast, modern editor |
| Devin | Supported | Autonomous AI engineer |
| RooCode | Native | VS Code extension |

## File Responsibilities

### `AGENTS.md` (Root)

Contains provider-agnostic documentation:
- System architecture overview
- Available commands
- Agent definition format
- Safety rules
- State file locations

**Any AI tool can read this to understand Persona.**

### `CLAUDE.md` (Root)

Contains Claude Code-specific rules:
- Required reading order
- Critical safety enforcement
- Environment variables
- Output patterns
- Validation checklists

**Only read by Claude Code. Other tools ignore it.**

### Instance `AGENTS.md`

Contains business-specific context:
- Agent roster and schedules
- Key file paths
- Business rules
- Instance-specific configurations

### Agent-level `AGENTS.md`

Contains execution instructions:
- Pre-execution checklist
- Output locations
- Communication protocol
- Progress tracking format

## Cross-Platform Workflow

### Scenario: Team uses multiple tools

```
Developer A: Uses Claude Code
Developer B: Uses Cursor IDE
Developer C: Uses GitHub Copilot
```

**All three read the same AGENTS.md files**, ensuring:
- Consistent understanding of project structure
- Same safety rules applied
- Uniform output locations
- Compatible agent definitions

### Scenario: Switching providers

To run an agent with a different provider:

1. Edit agent definition, add `provider: gemini`:
   ```yaml
   ---
   name: researcher
   provider: gemini  # Override default
   model: opus
   ---
   ```

2. Run normally:
   ```bash
   ./scripts/run-agent.sh MHM researcher process-research-queue
   ```

3. The provider abstraction handles CLI differences automatically.

## Best Practices

### Writing Effective AGENTS.md

1. **Put commands first** - Executable instructions with flags
2. **Use code examples** - One snippet beats three paragraphs
3. **Keep it brief** - Under 150 lines per file
4. **Link, don't duplicate** - Reference existing docs
5. **Update iteratively** - Add clarifications as issues arise

### Maintaining Compatibility

1. **Don't use tool-specific syntax** in AGENTS.md
2. **Put enforcement rules** in tool-specific files (CLAUDE.md)
3. **Test with multiple tools** periodically
4. **Document provider differences** in instance AGENTS.md

## Troubleshooting

### Tool doesn't read AGENTS.md

- Check tool documentation for AGENTS.md support
- Some tools require explicit configuration
- Aider: Add `read: AGENTS.md` to `.aider.conf.yml`
- Gemini: Uses AGENTS.md by default

### Conflicting instructions

- Nearest AGENTS.md takes precedence
- Tool-specific files (CLAUDE.md) override for that tool
- Check hierarchy order: agent > instance > root

### Provider not recognized

- Verify provider is configured in `config/env.md`
- Check provider path is correct
- Ensure CLI tool is installed and executable

## References

- [AGENTS.md Official Site](https://agents.md/)
- [GitHub: agentsmd/agents.md](https://github.com/agentsmd/agents.md)
- [Linux Foundation Agentic AI Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [InfoQ: AGENTS.md Emerges as Open Standard](https://www.infoq.com/news/2025/08/agents-md/)
