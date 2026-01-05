# Persona Setup Guide

Complete installation and configuration guide for the Persona workflow system.

## Prerequisites

- [Obsidian](https://obsidian.md/) (v1.4+)
- Node.js (v18+) for building the Persona plugin
- AI CLI tool (one of):
  - [Claude Code](https://claude.ai/code) (recommended)
  - [Gemini CLI](https://cloud.google.com/gemini)
  - [Jules](https://jules.ai/)

## Step 1: Clone Repository

Clone this repository into your Obsidian vault folder:

```bash
cd /path/to/your/vault
git clone <repo-url> .
```

Or clone alongside existing vault content (existing files won't be overwritten).

## Step 2: Install Obsidian Plugins

### Required Plugins (5 critical)

Install from Community Plugins:

1. **Dataview** - Dynamic content queries
2. **Templater** - Template automation
3. **QuickAdd** - Quick note creation
4. **Journals** - Calendar integration
5. **Homepage** - Landing page configuration

### Persona Plugin (included)

Build from source:

```bash
cd .obsidian/plugins/persona
npm install
npm run build
```

Then enable "Persona" in Obsidian Settings → Community Plugins.

### Recommended Plugins

- Buttons - Interactive elements
- Tasks - Enhanced task management
- Multi-column Markdown - Layout support

### Optional Plugins

- Gemini Scribe - AI integration (requires API key)
- Whisper - Voice transcription (requires API key)
- Smart Connections - AI-powered linking

## Step 3: Configure Templates

### 3.1 Persona Configuration

Copy template and configure:

```bash
cp Projects/Persona/config/env.md.template Projects/Persona/config/env.md
```

Edit `env.md`:

```markdown
## Default Provider
default_provider: claude

## Provider Paths
claude_path: /usr/local/bin/claude
gemini_path: gemini
jules_path: jules
```

### 3.2 Plugin Configurations

**Persona Plugin:**
```bash
cp .obsidian/plugins/persona/data.json.template .obsidian/plugins/persona/data.json
```

Edit and set your vault path:
```json
{
  "personaRoot": "/path/to/your/vault/Projects/Persona",
  "business": "PersonalMCO"
}
```

**QuickAdd Plugin:**
```bash
cp .obsidian/plugins/quickadd/data.json.template .obsidian/plugins/quickadd/data.json
```

Edit and add your OpenAI API key (if using AI features):
```json
"apiKey": "sk-your-key-here"
```

### 3.3 Embed Files

Copy the embed templates for agent output:

```bash
cp Resources/General/Embeds/PersonalMCO-Section.template.md Resources/General/Embeds/PersonalMCO-Section.md
```

## Step 4: Create Directory Structure

The following directories are needed for personal content (not in repo):

```bash
mkdir -p Resources/Agenda/Daily
mkdir -p Resources/Agenda/Weekly
mkdir -p Resources/Agenda/Monthly
mkdir -p Resources/Agenda/Tasks
mkdir -p Resources/Zettlekasten
mkdir -p Resources/People
mkdir -p Archive/Meetings
```

## Step 5: Configure Journals Plugin

In Obsidian Settings → Journals:

1. Set daily note folder: `Resources/Agenda/Daily`
2. Set daily note template: `Resources/General/Templates/Daily.md`
3. Set date format: `YYYY-MM-DD`

## Step 6: Test Agent System

Run a test agent execution:

```bash
cd Projects/Persona
./scripts/run-agent.sh PersonalMCO assistant morning-briefing 60
```

Check the logs:

```bash
cat instances/PersonalMCO/logs/agents/assistant-$(date +%Y-%m-%d).log
```

## Step 7: Configure Agent Schedules

Agents can run via:

1. **Obsidian Plugin** - Manual triggers via commands
2. **Cron/launchd** - Scheduled background execution
3. **Manual** - Run scripts directly

### Example crontab (macOS/Linux):

```cron
# Morning briefing at 5:15 AM
15 5 * * * cd /path/to/vault/Projects/Persona && ./scripts/run-agent.sh PersonalMCO assistant morning-briefing 60

# Research questions at 6:30 AM
30 6 * * * cd /path/to/vault/Projects/Persona && ./scripts/run-agent.sh PersonalMCO researcher process-research-queue 120

# Evening summary at 5:15 PM
15 17 * * * cd /path/to/vault/Projects/Persona && ./scripts/run-agent.sh PersonalMCO assistant evening-summary 60
```

## Troubleshooting

### Plugin won't load

1. Ensure you ran `npm run build` in the persona plugin folder
2. Check that `main.js` was generated
3. Restart Obsidian completely

### Agents not finding daily note

1. Verify daily note exists at `Resources/Agenda/Daily/YYYY-MM-DD.md`
2. Check embed file exists: `Resources/General/Embeds/PersonalMCO-Section.md`
3. Verify environment variables in agent logs

### QuickAdd commands not working

1. Ensure `data.json` is configured (not the template)
2. Verify template folder path: `Resources/General/Templates`
3. Restart Obsidian after configuration changes

### Dataview queries empty

1. Ensure Dataview plugin is enabled
2. Check folder paths in queries match your structure
3. Dataview needs a moment to index on first load

## Creating a New Business Instance

To add a separate agent configuration (e.g., for work):

1. Copy the PersonalMCO instance:
   ```bash
   cp -r Projects/Persona/instances/PersonalMCO Projects/Persona/instances/MyBusiness
   ```

2. Edit `instances/MyBusiness/AGENTS.md` with business context

3. Create embed file:
   ```bash
   cp Resources/General/Embeds/PersonalMCO-Section.template.md Resources/General/Embeds/MyBusiness-Section.md
   ```

4. Add embed to your daily template

## Updating

Pull updates and rebuild:

```bash
git pull
cd .obsidian/plugins/persona
npm install
npm run build
```

Then restart Obsidian.

## Getting Help

- Check agent logs in `Projects/Persona/instances/{business}/logs/`
- Review `Projects/Persona/AGENTS.md` for system architecture
- Open an issue on the repository for bugs
