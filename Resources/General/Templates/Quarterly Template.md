---
journal: Quarterly
journal-date: <% tp.date.now("YYYY-MM-DD") %>
journal-index: <% tp.date.now("Q") %>
quarter: <% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %>
year: <% tp.date.now("YYYY") %>
quarter_number: <% tp.date.now("Q") %>
goals_personal: 0
goals_personal_completed: 0
goals_professional: 0
goals_professional_completed: 0
goals_health: 0
goals_health_completed: 0
goals_mhm: 0
goals_mhm_completed: 0
revenue_target: 0
revenue_actual: 0
---

```journal-nav
Type: Quarter
```

---

## Q<% tp.date.now("Q") %> <% tp.date.now("YYYY") %> Overview

### Quarterly Theme
*What is the overarching focus this quarter?*

<% tp.file.cursor() %>

---

## Goals
^Goals

### Professional Goals (MCO)

| # | Goal | Target | Progress | Status |
|---|------|--------|----------|--------|
| 1 |      |        | 0%       | pending |
| 2 |      |        | 0%       | pending |
| 3 |      |        | 0%       | pending |

### Personal Goals

| # | Goal | Target | Progress | Status |
|---|------|--------|----------|--------|
| 1 |      |        | 0%       | pending |
| 2 |      |        | 0%       | pending |
| 3 |      |        | 0%       | pending |

### Health & Fitness Goals

| # | Goal | Target | Progress | Status |
|---|------|--------|----------|--------|
| 1 |      |        | 0%       | pending |
| 2 |      |        | 0%       | pending |
| 3 |      |        | 0%       | pending |

### MHM Business Goals

| Metric | Target | Actual | Progress |
|--------|--------|--------|----------|
| Revenue | $0 | $0 | 0% |
| New Customers | 0 | 0 | 0% |
| Pipeline Value | $0 | $0 | 0% |

---

## Monthly Breakdown

### Month 1
<%*
const m1 = tp.date.now("MMMM", 0);
const m1Link = tp.date.now("YYYY-MM", 0);
-%>
- **Month**: [[Resources/Agenda/Monthly/<% m1Link %>|<% m1 %>]]
- **Focus**:
- **Key Deliverables**:
  - [ ]

### Month 2
<%*
const m2 = tp.date.now("MMMM", 30);
const m2Link = tp.date.now("YYYY-MM", 30);
-%>
- **Month**: [[Resources/Agenda/Monthly/<% m2Link %>|<% m2 %>]]
- **Focus**:
- **Key Deliverables**:
  - [ ]

### Month 3
<%*
const m3 = tp.date.now("MMMM", 60);
const m3Link = tp.date.now("YYYY-MM", 60);
-%>
- **Month**: [[Resources/Agenda/Monthly/<% m3Link %>|<% m3 %>]]
- **Focus**:
- **Key Deliverables**:
  - [ ]

---

## Quarterly Habits Aggregation

```tracker
searchType: frontmatter
searchTarget: pomodoros_goal, pomodoros_hit
datasetName: Goal, Hit
folder: Resources/Agenda/Daily
startDate: -3M
accum: true
line:
    title: Pomodoros (Quarter)
    yAxisLabel: Pomodoros
    lineColor: orange, green
    showLegend: true
```

---

## Quarterly Retrospective
*Fill out at end of quarter*

### What went well?


### What could be improved?


### Key learnings


### Carry forward to next quarter
- [ ]

---

*Quarterly Note: <% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %> | [[Home]] | [[Resources/Agenda/Yearly/<% tp.date.now("YYYY") %>|<% tp.date.now("YYYY") %>]]*
