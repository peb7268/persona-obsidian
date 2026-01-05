# Persona - AI-Powered Obsidian Workflow

A sophisticated personal knowledge management system with AI agent automation for Obsidian.

## What is Persona?

Persona is a framework that adds AI-powered agents to your Obsidian vault. These agents:

- **Morning Briefings**: Get daily summaries and task prioritization
- **Research Automation**: Mark questions with `[?]` and agents research answers overnight
- **Project Management**: Track progress across multiple projects
- **Evening Summaries**: Automated end-of-day recaps

## Features

- **Daily Note Workflow**: Structured templates for daily, weekly, monthly, and quarterly notes
- **Agent System**: Configurable AI agents (assistant, researcher, project-manager) run on schedules
- **Multi-Provider Support**: Claude, Gemini, or Jules as your AI backbone
- **Business Contexts**: Run different agent configurations for personal vs work use cases
- **Obsidian Plugin**: Native integration with status bar, commands, and research processing

## Quick Start

1. Clone this repository into your Obsidian vault
2. Install required plugins (see [SETUP.md](SETUP.md))
3. Configure your AI provider in `Projects/Persona/config/env.md`
4. Build the Persona plugin
5. Create your first daily note

## Required Plugins

| Plugin | Purpose |
|--------|---------|
| Dataview | Dynamic queries and tables |
| Templater | Template automation |
| QuickAdd | Rapid note creation |
| Journals | Calendar views |
| Persona | Agent integration (included) |

## Documentation

- [SETUP.md](SETUP.md) - Detailed installation guide
- [Projects/Persona/AGENTS.md](Projects/Persona/AGENTS.md) - Agent system architecture
- [Projects/Persona/CLAUDE.md](Projects/Persona/CLAUDE.md) - Claude Code integration

## Repository Structure

```
.
├── .obsidian/              # Obsidian configuration
│   └── plugins/
│       └── persona/        # Persona plugin source
├── Projects/
│   └── Persona/            # Agent system
│       ├── agents/         # Agent definitions
│       ├── config/         # Configuration
│       ├── instances/      # Business contexts
│       ├── scripts/        # Execution scripts
│       └── templates/      # Agent templates
├── Resources/
│   └── General/
│       ├── Templates/      # Note templates
│       └── Embeds/         # Agent output sections
├── Home.md                 # Main dashboard
└── Mobile Home.md          # Mobile-optimized home
```

## Daily Note Format

The daily note template includes:

- Morning reflection and priorities
- Stream of thought (capture ideas throughout the day)
- Research questions (mark with `[?]` for agent processing)
- Business sections (embedded from agent outputs)
- Task tracking with dataview queries

## Agent System

Agents run on configurable schedules and write to embed files that appear in your daily notes:

```
5:15 AM  - Assistant: Morning briefing
6:30 AM  - Researcher: Answer [?] questions
7:15 AM  - Project Manager: Status updates
5:15 PM  - Assistant: Evening summary
```

## Configuration Files

After cloning, copy these template files and configure:

| Template | Target | Purpose |
|----------|--------|---------|
| `config/env.md.template` | `config/env.md` | AI provider settings |
| `.obsidian/plugins/persona/data.json.template` | `data.json` | Plugin config |
| `.obsidian/plugins/quickadd/data.json.template` | `data.json` | QuickAdd config |

## License

MIT License - See individual plugin licenses for third-party components.
