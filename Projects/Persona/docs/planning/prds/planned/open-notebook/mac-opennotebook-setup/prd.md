# PRD: Mac OpenNotebook Setup and Configuration

**Status**: In Progress (Installation complete, needs API keys)
**Priority**: High
**Phase**: Phase 3 - Learning Features
**Platform**: macOS (Apple Silicon M3)
**Depends On**: None

---

## Overview

Complete setup guide and configuration for running OpenNotebook on an M3 Mac, optimized for local development with Gemini as the primary LLM provider and Ollama as a local fallback.

---

## Prerequisites

### Required Software

| Software | Version | Purpose | Install Command |
|----------|---------|---------|-----------------|
| Docker Desktop | Latest | Container runtime | `brew install --cask docker` |
| Git | Latest | Clone repository | Pre-installed on macOS |

### Optional Software

| Software | Version | Purpose | Install Command |
|----------|---------|---------|-----------------|
| Ollama | Latest | Local LLM inference | `brew install ollama` |
| Python | 3.11+ | Sync scripts | `brew install python@3.11` |

### API Keys (Free Tiers)

| Provider | Get Key At | Free Tier |
|----------|------------|-----------|
| Gemini | https://aistudio.google.com/app/apikey | 15 RPM, 1M tokens/day |
| Groq | https://console.groq.com/keys | 30 RPM, 6K tokens/min |

---

## Installation Steps

### Step 1: Install Docker Desktop

```bash
# Install Docker Desktop for Apple Silicon
brew install --cask docker

# Launch Docker Desktop
open -a Docker

# Wait for Docker to start (check menu bar icon)
# First launch takes ~2 minutes
```

### Step 2: Install Ollama (Optional but Recommended)

```bash
# Install Ollama
brew install ollama

# Pull recommended models
ollama pull llama3.2          # 3B params, good balance
ollama pull nomic-embed-text  # Local embeddings

# Start Ollama service (runs in background)
brew services start ollama
```

### Step 3: Clone OpenNotebook

```bash
# Navigate to Documents (sibling to Obsidian vault)
cd /Users/pbarrick/Documents

# Clone the repository
git clone https://github.com/lfnovo/open-notebook.git

# Enter the directory
cd open-notebook
```

### Step 4: Configure Environment

```bash
# Copy the prepared .env file (NOTE: must be named docker.env, not .env)
cp /Users/pbarrick/Documents/Main/Projects/Persona/docs/planning/prds/planned/open-notebook-integration/config/.env docker.env

# The docker-compose.override.yml is OPTIONAL - docker-compose.full.yml works well on M3
# Only copy if you need custom resource limits:
# cp /Users/pbarrick/Documents/Main/Projects/Persona/docs/planning/prds/planned/open-notebook-integration/config/docker-compose.override.yml .

# Edit docker.env with your API keys
# Replace: your_gemini_api_key_here
# Replace: your_groq_api_key_here
```

### Step 5: Start Services

```bash
# Start all services in background (uses docker-compose.full.yml)
docker compose -f docker-compose.full.yml up -d

# Watch logs (optional)
docker compose -f docker-compose.full.yml logs -f

# Verify services are running
docker compose -f docker-compose.full.yml ps
```

### Step 6: Verify Installation

```bash
# Open the web UI
open http://localhost:8502

# Check API docs
open http://localhost:5055/docs
```

---

## Directory Structure

After installation:

```
/Users/pbarrick/Documents/
├── Main/                           # Obsidian vault
│   └── Projects/Persona/
│       └── docs/planning/prds/
│           └── planned/
│               ├── open-notebook-integration/
│               │   ├── prd.md
│               │   └── config/
│               │       ├── .env
│               │       ├── docker-compose.override.yml
│               │       └── models.yaml
│               └── mac-opennotebook-setup/
│                   └── prd.md      # This file
│
└── open-notebook/                  # OpenNotebook installation
    ├── docker.env                  # Copied from config/.env (MUST be named docker.env)
    ├── docker-compose.full.yml     # Main compose file (use this one)
    ├── docker-compose.override.yml # M3 optimizations (optional)
    └── ...
```

---

## Service Ports

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Web UI | 8502 | http://localhost:8502 | Streamlit interface |
| API | 5055 | http://localhost:5055 | FastAPI backend |
| API Docs | 5055 | http://localhost:5055/docs | Swagger UI |
| SurrealDB | 8000 | ws://localhost:8000 | Database (internal) |
| Ollama | 11434 | http://localhost:11434 | Local LLM (if installed) |

---

## Model Configuration

### In OpenNotebook UI

1. Open Settings (gear icon)
2. Navigate to "Model Configuration"
3. Set providers:

**LLM Provider**: Google
**LLM Model**: `gemini-2.0-flash-exp`

**Embedding Provider**: Google
**Embedding Model**: `text-embedding-004`

### Fallback Configuration

If Gemini rate limited, switch to:
- **Provider**: Groq
- **Model**: `llama-3.3-70b-versatile`

For offline/heavy use:
- **Provider**: Ollama
- **Model**: `llama3.2`

---

## Common Operations

### Start Services

```bash
cd /Users/pbarrick/Documents/open-notebook
docker compose -f docker-compose.full.yml up -d
```

### Stop Services

```bash
cd /Users/pbarrick/Documents/open-notebook
docker compose -f docker-compose.full.yml down
```

### View Logs

```bash
cd /Users/pbarrick/Documents/open-notebook
docker compose -f docker-compose.full.yml logs -f
```

### Update OpenNotebook

```bash
cd /Users/pbarrick/Documents/open-notebook
git pull
docker compose -f docker-compose.full.yml pull
docker compose -f docker-compose.full.yml up -d
```

### Reset Database

```bash
cd /Users/pbarrick/Documents/open-notebook
docker compose -f docker-compose.full.yml down -v  # Removes volumes
docker compose -f docker-compose.full.yml up -d    # Fresh start
```

---

## Troubleshooting

### Docker Not Starting

```bash
# Check Docker status
docker info

# If not running, start Docker Desktop
open -a Docker
```

### Port Already in Use

```bash
# Find what's using port 8502
lsof -i :8502

# Kill the process
kill -9 <PID>
```

### Ollama Connection Failed

```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# If not running
brew services start ollama
```

### Out of Memory

Edit `docker-compose.override.yml` to reduce memory limits:

```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Reduce from 4G
```

### API Key Invalid

1. Verify key at provider's console
2. Check `docker.env` file has no extra spaces
3. Restart services: `docker compose -f docker-compose.full.yml restart`

---

## Performance Tuning (M3 Mac)

### Recommended Docker Settings

1. Open Docker Desktop → Settings → Resources
2. Set:
   - CPUs: 6 (of 8 on M3)
   - Memory: 8 GB
   - Swap: 2 GB
   - Virtual disk limit: 64 GB

### Ollama Performance

```bash
# For faster inference, use smaller model
ollama pull llama3.2:1b

# For better quality, use larger model (needs more RAM)
ollama pull llama3.2:8b
```

---

## LaunchAgent (Auto-Start on Login)

To start OpenNotebook automatically:

```bash
# Create LaunchAgent
cat > ~/Library/LaunchAgents/com.opennotebook.docker.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.opennotebook.docker</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/docker</string>
        <string>compose</string>
        <string>-f</string>
        <string>/Users/pbarrick/Documents/open-notebook/docker-compose.full.yml</string>
        <string>up</string>
        <string>-d</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StartInterval</key>
    <integer>300</integer>
    <key>WorkingDirectory</key>
    <string>/Users/pbarrick/Documents/open-notebook</string>
</dict>
</plist>
EOF

# Load the agent
launchctl load ~/Library/LaunchAgents/com.opennotebook.docker.plist
```

---

## Acceptance Criteria

- [x] Docker Desktop installed and running
- [x] OpenNotebook cloned to `/Users/pbarrick/Documents/open-notebook`
- [ ] `docker.env` configured with Gemini API key (placeholder values currently)
- [x] Services start successfully with `docker compose -f docker-compose.full.yml up -d`
- [x] Web UI accessible at http://localhost:8502
- [x] API health check passing at http://localhost:5055/health
- [ ] Can create a notebook and add a source
- [x] (Optional) Ollama installed with llama3.2 model

---

## Next Steps After Setup

1. **Add Obsidian content** - Use the sync script from the integration PRD
2. **Configure models** - Set preferred LLM in Settings
3. **Create notebooks** - Organize by topic or project
4. **Test RAG** - Add a markdown file and ask questions about it

---

## Related Work

- **Integration PRD**: `docs/planning/prds/planned/open-notebook-integration/prd.md`
- **Config Files**: `docs/planning/prds/planned/open-notebook-integration/config/`
- **Obsidian Sync**: To be implemented via Python script
