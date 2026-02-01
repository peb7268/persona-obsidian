---
journal: Quarterly
journal-date: <% tp.date.now("YYYY-MM-DD") %>
journal-index: <% tp.date.now("Q") %>
quarter: <% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %>
year: <% tp.date.now("YYYY") %>
quarter_number: <% tp.date.now("Q") %>
quarter_start: <% moment().startOf('quarter').format("YYYY-MM-DD") %>
quarter_end: <% moment().endOf('quarter').format("YYYY-MM-DD") %>
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

## Stream of Thought Rollup

> [!warning]- Incomplete Tasks (This Quarter)
> ```dataview
> TASK FROM "Resources/Agenda/Daily"
> WHERE file.day >= this.quarter_start AND file.day <= this.quarter_end
> WHERE contains(meta(section).subpath, "Tasks")
> WHERE !completed
> GROUP BY file.link
> ```

> [!todo]- MCO Incomplete (This Quarter)
> ```dataview
> TASK FROM "Resources/Agenda/Daily"
> WHERE file.day >= this.quarter_start AND file.day <= this.quarter_end
> WHERE contains(meta(section).subpath, "MCO")
> WHERE !completed
> GROUP BY file.link
> ```

> [!info]- Personal Incomplete (This Quarter)
> ```dataview
> TASK FROM "Resources/Agenda/Daily"
> WHERE file.day >= this.quarter_start AND file.day <= this.quarter_end
> WHERE contains(meta(section).subpath, "Personal")
> WHERE !completed
> GROUP BY file.link
> ```

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

## What I Did This Quarter

### Completed Tasks by Month
```dataview
TASK FROM "Resources/Agenda/Daily"
WHERE file.day >= this.quarter_start AND file.day <= this.quarter_end
WHERE completed
GROUP BY dateformat(file.day, "yyyy-MM MMMM")
```

### Meetings This Quarter
```dataview
TABLE WITHOUT ID file.link as Meeting, Subject, People, date as Date
FROM "Archive/Meetings"
WHERE date >= this.quarter_start AND date <= this.quarter_end
SORT date DESC
LIMIT 50
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
