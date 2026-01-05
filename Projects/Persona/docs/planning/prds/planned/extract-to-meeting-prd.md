# Extract to Meeting PRD

**Status:** Draft
**Date:** 2025-12-30
**Priority:** High
**Tags:** #persona #obsidian-plugin #feature #crm

## Problem Statement

When capturing meeting notes in the daily note's Stream of Thought section, there's no streamlined way to:
1. Extract meeting content to a properly structured meeting note
2. Automatically detect participants and link to their CRM profiles
3. Route to the correct meeting type folder (1to1, Ad-Hoc, Scrum, etc.)
4. Maintain bidirectional links between the daily note, meeting, and person files

Currently, users must:
- Manually create meeting notes via QuickAdd buttons
- Re-type participant names and subjects
- Lose context from the original stream of thought entry
- Manually ensure proper folder placement

## Goals

1. **One-click extraction** from stream of thought to structured meeting note
2. **Participant detection** - parse `[[Person Name]]` links from content
3. **Smart routing** - determine meeting type (1to1 vs Ad-Hoc vs group)
4. **CRM integration** - bidirectional links to person files via `People::` field
5. **Daily note integration** - meeting appears in Today's Meetings dataview

## User Stories

### US-1: Extract Meeting from Heading
> As a user, when I have a heading like "### Stalwart Update with [[Giorgio Catenacci]]", I want to extract everything under that heading into a proper meeting note.

### US-2: Detect Meeting Participants
> As a user, I want the system to automatically detect `[[Person Name]]` links in my content and populate the `People::` field for CRM tracking.

### US-3: Smart Meeting Type Detection
> As a user, I want the system to suggest the appropriate meeting type:
> - 1 person link → 1to1
> - Multiple person links → Ad-Hoc (group meeting)
> - Keywords like "standup" or "scrum" → Scrum

### US-4: Appear in Today's Meetings
> As a user, after extracting a meeting, I want it to immediately appear in the "Today's Meetings" dataview on my daily note.

### US-5: CRM Bidirectional Linking
> As a user, I want the extracted meeting to show up in each participant's "Meetings" section on their person file.

---

## Feature Design

### Trigger Methods

| Method | Description |
|--------|-------------|
| Command Palette | `Persona: Extract to Meeting` |
| Context Menu | Right-click selected text > "Extract to Meeting" |
| Hotkey | Configurable (suggested: `Cmd+Shift+M`) |

### Content Detection

The extraction should intelligently parse:

```
### Stalwart Update with [[Giorgio Catenacci]]
* Discussed the new API changes
* Need to follow up on authentication
* [?] How does the caching work?
```

**Detected Fields:**
- Subject: "Stalwart Update" (from heading, minus participant names)
- Participants: `[[Giorgio Catenacci]]` (from links in heading/content)
- Content: Bullet points become agenda/notes
- Research questions: `[?]` markers preserved or extracted separately

### Extraction Flow

```
User selects heading + content → Triggers extraction
        ↓
┌─────────────────────────────────────┐
│  1. PARSE CONTENT                   │
│  - Extract subject from heading     │
│  - Find [[Person]] links            │
│  - Identify bullet points/content   │
│  - Detect meeting type keywords     │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│  2. DETERMINE MEETING TYPE          │
│  - 1 person → suggest 1to1          │
│  - 2+ people → suggest Ad-Hoc       │
│  - Keywords → Scrum/Leadership/etc  │
│  - User can override                 │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│  3. BUILD MEETING NOTE              │
│  - Apply Meeting template           │
│  - Populate People:: field          │
│  - Set Subject:: and Date::         │
│  - Add content to Agenda section    │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│  4. CREATE & LINK                   │
│  - Create file in correct folder    │
│  - Replace source with link         │
│  - Format: * Meeting: [[link]]      │
└─────────────────────────────────────┘
```

### Meeting Type Detection

| Condition | Suggested Type | Folder Path |
|-----------|---------------|-------------|
| 1 `[[Person]]` link | 1to1 | `Archive/Meetings/1to1/{Person Name}/` |
| 2+ `[[Person]]` links | Ad-Hoc | `Archive/Meetings/Ad-Hoc/{Subject}/` |
| Keywords: standup, scrum, daily | Scrum | `Archive/Meetings/Scrum/` |
| Keywords: leadership, exec | Leadership | `Archive/Meetings/Leadership/` |
| Keywords: personal, family | Personal | `Archive/Meetings/Personal/` |
| Keywords: planning, sprint | PandE | `Archive/Meetings/PandE/` |

### Modal UI Design

```
┌─────────────────────────────────────────────────────┐
│  Extract to Meeting                                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Subject: [Stalwart Update____________________]     │
│                                                      │
│  Participants:                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ ☑ [[Giorgio Catenacci]]                      │   │
│  │ ☐ + Add participant...                       │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Meeting Type: [1to1 ▼]                             │
│    ○ 1to1  ○ Ad-Hoc  ○ Scrum  ○ Other              │
│                                                      │
│  Date: [2025-12-30] (defaults to today)             │
│                                                      │
│  ─────────────────────────────────────────────────  │
│  Content Preview:                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ * Discussed the new API changes              │   │
│  │ * Need to follow up on authentication        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [Cancel]                        [Extract Meeting]  │
└─────────────────────────────────────────────────────┘
```

### Generated Meeting Note

**Path:** `Archive/Meetings/1to1/Giorgio Catenacci/2025-12-30 - Stalwart Update.md`

```markdown
---
date: 2025-12-30
searchableSubject: Stalwart Update
type: meeting
company:
---

People:: [[Resources/People/Giorgio Catenacci]]
Subject:: Stalwart Update
Date:: [[Resources/Agenda/Daily/2025-12-30|2025-12-30]]

---

**Doc**
< insert doc links >

**Agenda**
- Discussed the new API changes
- Need to follow up on authentication

**Open Questions**
1. How does the caching work?

**Decisions Made**


**Action Items**



**Recap / Parking Lot**

```

### Source Replacement

Original content in daily note:
```markdown
### Stalwart Update with [[Giorgio Catenacci]]
* Discussed the new API changes
* Need to follow up on authentication
```

After extraction:
```markdown
* Meeting: [[Archive/Meetings/1to1/Giorgio Catenacci/2025-12-30 - Stalwart Update|Stalwart Update with Giorgio]]
```

---

## Technical Implementation

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/MeetingExtractionService.ts` | CREATE | Meeting-specific extraction logic |
| `src/services/PersonDetector.ts` | CREATE | Parse `[[Person]]` links, validate against People folder |
| `src/ui/ExtractMeetingModal.ts` | CREATE | Modal UI for meeting extraction |
| `src/main.ts` | MODIFY | Register meeting extraction command |
| `src/types.ts` | MODIFY | Add meeting extraction types |
| `styles.css` | MODIFY | Modal styling |

### New Types

```typescript
interface MeetingExtractionResult {
  subject: string;
  participants: PersonLink[];
  content: string;
  suggestedType: MeetingType;
  detectedQuestions: string[];
  sourceHeading?: string;
}

interface PersonLink {
  name: string;
  path: string;
  exists: boolean;
}

type MeetingType = '1to1' | 'Ad-Hoc' | 'Scrum' | 'Leadership' | 'PandE' | 'Personal';

interface MeetingExtractionOptions {
  subject: string;
  participants: PersonLink[];
  type: MeetingType;
  date: string;
  content: string;
  sourceFile: string;
}
```

### Commands to Register

```typescript
// Extract to Meeting command
this.addCommand({
  id: 'extract-to-meeting',
  name: 'Extract to Meeting',
  editorCallback: (editor, view) => {
    const selection = editor.getSelection();
    if (selection) {
      new ExtractMeetingModal(this.app, this, selection, view.file).open();
    }
  }
});
```

---

## CRM Integration Details

### Bidirectional Linking Flow

```
Daily Note                    Meeting Note                   Person File
───────────                   ────────────                   ───────────

Stream of Thought    ──────>  People:: [[Giorgio]]  <──────  Meetings dataview
* Meeting: [[link]]           Date:: [[2025-12-30]]          (auto-queries People field)
                              Subject:: Stalwart Update
```

**Person File Query (already exists):**
```dataview
table Subject, Date
from "Archive/Meetings"
where contains(People, this.file.link)
sort Date desc
```

This query automatically picks up any meeting with `People:: [[Resources/People/Giorgio Catenacci]]`.

### Multi-Participant Handling

For group meetings:
```markdown
People:: [[Resources/People/Giorgio Catenacci]], [[Resources/People/John Smith]]
```

Both person files will show this meeting in their Meetings section.

---

## Configuration Options

Add to plugin settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `meetingsPath` | string | `Archive/Meetings` | Base path for meetings |
| `peoplePath` | string | `Resources/People` | Path to person files |
| `defaultMeetingType` | MeetingType | `Ad-Hoc` | Default when type unclear |
| `autoDetectType` | boolean | true | Auto-suggest meeting type |
| `createPersonIfMissing` | boolean | false | Create person file if not found |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No `[[Person]]` links found | Prompt user to add participants or proceed without |
| Person file doesn't exist | Warning + option to create |
| Meeting folder doesn't exist | Create folder automatically |
| Duplicate meeting name | Append time suffix: `2025-12-30 1430 - Subject.md` |
| No heading selected | Use first line as subject |
| Empty content | Create meeting with empty agenda |
| Multiple `[?]` questions | Move to Open Questions section |

---

## Implementation Phases

### Phase 1: Core Extraction (MVP)
- [ ] Add meeting extraction types to `src/types.ts`
- [ ] Create `src/services/PersonDetector.ts`
- [ ] Create `src/services/MeetingExtractionService.ts`
- [ ] Create `src/ui/ExtractMeetingModal.ts`
- [ ] Register command in `src/main.ts`
- [ ] Add styles to `styles.css`
- [ ] Test basic extraction flow

### Phase 2: Smart Detection
- [ ] Meeting type keyword detection
- [ ] Multi-participant handling
- [ ] Subject extraction from heading
- [ ] Research question (`[?]`) extraction

### Phase 3: CRM Enhancement
- [ ] Person file existence validation
- [ ] Option to create missing person files
- [ ] Preview of CRM impact
- [ ] Link to person file from modal

---

## Relationship to Extract to Atomic Note

| Feature | Extract to Atomic Note | Extract to Meeting |
|---------|----------------------|-------------------|
| Target folder | Zettelkasten | Archive/Meetings |
| Template | Zettelkasten note | Meeting template |
| Duplicate detection | Title fuzzy match | Date + Subject match |
| CRM integration | None | People:: field |
| Source replacement | `* Note: [[link]]` | `* Meeting: [[link]]` |
| Type detection | note vs subject | 1to1/Ad-Hoc/Scrum/etc |

Both features share:
- Selection-based trigger
- Modal UI pattern
- Source replacement
- Bidirectional linking to source

---

## Success Metrics

1. **Extraction rate** - Meetings extracted per week
2. **CRM accuracy** - % of meetings with correct People:: links
3. **Type accuracy** - % of meetings with correct type suggestion
4. **User friction** - Clicks/time to complete extraction

---

## Related Documentation

- [[Extract to Note PRD]] - Similar extraction pattern for atomic notes
- [[Persona Agent System]] - Parent project
- [[Meeting Template]] - Existing meeting note template
- [[CRM Workflow]] - Person file and linking patterns
