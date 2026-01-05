## 🚀 Daily Note Quick Start

### Capture Syntax (use in Stream of Thought)
| Marker | Purpose | Example |
|--------|---------|---------|
| `- [ ]` | Task | `- [ ] Review PR ⏫ 📅 2025-01-15` |
| `* [?]` | Research question | `* [?] How does X work?` |
| `* [CB?]` | Codebase question | `* [CB?] Where is auth handled?` |
| `*` | Thought/Journal | `* Feeling productive today` |
| `[[Name]]` | Link person | `* Met with [[John Smith]]` |

### Persona Commands (Cmd+P)
- `Persona: Run morning briefing` - Start your day
- `Persona: Run evening summary` - End your day
- `Persona: Process research questions` - Answer [?] markers
- `Persona: Open agent runner` - Full agent menu

### Tasks Plugin Syntax
**Priority** (place after task description):
| Emoji | Priority |
|-------|----------|
| 🔺 | Highest |
| ⏫ | High |
| 🔼 | Medium |
| 🔽 | Low |
| ⏬ | Lowest |

**Dates** (YYYY-MM-DD format):
| Emoji | Purpose |
|-------|---------|
| 📅 | Due date |
| ⏳ | Scheduled date |
| 🛫 | Start date |
| 🔁 | Recurrence |

**Example**: `- [ ] Submit report ⏫ 📅 2025-01-15`

---

### Debugging Agents

| Action | How |
|--------|-----|
| Check running agent | Status bar (bottom) shows spinning indicator + name |
| View researcher log | `Cmd+P` → "Persona: View researcher log" |
| Open logs folder | `Cmd+P` → "Persona: Open agent logs folder" |
| Terminal: live log | `tail -f Projects/Persona/instances/MHM/logs/agents/researcher-$(date +%Y-%m-%d).log` |

**Log location:** `Projects/Persona/instances/MHM/logs/agents/`

---
*Remove this section once familiar: delete the embed line in your daily template*
