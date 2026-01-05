---
tags:
  - starred
---

# Quick Workflow Reference

## QuickAdd Options

| Name | Type | Description | Keyboard Shortcut | Variables Required | Output Format |
|------|------|-------------|-------------------|-------------------|---------------|
| **New Meeting** | Template | Creates structured meeting notes with predefined templates | *Not Set* | Meeting Type, Subject | `{Type}/{DATE} - {Subject}.md` in Archive/Meetings |
| **1to1** | Template | Creates 1:1 meeting notes with predefined attendee list | *Not Set* | Attendee Name | `{Attendee}/{DATE}.md` in Archive/Meetings/1to1 |
| **Ad-Hoc** | Template | Creates ad-hoc meeting notes for various discussion types | *Not Set* | Meeting Category, Date | `{Category}/{DATE}.md` in Archive/Meetings/Ad-Hoc |
| **Person** | Template | Creates new person profile for CRM tracking | *Not Set* | None (auto-generated filename) | `temp-person-{TIMESTAMP}.md` in Resources/People |
| **Capture Quote to Category** | Capture | Adds categorized quotes to archive files | *Not Set* | Category, Quote, Author | Appends to Archive/Quotes/{Category} |
| **QuickTask** | Capture | Adds tasks to central task collection | *Not Set* | Task Description | `- [ ] {Task} {DATE}` in Resources/Zettlekasten/Quick Tasks |
| **QuickNote** | Capture | Creates timestamped notes in central location | *Not Set* | Title, Content | Timestamped entry in Resources/History/Quick Notes |
| **VocabWord** | Capture | Language learning vocabulary capture | *Not Set* | Language, Word, Translation, Example, Notes | Structured entry in Resources/Learning/Languages/Spoken/{Language}/Vocabulary |
| **InlineTask** | Capture | Adds TickTick-compatible tasks inline to current note | *Not Set* | Task Description, Priority Level | `- [ ] {Task} #ticktick {Priority} 📅 {DATE}` |

## Variable Options

### Meeting Types (New Meeting)
- 1to1, Ad-Hoc, Leadership, PandE, Personal, Scrum

### 1to1 Attendees
- Giorgio Catenacci, Egor Voronin, Manish Nayak, Rob Kenny, Conor Okane, Vadim Polosatov

### Ad-Hoc Categories  
- CS, Discussion, Incident, MCO Integration, MongoDB, Personal

### Language Options (VocabWord)
- Farsi, Gaelic, Hindi, Romanian, Russian

### Priority Levels (InlineTask)
- ⏫ (High Priority)
- 🔼 (Medium Priority) 
- 🔽 (Low Priority)
- (Empty - No Priority)

## Task Formats

### TickTick Compatible Format
Tasks created with **InlineTask** or existing TickTick tasks use this format:
```markdown
- [ ] Task description #ticktick %%[ticktick_id:: ID]%% Priority 📅 YYYY-MM-DD
```

### Quick Task Format  
Tasks created with **QuickTask** use this simpler format:
```markdown
- [ ] Task description YYYY-MM-DD
```

## Template Locations
- Main Templates: `Resources/General/Templates/`
- Meeting Template: `Resources/General/Templates/Meeting.md`
- Person Template: `Resources/General/Templates/Person.md`

## Output Locations
- **Meetings**: `Archive/Meetings/` (with subdirectories by type)
- **People**: `Resources/People/`
- **Quotes**: `Archive/Quotes/`
- **Tasks**: `Resources/Zettlekasten/Quick Tasks` or `Resources/Agenda/Tasks/`
- **Notes**: `Resources/History/Quick Notes`
- **Vocabulary**: `Resources/Learning/Languages/Spoken/{Language}/Vocabulary`

## Special Features

### InlineTask Behavior
- Adds tasks directly to the currently open note
- Compatible with TickTickSync plugin format
- Includes priority selection and automatic date stamping
- Uses #ticktick tag for synchronization

### Meeting Note Integration
- Three-parameter system: Directory, Type, Subject
- Automatic file organization by meeting type
- Links back to daily notes when appendLink enabled

### Vocabulary Learning
- Multi-language support
- Structured format for translation, examples, and notes
- Organized by language in learning directory

## Keyboard Shortcuts
Currently configured shortcuts:
- **Cmd+Shift+F**: Omnisearch
- **Alt+Shift+S**: Save Workspace

*Note: No QuickAdd shortcuts are currently configured. Consider adding shortcuts for frequently used options like InlineTask or QuickNote.*

## Usage Tips
1. **InlineTask** is ideal for adding tasks to daily notes while maintaining TickTick compatibility
2. **QuickTask** is better for general task collection that doesn't need TickTick sync
3. Meeting templates automatically handle file naming and organization
4. Person templates create temporary files that should be renamed after completion
5. All capture types can be used from any note context

---

## Blog Quick Publish

### System Overview
- **Blog URL**: https://blog.byte-sized.io/
- **Local Project**: `/Users/pbarrick/Desktop/dev/blog`
- **Obsidian Posts**: `/Users/pbarrick/Documents/Main/Resources/Learning/Blog/`
- **Build Output**: Unraid NAS at `192.168.1.62` (mounted at `/Volumes/blog`)

### Quick Publish Steps

1. **Connect to Unraid** (required for building)
   ```bash
   # Open Unraid Teleport VPN app and connect
   # Or connect to local network
   ```

2. **Verify Mount**
   ```bash
   ls /Volumes/blog
   # Should show: index.html, blog/, about/, etc.
   ```

3. **Open Project**
   ```bash
   cd /Users/pbarrick/Desktop/dev/blog
   code .  # Opens in VSCode
   ```

4. **Build & Deploy**
   ```bash
   npm run build
   ```
   - Builds directly to `/Volumes/blog` (Unraid)
   - Live immediately at https://blog.byte-sized.io/

### Post Organization

#### Published Posts
- Location: `/Resources/Learning/Blog/*.md`
- Requirements: Valid frontmatter (title, description, pubDate)
- Output: Built to `/Volumes/blog/blog/{post-slug}/`

#### Drafts (Excluded from Build)
- Location: `/Resources/Learning/Blog/drafts/`
- Purpose: Work-in-progress posts
- No frontmatter required
- Never published to website

#### Private Notes (Excluded from Build)
- Location: `/Resources/Learning/Blog/private/`
- Purpose: Blog-related private notes, planning, roadmaps
- No frontmatter required
- Never published to website

### Creating New Posts

#### Method 1: Manual (Obsidian)
```markdown
1. Navigate to Resources/Learning/Blog/
2. Create new .md file
3. Add frontmatter (see template below)
4. Write content
5. Save
```

#### Method 2: CLI (Planned - Not Yet Implemented)
```bash
# Future: Custom script to scaffold new posts
npm run new-post "Post Title"
```

#### Post Template (Required Frontmatter)
```yaml
---
title: 'Your Post Title'
description: "Brief description of the post (use double quotes for apostrophes)"
pubDate: 'Oct 22 2024'
heroImage: "https://images.unsplash.com/photo-xyz..."  # Optional
---

Your markdown content here...
```

### Validating Posts

#### Method 1: Astro Build (validates all)
```bash
cd /Users/pbarrick/Desktop/dev/blog
npm run build
# Shows validation errors if frontmatter is invalid
```

#### Method 2: Dev Server (live validation)
```bash
npm run dev
# Opens http://localhost:4321
# Shows errors in terminal and browser
```

#### Method 3: Type Check (fast validation)
```bash
npm run astro check
# Validates frontmatter schema without full build
```

### Common Issues & Fixes

**Issue: YAML Syntax Error**
```yaml
# ❌ Wrong: Single quotes with backslash escape
description: 'We\'re living...'

# ✅ Correct: Double quotes for apostrophes
description: "We're living..."

# ✅ Alternative: Double single quotes
description: 'We''re living...'
```

**Issue: Build Hangs at "Syncing content"**
- Cause: File missing required frontmatter
- Fix: Add frontmatter or move to `drafts/` or `private/`

**Issue: Mount Not Available**
- Cause: Not connected to Unraid
- Fix: Connect via Teleport VPN or local network

### Build System Details

**Local-Remote Hybrid Architecture:**
- ✅ **Always Available** (local on Mac):
  - Write/edit posts in Obsidian
  - Astro project code
  - Symlink: Astro `src/content/blog` → Obsidian Blog folder

- ⚠️ **Requires Unraid Connection**:
  - Running `npm run build`
  - Viewing deployed site
  - `/Volumes/blog` mount must be active

**Automated Builds** (Optional):
```bash
# Edit crontab
crontab -e

# Add line (builds 3x daily at 6am, 2pm, 10pm):
0 6,14,22 * * * cd /Users/pbarrick/Desktop/dev/blog && npm run build >> ./logs/cron-build.log 2>&1

# View logs:
tail -f /Users/pbarrick/Desktop/dev/blog/logs/cron-build.log
```

### Quick Reference Commands

```bash
# Navigate to project
cd /Users/pbarrick/Desktop/dev/blog

# Build (requires Unraid connection)
npm run build

# Dev server (works offline)
npm run dev

# Validate posts
npm run astro check

# Preview production build
npm run preview

# Check what will be published
ls /Users/pbarrick/Documents/Main/Resources/Learning/Blog/*.md
# (Excludes drafts/ and private/ folders)
```

### VSCode Workflow

1. **Open Project**: `code /Users/pbarrick/Desktop/dev/blog`
2. **Edit Posts**: Posts are symlinked, so edits in VSCode reflect in Obsidian
3. **Terminal**: Built-in terminal for build commands
4. **Extensions Recommended**:
   - Astro language support
   - Markdown linting
   - YAML validation

### Documentation

**Comprehensive Guides:**
- Infrastructure: `/Resources/Learning/Blog/drafts/Blog Infrastructure & Deployment Guide.md`
- Setup: `/Resources/Learning/Blog/drafts/setting up local-remote-hybrid-astro-build-system.md`
- Original: `/Resources/Learning/Blog/Creating Astro posts in Obsidian.md`