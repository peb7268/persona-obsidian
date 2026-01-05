# Provider Guide

## Overview

Persona supports multiple AI providers for agent execution. This guide explains how to configure and use each supported provider.

## Supported Providers

| Provider | CLI Tool | Best For | Context Window |
|----------|----------|----------|----------------|
| Claude Code | `claude` | General purpose, tool use | 200K tokens |
| Gemini CLI | `gemini` | Research, large context | 1M tokens |
| Jules | `jules` | Async coding tasks | 128K tokens |

## Configuration

### Setting the Default Provider

Edit `config/env.md`:

```markdown
## Default Provider
default_provider: claude

## Provider Paths
claude_path: /Users/pbarrick/.nvm/versions/node/v20.19.2/bin/claude
gemini_path: gemini
jules_path: jules
```

### Per-Agent Provider Override

Add `provider:` to agent frontmatter:

```yaml
---
name: researcher
role: Research Analyst
tier: specialist
provider: gemini  # Use Gemini for this agent
model: opus
---
```

## Claude Code

### Installation

```bash
npm install -g @anthropic-ai/claude-code
```

### Configuration

1. Set path in `config/env.md`:
   ```markdown
   claude_path: /path/to/claude
   ```

2. Authenticate:
   ```bash
   claude auth login
   ```

### Usage

Claude Code is the default provider. No special configuration needed.

```bash
./scripts/run-agent.sh MHM researcher process-research-queue
```

### CLI Flags Used

| Flag | Purpose |
|------|---------|
| `--print` | Output response to stdout |
| `--dangerously-skip-permissions` | Skip file permission prompts |
| `--model opus` | Use Opus model |

### Best For

- Complex multi-step tasks
- Tool-heavy operations (file edits, web search)
- Tasks requiring high reasoning capability
- Default choice for most agents

## Gemini CLI

### Installation

```bash
# Install via npm
npm install -g @anthropic-ai/gemini-cli

# Or via pip
pip install gemini-cli
```

### Configuration

1. Set path in `config/env.md`:
   ```markdown
   gemini_path: gemini
   ```

2. Set API key:
   ```bash
   export GEMINI_API_KEY="your-api-key"
   ```

### Usage

Option 1: Set as default provider:
```markdown
default_provider: gemini
```

Option 2: Per-agent override:
```yaml
---
name: researcher
provider: gemini
---
```

### CLI Flags Used

| Flag | Purpose |
|------|---------|
| `--sandbox false` | Allow file system access |

### Native AGENTS.md Support

Gemini CLI **natively reads AGENTS.md files** in the working directory. This means:
- No need to include instructions in the prompt
- Gemini automatically understands project context
- More efficient token usage

### Best For

- Research tasks (1M token context window)
- Large codebase analysis
- Tasks requiring extensive context
- Cost-sensitive operations

### Example: Research Agent with Gemini

```yaml
---
name: researcher
role: Research & Analysis Agent
tier: specialist
provider: gemini
model: gemini-2.0-flash

schedule:
  type: cron
  patterns:
    - name: process-research-queue
      cron: "30 6 * * *"
---
```

## Jules

### Overview

Jules is Google's **asynchronous coding agent**. Unlike Claude and Gemini which respond immediately, Jules creates a task that runs in the background and returns results later.

### Installation

```bash
# Install Jules Tools CLI
npm install -g @anthropic-ai/jules-tools
```

### Configuration

1. Set path in `config/env.md`:
   ```markdown
   jules_path: jules
   ```

2. Set API key:
   ```bash
   export JULES_API_KEY="your-api-key"
   ```

### Usage

```yaml
---
name: developer
provider: jules
---
```

### CLI Flags Used

| Flag | Purpose |
|------|---------|
| `task create` | Create async task |
| `--description` | Task description |
| `--repo` | Repository path |

### Async Execution Model

Jules works differently from other providers:

1. **Task Creation**: Jules creates a task and returns immediately
2. **Background Processing**: Task runs asynchronously
3. **Result Retrieval**: Check task status later

```bash
# Create task
jules task create --description "..." --repo /path/to/repo

# Check status
jules task status <task-id>

# Get results
jules task result <task-id>
```

### Best For

- Long-running code generation tasks
- Complex refactoring operations
- Tasks that can run overnight
- Batch processing

### Limitations

- Not suitable for interactive workflows
- Results not immediately available
- Requires polling for completion

## Model Mapping

Persona uses generic model names that map to provider-specific models:

| Generic Name | Claude | Gemini | Jules |
|--------------|--------|--------|-------|
| opus | opus | gemini-2.0-flash | jules |
| sonnet | sonnet | gemini-2.0-flash | jules |
| haiku | haiku | gemini-2.0-flash | jules |

## Provider Selection Strategy

### Default: Claude Code

Use Claude for:
- Most daily operations
- Tool-heavy tasks
- Tasks requiring file manipulation
- Interactive workflows

### When to Use Gemini

Switch to Gemini for:
- Research with large context requirements
- Codebase-wide analysis
- Cost optimization (larger context = fewer calls)
- Tasks that benefit from native AGENTS.md support

### When to Use Jules

Switch to Jules for:
- Long-running tasks (>20 minutes)
- Complex code generation
- Tasks that can run asynchronously
- Batch processing multiple files

## Troubleshooting

### Provider not found

```
ERROR: Provider CLI not found or not executable at /path/to/provider
```

**Solutions:**
1. Verify installation: `which claude` or `which gemini`
2. Check path in `config/env.md`
3. Ensure executable permissions

### Authentication errors

**Claude:**
```bash
claude auth login
```

**Gemini:**
```bash
export GEMINI_API_KEY="your-key"
```

**Jules:**
```bash
export JULES_API_KEY="your-key"
```

### Model not supported

If you see model errors, check:
1. Model name in agent definition
2. Provider supports that model
3. Model mapping in `scripts/providers.sh`

### Timeout issues

Different providers have different response times:
- Claude: 5-10 min typical
- Gemini: Similar to Claude
- Jules: Creates task immediately, results later

Adjust timeouts in `run-agent.sh` or per-agent:
```yaml
---
name: long-running-agent
timeout: 1800  # 30 minutes
---
```

## Adding New Providers

To add a new provider:

1. Add path to `config/env.md`:
   ```markdown
   newprovider_path: /path/to/provider
   ```

2. Add to `scripts/providers.sh`:
   ```bash
   # In get_provider_path()
   newprovider)
       grep "^newprovider_path:" "$env_file" | cut -d: -f2- | xargs
       ;;

   # In invoke_provider()
   newprovider)
       echo "$prompt" | "$provider_path" --flags
       ;;
   ```

3. Add model mapping in `get_provider_model()`

4. Test:
   ```bash
   ./scripts/run-agent.sh MHM test-agent test-action
   ```
