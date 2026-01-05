# AGENTS.md - PersonalMCO

## Instance Profile

- **Type**: Personal & Professional Management
- **Focus**: VP of Engineering work + personal projects
- **Differences from MHM**: No sales agents, codebase analysis capability

## Agent Roster

| Agent | Schedule | Primary Action |
|-------|----------|----------------|
| Assistant | Daily 5:15 AM/PM | Briefings, coordination |
| Researcher | Daily 6:30 AM | Question answering, codebase analysis |
| Project Manager | Daily 7:15 AM | Project tracking |

## Key Paths

| Resource | Path |
|----------|------|
| Personal Projects | `Projects/Momentum/` |
| MCO Work | `Resources/Professional/MCO/` |
| Daily Note Section | `## Personal & MCO` |
| Embed File | `Resources/General/Embeds/PersonalMCO-Section.md` |

## Special Features

### Codebase Analysis
Researcher handles `[CB?]` markers for codebase questions:

```markdown
[CB?] How does authentication work in our platform?
[CB?] /path/to/repo - Where are permissions defined?
```

Configure codebases in `.env`:
```
CODEBASES=/path/to/repo1,/path/to/repo2
```

## Instance-Specific Rules

1. Assistant is top-level coordinator (no CEO)
2. All schedules offset 15 minutes from MHM
3. Uses `## Personal & MCO` section, not `## MHM`
4. Personal projects tracked in Momentum folder
5. Work projects tracked in MCO folder
