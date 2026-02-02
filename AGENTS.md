# AGENTS.md - Obsidian Vault System

Personal knowledge management vault built on Obsidian with sophisticated organizational structure for notes, learning, projects, and daily workflows.

## Architecture

```
Main/
├── Resources/                  # Main content hub
│   ├── Agenda/                # Time-based organization
│   │   ├── Daily/             # Daily notes (YYYY-MM-DD.md)
│   │   ├── Weekly/            # Weekly reviews
│   │   ├── Monthly/           # Monthly planning
│   │   └── Tasks/             # Task aggregation
│   ├── Learning/              # Educational content
│   │   ├── Books/             # Book notes and tracking
│   │   ├── Articles/          # Article summaries
│   │   └── Courses/           # Course materials
│   ├── Professional/          # Work content
│   ├── General/               # Shared utilities
│   │   ├── Templates/         # Note templates
│   │   ├── Embeds/            # Embedded sections
│   │   └── Whisper/           # Voice recordings
│   ├── People/                # CRM-style contacts
│   └── Zettlekasten/          # Atomic knowledge notes
├── Projects/                   # Active projects
│   ├── Azienda/               # Business projects
│   │   ├── MHM/               # Mile High Marketing
│   │   └── PersonalMCO/       # Personal operations
│   ├── Persona/               # Agent system (see Persona/AGENTS.md)
│   └── Momentum/              # Personal projects
├── Archive/                    # Historical content
└── .obsidian/                  # Obsidian configuration
    └── plugins/persona/        # Agent system plugin
```

## Note Types

| Type | Location | Format |
|------|----------|--------|
| Daily Notes | `Resources/Agenda/Daily/` | `YYYY-MM-DD.md` |
| Meeting Notes | `Resources/Professional/Meetings/` | `YYYY-MM-DD - Subject.md` |
| Person Notes | `Resources/People/` | `First Last.md` |
| Zettelkasten | `Resources/Zettlekasten/` | Descriptive title |
| Templates | `Resources/General/Templates/` | `Template-Name.md` |

## Obsidian Plugins

| Plugin | Purpose |
|--------|---------|
| Dataview | Dynamic queries and tables |
| Templater | Template automation |
| QuickAdd | Rapid content creation |
| Journals | Calendar views |
| Smart Connections | AI-powered linking |
| Whisper | Voice transcription |
| Persona | Agent system integration |

## Workflow Systems

### Daily Notes
- Format: `YYYY-MM-DD.md`
- Location: `Resources/Agenda/Daily/`
- Front matter: metadata (lifting, cardio tracking)
- Includes: tasks, meetings, reflections, research questions

### Research Questions
Use `[?]` markers in daily notes:
```markdown
* Working on pipeline [?] What are best practices for B2B outreach?
```
The Persona researcher agent processes these automatically.

### Task Management
- High priority: ⏫ emoji
- Aggregated via Dataview queries
- Synced with TickTick

### Meeting Notes
Three-parameter system:
- Directory: Ad-Hoc, Leadership, Scrum
- Type: Discussion, Planning, 1to1
- Subject: MongoDB-RCA, AI-Strategy

## Linking Patterns

- WikiLinks: `[[Note Name]]` for internal links
- Tags: Hierarchical (e.g., `#project/mhm`)
- Embeds: `![[Embed-File]]` for transclusion

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `Resources/General/Embeds/` | Agent output sections |
| `Resources/General/Templates/` | Note templates |
| `Projects/Azienda/` | Business documentation |
| `Projects/Persona/` | Agent system (separate AGENTS.md) |

## Integration Points

| Tool | Integration |
|------|-------------|
| Raycast | Quick access, AI |
| TickTick | Task sync |
| Kindle | Reading notes |
| LeetCode API | Progress tracking |
| Whisper | Voice capture |

## File Naming Conventions

```
Daily:    YYYY-MM-DD.md
Meeting:  YYYY-MM-DD - Meeting Subject.md
Person:   First Last.md
Template: Template-Name.md
Embed:    Business-Section.md
```

## Testing

See `Projects/Persona/AGENTS.md` for full test harness documentation.

```bash
cd .obsidian/plugins/persona

# Run all tests (TypeScript + Python)
npm run test:all

# Run and save artifacts
npm run test:all:save

# Validate test manifest
npm run test:manifest
```

**Test Manifest:** All test files must be registered in `test-manifest.json`. CI fails if manifest doesn't match discovered tests.
