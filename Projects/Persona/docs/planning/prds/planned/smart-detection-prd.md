# Smart Detection PRD

**Status:** Draft
**Date:** 2025-12-30
**Priority:** Medium
**Tags:** #persona #zettelkasten #obsidian-plugin #feature
**Parent:** [[extract-to-note-prd]]

## Problem Statement

The current Extract to Note feature uses basic title matching (Levenshtein distance) to detect potential duplicates. This approach has limitations:

1. **Title-only matching** - Content with different titles but similar concepts is not detected
2. **No tag intelligence** - Existing vault tags are not leveraged for recommendations
3. **No relationship awareness** - Related notes are not surfaced during extraction
4. **No learning** - User corrections are not used to improve future suggestions

## Goals

1. **Content similarity** - Detect semantic similarity between new and existing notes
2. **Tag recommendations** - Suggest tags based on content and existing vault patterns
3. **Related notes** - Surface potentially related notes during extraction
4. **Adaptive learning** - Improve suggestions based on user behavior

## User Stories

### US-1: Content Similarity Detection
> As a user, when extracting content that is semantically similar to an existing note (even if titles differ), I want to be warned about the potential duplicate.

### US-2: Smart Tag Suggestions
> As a user, I want tags suggested based on the content I'm extracting and patterns from my existing notes.

### US-3: Related Notes
> As a user, when extracting a note, I want to see related notes I might want to link to.

### US-4: Learning from Corrections
> As a user, when I correct a false duplicate detection or add a tag suggestion, I want the system to learn from my feedback.

---

## Feature Design

### Content Similarity Matching

**Approach Options:**

| Method | Pros | Cons |
|--------|------|------|
| TF-IDF | Fast, no external dependencies | Bag-of-words, misses semantics |
| Embeddings (local) | Semantic understanding | Large model size, slow |
| Embeddings (API) | Best quality | Requires API key, latency |
| Keyword extraction | Simple, fast | Limited accuracy |

**Recommended:** Start with TF-IDF for speed, with optional API-based embeddings for higher accuracy.

**Implementation:**
```typescript
interface ContentMatch {
  path: string;
  title: string;
  similarity: number;  // 0-100
  matchType: 'content' | 'hybrid';
  sharedConcepts: string[];
}

async findContentMatches(content: string): Promise<ContentMatch[]>
```

**Algorithm:**
1. Tokenize and stem input content
2. Build TF-IDF vector
3. Compare against cached vectors for Zettelkasten notes
4. Return notes above similarity threshold (configurable, default 60%)

### Tag Recommendations

**Sources for suggestions:**
1. **Content analysis** - Extract key terms from selected text
2. **Vault tag frequency** - Suggest commonly used tags
3. **Co-occurrence patterns** - If note mentions "Kubernetes", suggest related tags like "devops", "containers"
4. **Folder context** - Tags commonly used in the target subject folder

**Implementation:**
```typescript
interface TagSuggestion {
  tag: string;
  confidence: number;  // 0-100
  source: 'content' | 'frequency' | 'cooccurrence' | 'folder';
}

async suggestTags(content: string, targetPath: string): Promise<TagSuggestion[]>
```

### Related Notes Suggestions

Show notes that:
1. Share 2+ tags with the new content
2. Are in the same subject folder
3. Have backlinks to similar topics
4. Were created around the same time as the source

**Implementation:**
```typescript
interface RelatedNote {
  path: string;
  title: string;
  relevance: number;  // 0-100
  relationshipType: 'tags' | 'folder' | 'backlinks' | 'temporal';
}

async findRelatedNotes(
  content: string,
  tags: string[],
  targetPath: string
): Promise<RelatedNote[]>
```

### Learning from User Corrections

Track user behavior to improve suggestions:

1. **False positive tracking** - If user ignores a duplicate warning, reduce its weight
2. **Tag acceptance rate** - Boost suggestions that are frequently accepted
3. **Link patterns** - Learn which notes users commonly link together

**Storage:** `data.json` in plugin folder
```json
{
  "tagAcceptance": {
    "kubernetes": { "suggested": 15, "accepted": 12 }
  },
  "duplicateOverrides": [
    { "note1": "path/a.md", "note2": "path/b.md", "isNotDuplicate": true }
  ],
  "linkPatterns": {
    "Kubernetes": ["Docker", "DevOps", "Cloud"]
  }
}
```

---

## Technical Implementation

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/ContentAnalyzer.ts` | CREATE | TF-IDF and similarity calculations |
| `src/services/TagRecommender.ts` | CREATE | Tag suggestion logic |
| `src/services/LearningService.ts` | CREATE | User feedback tracking |
| `src/services/DuplicateDetector.ts` | MODIFY | Add content matching |
| `src/ui/ExtractNoteModal.ts` | MODIFY | Display new suggestions |
| `src/types.ts` | MODIFY | Add new types |

### New Types

```typescript
interface ContentMatch {
  path: string;
  title: string;
  similarity: number;
  matchType: 'title' | 'content' | 'hybrid';
  sharedConcepts: string[];
}

interface TagSuggestion {
  tag: string;
  confidence: number;
  source: 'content' | 'frequency' | 'cooccurrence' | 'folder';
}

interface RelatedNote {
  path: string;
  title: string;
  relevance: number;
  relationshipType: 'tags' | 'folder' | 'backlinks' | 'temporal';
}

interface LearningData {
  tagAcceptance: Record<string, { suggested: number; accepted: number }>;
  duplicateOverrides: Array<{ note1: string; note2: string; isNotDuplicate: boolean }>;
  linkPatterns: Record<string, string[]>;
}
```

---

## Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `contentMatchThreshold` | number | 60 | Minimum similarity % to flag |
| `enableContentMatching` | boolean | true | Enable TF-IDF matching |
| `enableTagSuggestions` | boolean | true | Show smart tag suggestions |
| `enableLearning` | boolean | true | Track user corrections |
| `maxTagSuggestions` | number | 5 | Max tags to suggest |
| `maxRelatedNotes` | number | 5 | Max related notes to show |

---

## Implementation Phases

### Phase 3.1: Content Similarity (MVP)
- [ ] Create `ContentAnalyzer.ts` with TF-IDF implementation
- [ ] Build vocabulary from existing Zettelkasten notes
- [ ] Integrate with duplicate detection
- [ ] Update modal to show content matches

### Phase 3.2: Tag Recommendations
- [ ] Create `TagRecommender.ts`
- [ ] Extract vault tag frequency data
- [ ] Implement co-occurrence analysis
- [ ] Add tag suggestion UI to modal

### Phase 3.3: Related Notes
- [ ] Add backlink analysis to ContentAnalyzer
- [ ] Implement folder-based relationships
- [ ] Add "Related Notes" section to modal

### Phase 3.4: Learning System
- [ ] Create `LearningService.ts`
- [ ] Track tag acceptance/rejection
- [ ] Track duplicate override decisions
- [ ] Apply learned weights to future suggestions

---

## Performance Considerations

1. **Vocabulary caching** - Pre-compute TF-IDF vectors on plugin load
2. **Incremental updates** - Update vectors when notes change, not full rebuild
3. **Lazy loading** - Only analyze content when modal opens
4. **Background processing** - Run heavy computations off main thread

---

## Success Metrics

1. **Duplicate prevention** - % of extractions that correctly identify duplicates
2. **Tag suggestion acceptance** - % of suggested tags that users keep
3. **Related notes clicks** - How often users follow related note links
4. **Time to extract** - Average time from selection to extraction

---

## Open Questions

1. Should we integrate with Smart Connections plugin for embeddings?
2. What's the performance impact of TF-IDF on large vaults (10k+ notes)?
3. Should learning data sync across devices or be local only?

---

## Related Documentation

- [[extract-to-note-prd]] - Parent feature (Phases 1-2)
- [[Persona Agent System]] - Main project
- [[Zettelkasten Method]] - Note-taking methodology
