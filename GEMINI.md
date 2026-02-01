# GEMINI.md - Gemini CLI Enforcement

> For cross-platform documentation, see [AGENTS.md](./AGENTS.md).

## Required Reading

Before any operation, understand the vault structure:
1. `AGENTS.md` - Vault architecture and conventions
2. `Projects/Persona/AGENTS.md` - Agent system (if working with agents)
3. `Resources/General/Templates/` - Available templates

## Gemini CLI Features

### Context Loading
Gemini CLI loads GEMINI.md files hierarchically:
1. Global: `~/.gemini/GEMINI.md`
2. Project/Ancestors: Current directory up to `.git` root
3. Subdirectories: Scans below current directory (respects `.gitignore`)

### Memory Commands
- `/memory show` - Display current hierarchical context
- `/memory refresh` - Reload all GEMINI.md files
- `/memory add <text>` - Append to global ~/.gemini/GEMINI.md

### Import Syntax
Use `@file.md` to import content from other files:
```markdown
@./shared-rules.md
@../common/style-guide.md
```

### Context Advantage
Gemini has 1M token context window - ideal for large codebase analysis and extensive research tasks.

## CRITICAL: Daily Note Safety

- **NEVER** create daily notes directly (`Resources/Agenda/Daily/*.md`)
- **NEVER** overwrite existing daily notes
- **ALWAYS** use embed files for agent output: `Resources/General/Embeds/`
- Daily notes are user-owned; agents write to embeds that get transcluded

## CRITICAL: File Operations

### Safe to Create/Edit
- `Resources/Zettlekasten/*.md` - Atomic knowledge notes
- `Resources/General/Embeds/*.md` - Agent output sections
- `Projects/` - Project documentation
- `Archive/` - Historical content

### Read-Only (Never Modify Directly)
- `Resources/Agenda/Daily/*.md` - User's daily notes
- `.obsidian/` - Obsidian configuration
- `Resources/General/Templates/*.md` - Templates

## Output Patterns

### Zettelkasten Notes
When creating atomic notes:
```markdown
---
created: YYYY-MM-DD
tags: [topic1, topic2]
---

# Note Title

Content with [[links]] to related notes.
```

### Embed Sections
When writing agent output:
```markdown
## Section Title
### Subsection
- Detail 1
- Detail 2
```

### Research Answers
When answering `[?]` questions:
1. Create Zettelkasten note: `Resources/Zettlekasten/Q-{slug}.md`
2. Provide inline summary in response
3. Link to full note

## Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| Daily | `YYYY-MM-DD.md` | `2025-01-05.md` |
| Meeting | `YYYY-MM-DD - Subject.md` | `2025-01-05 - Sprint Planning.md` |
| Person | `First Last.md` | `John Smith.md` |
| Zettel | `Descriptive-Title.md` | `B2B-Outreach-Best-Practices.md` |
| Question | `Q-{slug}.md` | `Q-competitor-pricing.md` |

## Dataview Awareness

The vault uses Dataview queries extensively. When creating notes:
- Include appropriate front matter
- Use consistent tag formats
- Maintain expected fields for queries to work

## Plugin Integration

### Persona Agent System
Located at `Projects/Persona/` with its own GEMINI.md.
- Provides agent runner modal
- Processes research questions
- Manages embed files

### Key Commands
| Command | Description |
|---------|-------------|
| Open agent runner | Select and run agents |
| Process research questions | Trigger researcher |
| Extract to Zettelkasten | Create atomic note from selection |

## Validation Checklist

Before completing any vault operation:
- [ ] Not modifying daily notes directly
- [ ] Using correct file naming convention
- [ ] Including appropriate front matter
- [ ] Using WikiLinks for internal references
- [ ] Following tag hierarchy patterns

## Development

```bash
# Build Persona plugin
cd .obsidian/plugins/persona
npm install
npm run build

# Run an agent with Gemini
cd Projects/Persona
./scripts/run-agent.sh MHM researcher process-research-queue 60
# Note: Set provider: gemini in agent frontmatter to use Gemini
```
