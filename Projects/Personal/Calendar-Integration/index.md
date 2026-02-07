---
project_name: Calendar-Obsidian Integration
shortcode: cal
project_type: Infrastructure
status: Active
start_date: 2026-01-22
tags: [project, automation, calendar, claude-code, mcp]
---

# Calendar-Obsidian Integration

Enable Claude Code to read Outlook calendar events and automatically create meeting notes in Obsidian.

## Architecture

```
Outlook (New) → macOS Calendar → iCal MCP Server → Claude Code → Obsidian Meeting Files
```

**Why this architecture?**
- New Outlook for Mac lacks AppleScript support
- Microsoft Graph API MCP servers require Azure AD access
- macOS Calendar provides native EventKit access via MCP servers

---

## Setup Checklist

### 1. Enable Outlook → macOS Calendar Sync
- [ ] Open **System Settings** > **Internet Accounts**
- [ ] Click **Add Account** > **Microsoft Exchange** (work) or **Microsoft 365** (personal)
- [ ] Sign in with Outlook credentials
- [ ] Enable **Calendars** sync
- [ ] Verify events appear in macOS **Calendar.app**

### 2. Install MCP Server Prerequisites
- [ ] Install `uv` package manager: `brew install uv`

### 3. Configure Claude Desktop MCP Server

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ical": {
      "command": "uvx",
      "args": ["mcp-ical"]
    }
  }
}
```

- [ ] Add mcp-ical configuration
- [ ] Restart Claude Desktop

### 4. Grant Calendar Permissions (if needed)

If the MCP server fails to read events, macOS TCC may be blocking access:

```bash
# Backup first
cp ~/Library/Application\ Support/com.apple.TCC/TCC.db ~/TCC.db.backup

# Grant access
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db <<EOF
REPLACE INTO access
VALUES(
  'kTCCServiceCalendar',
  'com.anthropic.claudefordesktop',
  0, 2, 2, 2,
  X'fade0c00000000ac0000000100000006000000060000000600000006000000020000001e636f6d2e616e7468726f7069632e636c61756465666f726465736b746f7000000000000f0000000e000000010000000a2a864886f763640602060000000000000000000e000000000000000a2a864886f7636406010d0000000000000000000b000000000000000a7375626a6563742e4f550000000000010000000a51364c325346365944570000',
  NULL, 0, 'UNUSED', NULL, 16,
  CAST(strftime('%s','now') AS INTEGER),
  NULL, NULL, 'UNUSED', 0
);
EOF
```

- [ ] Backup TCC database
- [ ] Grant calendar access
- [ ] Restart Claude Desktop

---

## Category Mapping

Meetings are categorized by keywords in the title:

| Keywords | Category | Folder |
|----------|----------|--------|
| `1:1`, `1on1`, person names | 1to1 | `Archive/Meetings/1to1/` |
| `standup`, `retro`, `sprint`, `planning` | Scrum | `Archive/Meetings/Scrum/` |
| `leadership`, `exec`, `staff`, `all-hands` | Leadership | `Archive/Meetings/Leadership/` |
| `product`, `engineering`, `PandE`, `tech` | PandE | `Archive/Meetings/PandE/` |
| Personal calendar events | Personal | `Archive/Meetings/Personal/` |
| Everything else | Ad-Hoc | `Archive/Meetings/Ad-Hoc/` |

---

## Usage

### Create Meeting Notes for Today

Ask Claude:

> "Create meeting notes for all my meetings today"

Claude will:
1. Fetch today's events via the iCal MCP server
2. Categorize each meeting by keywords
3. Create files at `Archive/Meetings/{Category}/{DATE} - {Subject}.md`
4. Skip files that already exist (no duplicates)

### Meeting File Format

Files follow the template at `Resources/General/Templates/Meeting.md`:

```yaml
---
date: YYYY-MM-DD
searchableSubject: Meeting Subject
type: meeting
company:
---

People:: [[Attendee 1]], [[Attendee 2]]
Subject:: Meeting Subject
Date:: [[Resources/Agenda/Daily/YYYY-MM-DD|YYYY-MM-DD]]
```

---

## Known Issues (2026-02-07)

### Bug: `testMCPConnection()` never passed config to MCP client
The Test Connection button in settings always returned "No configuration provided" because the config created from settings was discarded — never passed to the MCPClientService. **Fixed** in `main.ts`.

### Root Cause: macOS TCC Permission Prompt Never Appears
When Obsidian (Electron app, launched from Finder) spawns mcp-ical as a child process, macOS TCC checks the **parent application bundle** for calendar permission. Obsidian's `Info.plist` does not declare `NSCalendarsUsageDescription`, so:
- Permission is **silently denied** — no prompt ever appears
- The child process (Python/PyObjC) inherits Obsidian's TCC context
- Even with the code bug fixed, TCC blocks calendar access

**Workarounds** (all fragile):
1. Launch Obsidian from Terminal (`open /Applications/Obsidian.app` or direct binary) — Terminal.app may have Full Disk Access
2. Manually edit `TCC.db` (requires SIP disabled, risky)
3. Grant Python binary calendar access in System Settings (unreliable for subprocess chains)

### Recommendation: Switch to outlook-mcp (Microsoft Graph API)
The `mcp-ical` approach has a fundamental macOS TCC incompatibility when spawned from Obsidian. Consider switching to [outlook-mcp](https://github.com/ryaker/outlook-mcp) which uses Microsoft Graph API over HTTP — no TCC dependency, works from any parent process.

| Approach | TCC Required | Works from Obsidian | Setup Complexity |
|----------|-------------|-------------------|-----------------|
| mcp-ical (current) | Yes - blocked | No (silent deny) | Low but broken |
| outlook-mcp (Graph API) | No | Yes | Medium (Azure AD OAuth) |
| Computer Use | No | No (Linux container only) | High, unreliable |
| M365 Connector | No | Yes | Enterprise plan required |

---

## Troubleshooting

### MCP Server Not Found
```bash
# Verify uv is installed
which uv

# Test mcp-ical directly
uvx mcp-ical --help
```

### No Calendar Events Returned
1. Check macOS Calendar.app shows your Outlook events
2. Try granting TCC permissions (see Setup section)
3. Restart Claude Desktop after permission changes

### Wrong Calendar Selected
If you have multiple calendars, specify the calendar name when querying.

---

## Resources

| Resource | Link |
|----------|------|
| mcp-ical GitHub | https://github.com/Omar-V2/mcp-ical |
| outlook-mcp (recommended) | https://github.com/ryaker/outlook-mcp |
| Alternative: mcp-server-apple-events | https://github.com/FradSer/mcp-server-apple-events |
| TCC Permission Guide | https://lenticular.zone/macos-tcc-claude-mcp/ |
| Meeting Template | [[Resources/General/Templates/Meeting]] |
| Meeting Storage | [[Archive/Meetings/]] |

---

## Related

- [[Resources/General/Scripts/ProcessMeetingPeople.js]] - QuickAdd macro for manual meeting creation
- [[Resources/General/Templates/Meeting]] - Meeting note template
