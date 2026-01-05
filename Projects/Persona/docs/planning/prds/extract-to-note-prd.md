# Extract to Note PRD

**Status:** Draft
**Date:** 2025-12-30
**Priority:** High
**Tags:** #persona #zettelkasten #obsidian-plugin #feature

## Problem Statement

When researching or capturing information in daily notes, there's no streamlined way to:
1. Extract content into the Zettelkasten knowledge base
2. Detect if a note on the topic already exists (avoiding duplicates)
3. Distinguish between a single atomic note vs a larger subject requiring a folder structure

Currently, users manually create notes and risk:
- Duplicate notes on the same topic scattered across the vault
- Inconsistent folder structures for multi-note subjects
- No connection back to the source content

## Goals

1. **One-click extraction** from daily notes/documents to Zettelkasten
2. **Duplicate detection** - find and link to existing notes instead of creating new ones
3. **Smart categorization** - determine if content warrants a single note or a subject folder
4. **Bidirectional linking** - connect source to extracted note and vice versa

## User Stories

### US-1: Extract Simple Note
> As a user, when I select text and trigger "Extract to Note", I want the content extracted to a new Zettelkasten note, with the original text replaced by a link to the new note.

### US-2: Detect Existing Notes
> As a user, when extracting content, I want the system to search for existing notes on the same topic and offer to link to them instead of creating a duplicate.

### US-3: Create Subject Folder
> As a user, when extracting content about a broad topic (e.g., "Kubernetes Security"), I want the system to create a subject folder with an index.md and place the atomic note inside it.

### US-4: Expand Existing Subject
> As a user, when extracting content related to an existing subject folder, I want the new note added to that folder and linked from the index.

---

## Feature Design

### Trigger Methods

| Method | Description |
|--------|-------------|
| Command Palette | `Persona: Extract to Note` |
| Context Menu | Right-click selected text > "Extract to Note" |
| Hotkey | Configurable (suggested: `Cmd+Shift+E`) |
| Ribbon Icon | Optional, matches existing Persona bot icon |

### Extraction Flow

```
User selects text → Triggers extraction
        ↓
┌─────────────────────────────────────┐
│  1. ANALYZE CONTENT                 │
│  - Extract title/topic from text    │
│  - Identify key concepts & tags     │
│  - Estimate complexity (note/subj)  │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│  2. DUPLICATE DETECTION             │
│  - Search Zettelkasten for matches  │
│  - Check note titles (fuzzy match)  │
│  - Check content similarity         │
│  - Check existing subject folders   │
└─────────────────────────────────────┘
        ↓
  ┌─────────┴─────────┐
  │                   │
Match Found      No Match
  │                   │
  ↓                   ↓
┌────────────┐  ┌────────────────────┐
│ LINK MODE  │  │ CREATE MODE        │
│ - Show     │  │ - Note vs Subject? │
│   matches  │  │ - Generate content │
│ - User     │  │ - Apply template   │
│   picks    │  │ - Create file(s)   │
└────────────┘  └────────────────────┘
        │                   │
        └─────────┬─────────┘
                  ↓
┌─────────────────────────────────────┐
│  3. UPDATE SOURCE                   │
│  - Replace selection with link      │
│  - Add backlink reference           │
└─────────────────────────────────────┘
```

### Note vs Subject Classification

**Atomic Note Criteria:**
- Single focused concept
- Can be explained in < 500 words
- No obvious sub-topics
- Answer to a specific question

**Subject Folder Criteria:**
- Broad topic with multiple facets
- Contains multiple distinct concepts
- Would benefit from an index/overview
- Examples: "Kubernetes", "React Hooks", "Sales Pipeline"

#### Subject Folder Structure

```
Resources/Zettlekasten/
└── [Subject Name]/
    ├── index.md           # Overview, links to all notes in subject
    ├── [Atomic Note 1].md
    ├── [Atomic Note 2].md
    └── ...
```

**index.md Template:**
```markdown
---
type: subject-index
created: {{date}}
tags:
  - subject
  - {{topic-tags}}
---

# {{Subject Name}}

## Overview
{{Brief description of the subject}}

## Notes in this Subject
{{Auto-generated list of notes in folder}}

## Related Subjects
{{Links to related subject folders}}
```

### Duplicate Detection Algorithm

1. **Title Matching** (fuzzy, threshold: 80%)
   - Compare extracted title against existing note titles
   - Use Levenshtein distance or similar algorithm

2. **Content Similarity** (optional, if title match < 80%)
   - TF-IDF or embedding-based similarity
   - Threshold: 70% similarity

3. **Tag Overlap**
   - If 3+ tags match existing note, flag as potential duplicate

4. **Subject Folder Check**
   - If extracted content matches existing subject folder topic
   - Offer to add as new note within that subject

### Modal UI Design

```
┌─────────────────────────────────────────────────────┐
│  Extract to Note                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Title: [Auto-detected title__________________]     │
│                                                      │
│  Location: [Tech / Kubernetes / ▼ ]                 │
│            ○ New subject folder  ○ Existing         │
│                                                      │
│  Type: ○ Atomic Note  ○ Subject (creates folder)    │
│                                                      │
│  ─────────────────────────────────────────────────  │
│  ⚠️ Potential Duplicates Found:                      │
│                                                      │
│  ☐ "Similar Topic Name" (85% match)                 │
│      → Link to existing instead                     │
│                                                      │
│  ☐ Subject: "Kubernetes/" (topic match)             │
│      → Add to existing subject folder               │
│                                                      │
│  ─────────────────────────────────────────────────  │
│  Tags: [kubernetes] [security] [+add]               │
│                                                      │
│  ☐ Enhance with AI (expand, add context)            │
│                                                      │
│  [Cancel]                        [Extract Note]     │
└─────────────────────────────────────────────────────┘
```

### QuickAdd Integration

The extraction workflow should integrate with existing QuickAdd macros:

**Option A: QuickAdd Capture**
- Register as a QuickAdd choice/capture
- User can trigger via existing QuickAdd hotkey
- Appears in QuickAdd menu alongside other actions

**Option B: QuickAdd Template**
- Create companion templates in `Resources/General/Templates/`
- `Zettelkasten Note Template.md` - Atomic note
- `Zettelkasten Subject Index Template.md` - Subject folder index

**Recommended Approach:** Both - expose as QuickAdd choice AND use templates for consistency.

---

## Technical Implementation

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/ExtractionService.ts` | CREATE | Core extraction logic |
| `src/services/DuplicateDetector.ts` | CREATE | Note matching algorithm |
| `src/ui/ExtractNoteModal.ts` | CREATE | Modal UI for extraction |
| `src/main.ts` | MODIFY | Register commands & ribbon |
| `src/types.ts` | MODIFY | Add extraction-related types |
| `styles.css` | MODIFY | Modal styling |

### New Types

```typescript
interface ExtractionResult {
  title: string;
  content: string;
  suggestedType: 'note' | 'subject';
  suggestedTags: string[];
  duplicates: DuplicateMatch[];
  relatedSubjects: string[];
}

interface DuplicateMatch {
  path: string;
  title: string;
  matchScore: number;  // 0-100
  matchType: 'title' | 'content' | 'tags';
}

interface SubjectFolder {
  path: string;
  name: string;
  noteCount: number;
  hasIndex: boolean;
}
```

### Commands to Register

```typescript
// Extract to Note command
this.addCommand({
  id: 'extract-to-note',
  name: 'Extract to Zettelkasten Note',
  editorCallback: (editor, view) => {
    const selection = editor.getSelection();
    if (selection) {
      new ExtractNoteModal(this.app, this, selection).open();
    }
  }
});
```

---

## Configuration Options

Add to plugin settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `zettelkastenPath` | string | `Resources/Zettlekasten` | Base path for notes |
| `duplicateThreshold` | number | 80 | Match score to flag as duplicate |
| `autoDetectType` | boolean | true | Auto-suggest note vs subject |
| `showConfirmModal` | boolean | true | Show modal or quick-create |
| `defaultTags` | string[] | `['zettelkasten']` | Tags added to all notes |

---

## Zettelkasten Note Template

**Atomic Note (Resources/Zettlekasten/[Title].md):**

```markdown
---
type: zettelkasten
created: {{date}}
source: {{source-file}}
tags:
  - {{extracted-tags}}
---

# {{Title}}

{{Extracted content}}

## Source
Extracted from: [[{{source-file}}]]

## Related
- [[Related Note 1]]
- [[Related Note 2]]
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No text selected | Show notice: "Select text to extract" |
| Very short selection (<10 chars) | Warn user, allow anyway |
| Selection spans multiple notes | Only extract from active note |
| Subject folder exists, no index.md | Create index.md automatically |
| Duplicate detection off | Skip step 2, always create new |
| Note title conflicts | Append date suffix: `Title (2025-12-30)` |

---

## Success Metrics

1. **Extraction rate** - Notes extracted per week
2. **Duplicate prevention** - % of extractions that link to existing notes
3. **Subject folder adoption** - # of subject folders created
4. **User friction** - Average clicks/time to complete extraction

---

## Implementation Phases

### Phase 1: Core Extraction (MVP)
- [x] Add extraction types to `src/types.ts`
- [x] Create `src/services/DuplicateDetector.ts`
- [x] Create `src/services/ExtractionService.ts`
- [x] Create `src/ui/ExtractNoteModal.ts`
- [x] Register command in `src/main.ts`
- [x] Add styles to `styles.css`
- [x] Build plugin successfully
- [ ] Test basic extraction flow in Obsidian

### Phase 2: Subject Folders
- [x] Subject folder creation (basic - included in Phase 1)
- [x] index.md generation (basic - included in Phase 1)
- [x] Add-to-existing-subject flow (enhance UI)
- [x] Auto-link within subject
- [x] Nested folder navigation UI

### Phase 3: Smart Detection
See separate PRD: [[smart-detection-prd]]

---

## Decisions

| Question | Decision |
|----------|----------|
| Nested subjects? | **Yes** - Support nested folders (e.g., `Tech/Kubernetes/Security/`) |
| QuickAdd integration? | **Yes** - Integrate with existing QuickAdd workflows |
| AI enhancement? | **Optional toggle** - Default OFF, user can enable per-extraction |
| Source file scope? | **Phase 1: Daily notes only**, Phase 2+: Any file in vault |

### Nested Subject Structure

```
Resources/Zettlekasten/
└── Tech/
    └── Kubernetes/
        ├── index.md
        └── Security/
            ├── index.md
            ├── Pod Security Standards.md
            └── Network Policies.md
```

Each level maintains its own `index.md` with links to child subjects and notes.

### AI Enhancement Toggle

When enabled, the extraction will:
- Expand abbreviations and jargon
- Add context and definitions
- Suggest related topics
- Format content for readability

Default: **OFF** (preserves original content exactly)

### Bidirectional Organization

**Source → Note:**
- Original text replaced with: `[[Note Title]]` or `> Extracted to [[Note Title]]`
- Maintains reading flow in source document

**Note → Source:**
- Frontmatter includes: `source: [[2025-12-30]]`
- "Source" section at bottom with backlink
- Breadcrumb if nested: `Tech > Kubernetes > Security > This Note`

---

## Related Documentation

- [[Persona Agent System]] - Parent project
- [[Researcher Agent]] - Answers `[?]` questions, creates similar notes
- [[Zettelkasten Method]] - Note-taking methodology reference
