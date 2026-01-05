## MHM Agent Briefing
<!-- MHM agents write updates here -->
<!-- Morning briefing: 5:00 AM | Evening summary: 5:00 PM -->

### Research Update
*Awaiting researcher update...*

**Completed Research**:
- *None yet*

**Key Findings**:
- *None yet*

**Pending Research**:
- No items in queue

---

### Pipeline Status
**Current Pipeline**: `$=dv.pages('"Projects/Sales/Prospects/*/index"').length` prospects | `$=dv.pages('"Projects/Sales/Prospects/*/index"').where(p => p.qualification_score >= 75).length` qualified (75+)

### Hot Prospects (Need Action)
```dataview
LIST "🔥 " + company + " (" + qualification_score + "/100) - " + pipeline_stage
FROM "Projects/Sales/Prospects/*/index"
WHERE qualification_score >= 75
SORT qualification_score DESC
LIMIT 3
```

### Stagnant Prospects (Follow-up Required)
```dataview
LIST "⚠️ " + company + " - " + pipeline_stage + " (needs follow-up)"
FROM "Projects/Sales/Prospects/*/index"
WHERE date(updated) < date(today) - dur(3 days) AND pipeline_stage != "closed_won" AND pipeline_stage != "closed_lost"
SORT updated ASC
LIMIT 3
```

### Daily Sales Targets
- [ ] 10+ prospects researched
- [ ] 15+ contacts made
- [ ] 3+ qualified conversations
- [ ] [Sales Dashboard](obsidian://open?vault=Main&file=Projects%2FSales%2FSales-Analytics-Dashboard) review
