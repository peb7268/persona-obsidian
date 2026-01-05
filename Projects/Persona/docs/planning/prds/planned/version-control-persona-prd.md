# PRD: Version Control Persona for Portability

## Goal

Create a git repository structure that allows someone else to clone Persona into their Obsidian vault and replicate your daily note workflow, agent system, and templates.

## User Decisions

- **Repository Location**: Inside existing vault (`/Users/pbarrick/Documents/Main`)
- **Instances**: Include PersonalMCO only (remove MHM)
- **Ecomms Home**: Include as template (create copy, don't modify original)

---

## What to Version Control

### 1. Persona Project (ENTIRE DIRECTORY)
```
Projects/Persona/
├── AGENTS.md
├── CLAUDE.md
├── Readme.md
├── config/
│   ├── env.md.template          # Template with placeholder credentials
│   └── business-profiles/
├── docs/
├── scripts/
├── templates/
└── instances/
    └── PersonalMCO/             # Primary example instance
        ├── agents/
        ├── config/
        ├── AGENTS.md
        └── README.md
```

**Exclude from instances:**
- `state/` directories (runtime state, messages, locks)
- `logs/` directories (execution logs)
- `.env` files (credentials)
- `instances/MHM/` (exclude entirely - work-specific)

---

### 2. Obsidian Plugins

**A. Persona Plugin (Full Source)**
```
.obsidian/plugins/persona/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── styles.css
├── src/                         # Full source code
└── data.json.template           # Template config (not user's actual config)
```

**Exclude:** `node_modules/`, `main.js` (compiled)

**B. Critical Plugin Configs (5 essential)**
```
.obsidian/plugins/
├── dataview/data.json
├── templater-obsidian/data.json
├── quickadd/data.json           # SANITIZE: Remove API keys
├── journals/data.json
└── homepage/data.json
```

**C. Obsidian Core Settings**
```
.obsidian/
├── app.json
├── community-plugins.json
├── core-plugins.json
└── hotkeys.json                 # Optional
```

---

### 3. Templates (CRITICAL)
```
Resources/General/Templates/
├── Daily.md                     # Main daily note template
├── Weekly Template.md
├── Monthly Template.md
├── Quarterly Template.md
├── Meeting.md
├── Person.md
├── Project.md
└── Sales/Daily-Sales-Widget.md  # Optional
```

---

### 4. Embed Files (Agent Integration)
```
Resources/General/Embeds/
├── Daily-Quick-Start.md         # User guide for daily syntax
├── PersonalMCO-Section.md.template
└── MHM-Business-Section.md.template
```

---

### 5. Home Pages
```
Home.md
Mobile Home.md
Ecomms Home.template.md          # Sanitized template (original gitignored)
```

---

### 6. Vault-Level Config
```
CLAUDE.md                        # Claude Code instructions
```

---

## What to EXCLUDE

### Personal Data (Sensitive)
```
Resources/Agenda/Daily/          # Daily notes (personal content)
Resources/Agenda/Weekly/         # Weekly notes
Resources/Agenda/Monthly/        # Monthly notes
Resources/Zettlekasten/          # Knowledge base (personal)
Resources/People/                # CRM contacts
Resources/Learning/              # Personal reading
Archive/                         # Historical content
Areas/                           # Personal areas
```

### Runtime/Generated Files
```
Projects/Persona/instances/*/state/
Projects/Persona/instances/*/logs/
.obsidian/plugins/*/node_modules/
.obsidian/plugins/persona/main.js
.obsidian/workspace.json
.obsidian/graph.json
.smart-env/
.trash/
```

### Credentials (Must be Sanitized)
```
Projects/Persona/config/env.md           # Contains paths, provider settings
Projects/Persona/instances/*/.env        # Instance credentials
.obsidian/plugins/quickadd/data.json     # Contains OpenAI API key
.obsidian/plugins/gemini-scribe/data.json # Contains Gemini API key
.obsidian/plugins/whisper/data.json      # Contains OpenAI API key
.obsidian/plugins/tickticksync/data.json # Contains sync database (1.6MB)
```

---

## Repository Structure (In-Vault)

Git initialized at `/Users/pbarrick/Documents/Main/` with comprehensive .gitignore:

```
/Users/pbarrick/Documents/Main/           # Git root
├── .git/
├── .gitignore                            # Comprehensive exclusions
├── README.md                             # Setup instructions (NEW)
├── SETUP.md                              # Detailed guide (NEW)
├── CLAUDE.md                             # ✓ Version controlled
├── Home.md                               # ✓ Version controlled
├── Mobile Home.md                        # ✓ Version controlled
├── Ecomms Home.md                        # ✗ Gitignored (personal content)
├── Ecomms Home.template.md               # ✓ Sanitized template for repo
│
├── .obsidian/
│   ├── app.json                          # ✓
│   ├── community-plugins.json            # ✓
│   ├── core-plugins.json                 # ✓
│   ├── workspace.json                    # ✗ Excluded
│   └── plugins/
│       ├── persona/                      # ✓ Full source (exclude node_modules, main.js)
│       ├── dataview/data.json            # ✓
│       ├── templater-obsidian/data.json  # ✓
│       ├── quickadd/data.json            # ✗ Excluded (API keys) → .template
│       ├── journals/data.json            # ✓
│       └── homepage/data.json            # ✓
│
├── Projects/
│   ├── Persona/                          # ✓ Full project
│   │   ├── instances/PersonalMCO/        # ✓ (exclude state/, logs/)
│   │   └── instances/MHM/                # ✗ Excluded entirely
│   └── ...                               # ✗ Other projects excluded
│
├── Resources/
│   ├── General/
│   │   ├── Templates/                    # ✓ All templates
│   │   └── Embeds/                       # ✓ Agent embeds
│   ├── Agenda/                           # ✗ Excluded (daily notes)
│   ├── Zettlekasten/                     # ✗ Excluded (knowledge base)
│   ├── People/                           # ✗ Excluded (CRM)
│   └── Learning/                         # ✗ Excluded (personal)
│
├── Archive/                              # ✗ Excluded
└── Areas/                                # ✗ Excluded
```

---

## Implementation Steps

### Phase 1: Create .gitignore
Create comprehensive `.gitignore` at vault root:

```gitignore
# Personal Data
Resources/Agenda/
Resources/Zettlekasten/
Resources/People/
Resources/Learning/
Archive/
Areas/

# Other Projects (keep only Persona)
Projects/Azienda/
Projects/Ecomms/
Projects/Momentum/
Projects/Sales/
Projects/Active Projects Index.md

# Persona Runtime
Projects/Persona/instances/*/state/
Projects/Persona/instances/*/logs/
Projects/Persona/instances/*/.env
Projects/Persona/config/env.md

# MHM Instance (work-specific)
Projects/Persona/instances/MHM/

# Obsidian Runtime
.obsidian/workspace.json
.obsidian/graph.json
.obsidian/cache
.obsidian/plugins/*/node_modules/
.obsidian/plugins/persona/main.js

# Plugin Configs with Secrets
.obsidian/plugins/quickadd/data.json
.obsidian/plugins/gemini-scribe/data.json
.obsidian/plugins/whisper/data.json
.obsidian/plugins/tickticksync/data.json

# Files with Templates (original gitignored, template committed)
Ecomms Home.md
Resources/General/Embeds/PersonalMCO-Section.md
Resources/General/Embeds/MHM-Business-Section.md

# System
.smart-env/
.trash/
.DS_Store
```

### Phase 2: Create Template Files
1. `Projects/Persona/config/env.md.template` - Provider paths template
2. `.obsidian/plugins/quickadd/data.json.template` - QuickAdd without API key
3. `.obsidian/plugins/persona/data.json.template` - Persona config template

### Phase 3: Create Template Copies (Don't Modify Originals)
Create sanitized copies of files containing work-specific or personal content:

1. **Ecomms Home**:
   - Create `Ecomms Home.template.md` (sanitized copy for repo)
   - Add `Ecomms Home.md` to `.gitignore`
   - New users copy template → rename to `Ecomms Home.md`

2. **Embed Files** (if containing personal data):
   - Create `PersonalMCO-Section.template.md`
   - Create `MHM-Business-Section.template.md`
   - Originals stay intact, gitignored

3. **Config Files**:
   - `env.md.template` (already planned)
   - Original `env.md` stays intact, gitignored

### Phase 4: Initialize Git Repository
```bash
cd /Users/pbarrick/Documents/Main
git init
git add .gitignore
git add -A
git status  # Verify only intended files staged
git commit -m "Initial Persona vault setup"
```

### Phase 5: Create Documentation
Create `README.md` at vault root with:
- What is Persona
- Quick start guide
- Required plugins list
- Configuration steps

Create `SETUP.md` with detailed:
- Plugin installation instructions
- API key configuration
- Instance creation guide
- Troubleshooting

---

## Files Requiring Sanitization

| File | Contains | Action |
|------|----------|--------|
| `config/env.md` | Provider paths | Create `.template`, gitignore original |
| `quickadd/data.json` | OpenAI API key | Remove key, create template |
| `gemini-scribe/data.json` | Gemini API key | Exclude or template |
| `whisper/data.json` | OpenAI API key | Exclude or template |
| `tickticksync/data.json` | Full task DB (1.6MB) | Exclude entirely |
| `persona/data.json` | Persona root path | Create template |

---

## Required Plugins for New Users

**Must Install (5 critical):**
1. Dataview
2. Templater
3. QuickAdd
4. Journals
5. Persona (custom - included in repo)

**Recommended:**
6. Homepage
7. Buttons
8. Tasks

**Optional (workflow enhancement):**
9. Gemini Scribe (AI)
10. Whisper (voice)
11. Smart Connections

---

## Success Criteria

- [ ] Repository cloneable to any Obsidian vault
- [ ] Setup instructions clear and complete
- [ ] No personal data or credentials in repo
- [ ] Daily note template works immediately
- [ ] Persona plugin builds and runs
- [ ] Agent system functional after configuration
