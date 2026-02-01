# OpenNotebook Guide

Complete guide for using OpenNotebook on this system.

**Version**: 0.2.2
**Installation**: `/Users/pbarrick/Documents/open-notebook`
**Last Updated**: 2026-01-06

---

## Table of Contents

1. [System Configuration](#system-configuration)
2. [Health Checks](#health-checks)
3. [Model Management](#model-management)
4. [API Reference](#api-reference)
5. [Testing the API](#testing-the-api)
6. [Common Workflows](#common-workflows)
7. [Troubleshooting](#troubleshooting)

---

## System Configuration

### Installation Location

```
/Users/pbarrick/Documents/open-notebook/
├── docker.env                  # Environment configuration
├── docker-compose.full.yml     # Docker compose file
├── notebook_data/              # Persistent data volume
└── surreal_data/               # Database volume
```

### Environment File (`docker.env`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `API_URL` | `http://localhost:5055` | External API URL |
| `GOOGLE_API_KEY` | `your_key_here` | Gemini API (primary) |
| `GROQ_API_KEY` | `your_key_here` | Groq API (fallback) |
| `OLLAMA_API_BASE` | `http://host.docker.internal:11434` | Local Ollama |
| `SURREAL_URL` | `ws://surrealdb:8000/rpc` | Database connection |
| `SURREAL_USER` | `root` | Database user |
| `SURREAL_PASSWORD` | `root` | Database password |

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Web UI | 8502 | http://localhost:8502 |
| API | 5055 | http://localhost:5055 |
| API Docs | 5055 | http://localhost:5055/docs |
| SurrealDB | 8000 | ws://localhost:8000 |
| Ollama | 11434 | http://localhost:11434 |

### Available Providers

Currently configured providers (based on API keys in `docker.env`):

| Provider | Status | Model Types |
|----------|--------|-------------|
| Ollama | Available | language, embedding |
| Groq | Available | language, speech_to_text |
| Google | Available | language, embedding, speech_to_text, text_to_speech |
| OpenAI | Unavailable | (needs API key) |
| Anthropic | Unavailable | (needs API key) |

---

## Health Checks

### Quick Status Check

```bash
# All-in-one health check script
cd /Users/pbarrick/Documents/open-notebook

# Check Docker containers
docker compose -f docker-compose.full.yml ps

# Check API health
curl -s http://localhost:5055/health | jq

# Check Ollama
curl -s http://localhost:11434/api/tags | jq '.models[].name'

# Check available providers
curl -s http://localhost:5055/api/models/providers | jq '.available'
```

### Detailed Health Checks

#### 1. Docker Services

```bash
# Check container status
docker compose -f /Users/pbarrick/Documents/open-notebook/docker-compose.full.yml ps

# Expected output:
# NAME                            STATUS
# open-notebook-open_notebook-1   Up
# open-notebook-surrealdb-1       Up
```

#### 2. API Health

```bash
curl -s http://localhost:5055/health
# Expected: {"status":"healthy"}
```

#### 3. Database Connection

```bash
curl -s http://localhost:5055/api/config | jq '.database'
# Should show database configuration
```

#### 4. Ollama Connection

```bash
# Check Ollama is running
curl -s http://localhost:11434/api/tags | jq '.models[].name'
# Expected: "llama3.2:latest" (or similar)

# Test from inside Docker container
docker exec open-notebook-open_notebook-1 curl -s http://host.docker.internal:11434/api/tags
```

#### 5. Model Providers

```bash
curl -s http://localhost:5055/api/models/providers | jq
# Shows available/unavailable providers
```

---

## Model Management

### View Current Default Models

```bash
curl -s http://localhost:5055/api/models/defaults | jq
```

### Set Default Models

```bash
# Set Ollama llama3.2 as default chat model
curl -X PUT http://localhost:5055/api/models/defaults \
  -H "Content-Type: application/json" \
  -d '{
    "default_chat_model": "ollama/llama3.2",
    "default_transformation_model": "ollama/llama3.2",
    "default_embedding_model": "ollama/nomic-embed-text"
  }'
```

### Model Types and Purposes

| Model Type | Purpose | Example Models |
|------------|---------|----------------|
| `default_chat_model` | Chat conversations | `ollama/llama3.2`, `google/gemini-2.0-flash` |
| `default_transformation_model` | Text transformations | Same as chat |
| `large_context_model` | Long documents | `google/gemini-1.5-pro` |
| `default_embedding_model` | Vector embeddings | `ollama/nomic-embed-text`, `google/text-embedding-004` |
| `default_speech_to_text_model` | Audio transcription | `groq/whisper-large-v3` |
| `default_text_to_speech_model` | Generate audio | `google/...` |
| `default_tools_model` | Function calling | Models with tool support |

### Available Models by Provider

#### Ollama (Local)
```bash
# List installed models
ollama list

# Pull new model
ollama pull <model-name>

# Common models:
# - llama3.2          (3B, general purpose)
# - llama3.2:1b       (1B, faster)
# - nomic-embed-text  (embeddings)
# - mistral           (7B, good quality)
```

#### Google Gemini
```
google/gemini-2.0-flash-exp    # Fast, capable
google/gemini-1.5-flash        # Balanced
google/gemini-1.5-pro          # Large context
google/text-embedding-004      # Embeddings
```

#### Groq
```
groq/llama-3.3-70b-versatile   # High quality
groq/llama-3.1-8b-instant      # Fast
groq/mixtral-8x7b-32768        # Good context
groq/whisper-large-v3          # Speech to text
```

### Add New Ollama Model

```bash
# Pull the model to Ollama
ollama pull <model-name>

# Verify it's available
curl -s http://localhost:11434/api/tags | jq '.models[].name'

# Set as default in OpenNotebook
curl -X PUT http://localhost:5055/api/models/defaults \
  -H "Content-Type: application/json" \
  -d '{"default_chat_model": "ollama/<model-name>"}'
```

### Add Cloud Provider Models

1. Get API key from provider
2. Add to `/Users/pbarrick/Documents/open-notebook/docker.env`:
   ```
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart services:
   ```bash
   docker compose -f docker-compose.full.yml restart
   ```
4. Verify provider is available:
   ```bash
   curl -s http://localhost:5055/api/models/providers | jq '.available'
   ```

---

## API Reference

### Base URL

```
http://localhost:5055
```

### Interactive Docs

- **Swagger UI**: http://localhost:5055/docs
- **ReDoc**: http://localhost:5055/redoc
- **OpenAPI JSON**: http://localhost:5055/openapi.json

### Core Endpoints

#### Health & Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/config` | Get configuration |
| GET | `/api/settings` | Get app settings |
| PUT | `/api/settings` | Update settings |

#### Notebooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notebooks` | List all notebooks |
| POST | `/api/notebooks` | Create notebook |
| GET | `/api/notebooks/{id}` | Get notebook |
| PUT | `/api/notebooks/{id}` | Update notebook |
| DELETE | `/api/notebooks/{id}` | Delete notebook |

#### Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sources` | List sources |
| POST | `/api/sources` | Upload source |
| GET | `/api/sources/{id}` | Get source |
| DELETE | `/api/sources/{id}` | Delete source |
| GET | `/api/sources/{id}/status` | Processing status |

#### Search & Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Search sources |
| POST | `/api/search/ask` | Ask knowledge base |
| POST | `/api/search/ask/simple` | Simple Q&A |
| POST | `/api/chat/execute` | Execute chat |
| GET | `/api/chat/sessions` | List chat sessions |

#### Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List all models |
| GET | `/api/models/providers` | Available providers |
| GET | `/api/models/defaults` | Default model config |
| PUT | `/api/models/defaults` | Update defaults |

---

## Testing the API

### Test Script

Create and run this test script:

```bash
#!/bin/bash
# File: test-opennotebook-api.sh

API_URL="http://localhost:5055"

echo "=== OpenNotebook API Tests ==="
echo ""

# 1. Health Check
echo "1. Health Check"
curl -s "$API_URL/health" | jq
echo ""

# 2. List Providers
echo "2. Available Providers"
curl -s "$API_URL/api/models/providers" | jq '.available'
echo ""

# 3. Get Default Models
echo "3. Default Models"
curl -s "$API_URL/api/models/defaults" | jq
echo ""

# 4. List Notebooks
echo "4. Notebooks"
curl -s "$API_URL/api/notebooks" | jq
echo ""

# 5. List Sources
echo "5. Sources"
curl -s "$API_URL/api/sources" | jq
echo ""

# 6. Get Settings
echo "6. Settings"
curl -s "$API_URL/api/settings" | jq
echo ""

echo "=== Tests Complete ==="
```

### Manual API Tests

#### Create a Notebook

```bash
curl -X POST http://localhost:5055/api/notebooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Notebook",
    "description": "Testing API integration"
  }' | jq
```

#### Upload a Source (Text)

```bash
# Create a test file
echo "This is test content for OpenNotebook." > /tmp/test.txt

# Upload via multipart form
curl -X POST http://localhost:5055/api/sources \
  -F "file=@/tmp/test.txt" \
  -F "notebook_id=<notebook-id-from-above>" | jq
```

#### Upload a Source (URL)

```bash
curl -X POST http://localhost:5055/api/sources/json \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "notebook_id": "<notebook-id>"
  }' | jq
```

#### Search Sources

```bash
curl "http://localhost:5055/api/search?q=test" | jq
```

#### Ask the Knowledge Base

```bash
curl -X POST http://localhost:5055/api/search/ask/simple \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is in my test document?"
  }' | jq
```

### Python Client Example

```python
import requests

API_URL = "http://localhost:5055"

# Health check
r = requests.get(f"{API_URL}/health")
print(f"Health: {r.json()}")

# List notebooks
r = requests.get(f"{API_URL}/api/notebooks")
notebooks = r.json()
print(f"Notebooks: {len(notebooks)}")

# Create notebook
r = requests.post(f"{API_URL}/api/notebooks", json={
    "name": "Python Test",
    "description": "Created via Python"
})
notebook = r.json()
print(f"Created notebook: {notebook['id']}")

# Get providers
r = requests.get(f"{API_URL}/api/models/providers")
providers = r.json()
print(f"Available providers: {providers['available']}")
```

---

## Common Workflows

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
# All services
docker compose -f docker-compose.full.yml logs -f

# Just the app
docker compose -f docker-compose.full.yml logs -f open_notebook
```

### Restart After Config Change

```bash
cd /Users/pbarrick/Documents/open-notebook
docker compose -f docker-compose.full.yml restart
```

### Full Reset (Caution: Deletes Data)

```bash
cd /Users/pbarrick/Documents/open-notebook
docker compose -f docker-compose.full.yml down -v
docker compose -f docker-compose.full.yml up -d
```

---

## Troubleshooting

### API Returns Empty Models

**Symptom**: `/api/models` returns `[]`

**Cause**: No models have been explicitly registered yet

**Solution**: Models are discovered from providers. Check providers are available:
```bash
curl -s http://localhost:5055/api/models/providers | jq '.available'
```

### Ollama Not Connecting

**Symptom**: Ollama shows as unavailable

**Check 1**: Is Ollama running?
```bash
curl http://localhost:11434/api/tags
```

**Check 2**: Docker can reach host?
```bash
docker exec open-notebook-open_notebook-1 \
  curl -s http://host.docker.internal:11434/api/tags
```

**Fix**: Ensure Ollama is started:
```bash
brew services start ollama
```

### Database Authentication Error

**Symptom**: "There was a problem with authentication"

**Cause**: Password mismatch between `docker.env` and `docker-compose.full.yml`

**Fix**: Ensure `docker.env` has `SURREAL_PASSWORD=root`

### Provider Not Available

**Symptom**: Provider shows in "unavailable" list

**Cause**: Missing or invalid API key

**Fix**:
1. Add key to `docker.env`
2. Restart: `docker compose -f docker-compose.full.yml restart`

### Port Already in Use

**Check**:
```bash
lsof -i :8502
lsof -i :5055
```

**Fix**: Kill the process or change ports in `docker-compose.full.yml`

---

## Quick Reference Card

```bash
# Status
curl http://localhost:5055/health

# Providers
curl http://localhost:5055/api/models/providers | jq '.available'

# Default models
curl http://localhost:5055/api/models/defaults | jq

# List notebooks
curl http://localhost:5055/api/notebooks | jq

# Create notebook
curl -X POST http://localhost:5055/api/notebooks \
  -H "Content-Type: application/json" \
  -d '{"name": "My Notebook"}'

# Start
docker compose -f docker-compose.full.yml up -d

# Stop
docker compose -f docker-compose.full.yml down

# Logs
docker compose -f docker-compose.full.yml logs -f

# Web UI
open http://localhost:8502

# API Docs
open http://localhost:5055/docs
```
