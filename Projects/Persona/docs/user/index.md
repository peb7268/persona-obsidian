# Persona User Documentation

## Overview

Persona is an agent factory that creates markdown-driven agents to run businesses. This documentation covers the provider-agnostic architecture and cross-platform capabilities.

## Guides

### [AGENTS.md Cross-Platform Guide](agents-md-cross-platform.md)

Learn how AGENTS.md enables cross-platform compatibility:
- What is AGENTS.md and why it matters
- Persona's AGENTS.md hierarchy
- Supported AI platforms (20+)
- Best practices for cross-platform compatibility

### [Provider Guide](provider-guide.md)

Configure and use different AI providers:
- Claude Code (default)
- Gemini CLI (large context)
- Jules (async tasks)
- Provider selection strategies
- Adding new providers

### [OpenSpec and Future Architecture](openspec-roadmap.md)

Understand the roadmap for Open Agent Specification:
- Current architecture (shell abstraction)
- Future TypeScript provider layer
- Open Agent Spec adoption plans
- A2A protocol integration
- Migration path

## Quick Start

### Run an agent with default provider (Claude)

```bash
./scripts/run-agent.sh MHM researcher process-research-queue
```

### Use a different provider

Edit agent definition:
```yaml
---
name: researcher
provider: gemini  # or: claude, jules
---
```

### Check available providers

```bash
grep "_path:" config/env.md
```

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTS.md Layer                          │
│  Cross-platform documentation for AI tools                  │
├─────────────────────────────────────────────────────────────┤
│                    providers.sh                             │
│  Shell-level provider abstraction                           │
├───────────────┬───────────────┬─────────────────────────────┤
│ Claude Code   │ Gemini CLI    │ Jules CLI                   │
│ (default)     │ (large ctx)   │ (async)                     │
└───────────────┴───────────────┴─────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Root system documentation |
| `CLAUDE.md` | Claude-specific enforcement |
| `scripts/providers.sh` | Provider abstraction library |
| `config/env.md` | Provider configuration |
| `instances/*/AGENTS.md` | Business-specific context |

## Need Help?

- Check the [Provider Guide](provider-guide.md) for configuration issues
- See [AGENTS.md Guide](agents-md-cross-platform.md) for cross-platform questions
- Review [OpenSpec Roadmap](openspec-roadmap.md) for architecture decisions
