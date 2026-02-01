# PRD: OpenNotebook Integration

**Status**: Planned
**Priority**: Medium
**Phase**: Phase 3 - Learning Features

---

## Overview

Integrate OpenNotebook (https://github.com/lfnovo/open-notebook) with the Obsidian vault to enable AI-powered learning and research capabilities. OpenNotebook provides a RAG-based interface for querying and synthesizing knowledge from markdown sources.

---

## Research Findings

### OpenNotebook Capabilities

- **REST API**: FastAPI server at `http://localhost:5055`
- **API Docs**: Available at `http://localhost:5055/docs`
- **Supported Formats**: Markdown (.md), PDF, YouTube URLs, web pages
- **No Native Folder Sync**: Requires custom ETL script

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/sources` | Upload new source |
| `GET` | `/api/sources` | List all sources |
| `GET` | `/api/sources/{id}` | Get specific source |
| `PUT` | `/api/sources/{id}` | Update source |
| `DELETE` | `/api/sources/{id}` | Delete source |

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Obsidian Vault │ ──► │  Sync Script    │ ──► │  OpenNotebook   │
│  (Markdown)     │     │  (Python/Node)  │     │  REST API       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Vector Store   │
                                                │  (ChromaDB)     │
                                                └─────────────────┘
```

---

## Implementation Plan

### Phase 1: Install OpenNotebook (Docker)

**Prerequisites**:
- Docker Desktop for Mac
- API key (OpenAI or Anthropic)

**Steps**:

1. Clone the repository:
   ```bash
   git clone https://github.com/lfnovo/open-notebook.git
   cd open-notebook
   ```

2. Create `.env` file with API keys:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. Start with Docker Compose:
   ```bash
   docker compose up -d
   ```

4. Verify installation:
   - Web UI: `http://localhost:8502`
   - API Docs: `http://localhost:5055/docs`

---

### Phase 2: Create Obsidian Sync Script

**Script Location**: `scripts/sync-to-opennotebook.sh` (or Python equivalent)

**Functionality**:
- Accept array of folder paths from Obsidian vault
- Recursively find all `.md` files
- POST each file to OpenNotebook API
- Track sync state to avoid duplicates
- Support incremental updates (new/modified files only)

**Folder Paths to Sync**:
```javascript
const SYNC_FOLDERS = [
  "Resources/Learning/",           // Books, articles, courses
  "Resources/Zettlekasten/",       // Atomic knowledge notes
  "Resources/Professional/",       // Work-related knowledge
  "Projects/",                     // Project documentation
];
```

**Exclusion Patterns**:
```javascript
const EXCLUDE = [
  "**/Templates/**",               // Skip templates
  "**/Archive/**",                 // Skip archived content
  "**/.obsidian/**",               // Skip Obsidian config
  "**/Daily/**",                   // Skip daily notes (too transient)
];
```

---

### Phase 3: Sync Script Implementation

**Python Script Outline**:

```python
#!/usr/bin/env python3
"""
sync-to-opennotebook.py
Sync Obsidian vault folders to OpenNotebook via REST API
"""

import os
import requests
import hashlib
from pathlib import Path
from datetime import datetime

OPENNOTEBOOK_API = "http://localhost:5055/api"
VAULT_ROOT = "/Users/pbarrick/Documents/Main"
STATE_FILE = "state/opennotebook-sync.json"

SYNC_FOLDERS = [
    "Resources/Learning",
    "Resources/Zettlekasten",
    "Resources/Professional",
    "Projects",
]

EXCLUDE_PATTERNS = [
    "Templates",
    "Archive",
    ".obsidian",
    "Daily",
]

def get_files_to_sync():
    """Find all markdown files in sync folders, excluding patterns"""
    files = []
    for folder in SYNC_FOLDERS:
        folder_path = Path(VAULT_ROOT) / folder
        if folder_path.exists():
            for md_file in folder_path.rglob("*.md"):
                if not any(excl in str(md_file) for excl in EXCLUDE_PATTERNS):
                    files.append(md_file)
    return files

def upload_source(filepath: Path):
    """Upload a single markdown file to OpenNotebook"""
    with open(filepath, 'r') as f:
        content = f.read()

    payload = {
        "title": filepath.stem,
        "content": content,
        "source_type": "text",
        "metadata": {
            "path": str(filepath.relative_to(VAULT_ROOT)),
            "synced_at": datetime.now().isoformat()
        }
    }

    response = requests.post(f"{OPENNOTEBOOK_API}/sources", json=payload)
    return response.status_code == 200

def main():
    files = get_files_to_sync()
    print(f"Found {len(files)} files to sync")

    for filepath in files:
        success = upload_source(filepath)
        status = "✓" if success else "✗"
        print(f"{status} {filepath.name}")

if __name__ == "__main__":
    main()
```

---

### Phase 4: Automation Options

**Option A: Manual Trigger**
- Obsidian command via Persona plugin
- `Persona: Sync to OpenNotebook`

**Option B: Cron Job**
```bash
# Run daily at 2am
0 2 * * * /path/to/sync-to-opennotebook.py >> /var/log/opennotebook-sync.log 2>&1
```

**Option C: File Watcher (fswatch)**
```bash
fswatch -o ~/Documents/Main/Resources/Learning | xargs -n1 ./sync-to-opennotebook.py
```

**Option D: LaunchAgent (Mac native)**
```xml
<!-- ~/Library/LaunchAgents/com.persona.opennotebook-sync.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.persona.opennotebook-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/pbarrick/Documents/Main/Projects/Persona/scripts/sync-to-opennotebook.py</string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

---

## Configuration

### env.md Additions

```markdown
# OpenNotebook Integration
opennotebook_enabled: true
opennotebook_api_url: http://localhost:5055/api
opennotebook_sync_folders: Resources/Learning,Resources/Zettlekasten,Resources/Professional,Projects
opennotebook_exclude: Templates,Archive,.obsidian,Daily
opennotebook_sync_mode: manual  # manual | cron | watch
```

---

## Acceptance Criteria

- [ ] OpenNotebook running via Docker on Mac
- [ ] API accessible at localhost:5055
- [ ] Sync script successfully uploads markdown files
- [ ] Incremental sync (skip unchanged files)
- [ ] Exclusion patterns working correctly
- [ ] Automation method chosen and configured
- [ ] State tracking to prevent duplicates

---

## Estimated Effort

| Task | Complexity | Notes |
|------|------------|-------|
| Docker Setup | Low | Standard Docker Compose |
| Sync Script | Medium | Python with requests |
| State Tracking | Low | JSON file |
| Automation | Low | LaunchAgent or cron |
| Testing | Medium | Validate sync accuracy |

---

## Related Work

- **Depends On**: None (standalone integration)
- **Related**: Smart Connections plugin (similar vector search)
- **Future**: Query OpenNotebook from Persona agents

---

## Resources

- GitHub: https://github.com/lfnovo/open-notebook
- Website: https://www.open-notebook.ai/
- API Docs: http://localhost:5055/docs (after install)