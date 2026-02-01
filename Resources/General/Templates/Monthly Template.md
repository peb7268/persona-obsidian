---
journal: Monthly
journal-date: <% tp.date.now("YYYY-MM-DD") %>
journal-index: <% tp.date.now("M") %>
month: <% tp.date.now("YYYY-MM") %>
quarter: <% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %>
month_start: <% tp.date.now("YYYY-MM-01") %>
month_end: <% moment(tp.date.now("YYYY-MM-DD")).endOf('month').format("YYYY-MM-DD") %>
monthly_goal_1: ""
monthly_goal_1_progress: 0
monthly_goal_2: ""
monthly_goal_2_progress: 0
monthly_goal_3: ""
monthly_goal_3_progress: 0
---

```journal-nav
Type: Month
```

---

## <% tp.date.now("MMMM YYYY") %> Overview

### Quarterly Context
**Current Quarter**: [[Resources/Agenda/Quarterly/<% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %>|Q<% tp.date.now("Q") %> <% tp.date.now("YYYY") %>]]

> [!note]- Quarterly Goals Reference
> ![[Resources/Agenda/Quarterly/<% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %>#Goals]]

---

## Monthly Goals
^MonthlyGoals

*Derived from quarterly goals - what will you accomplish this month?*

| # | Goal | Progress | Status |
|---|------|----------|--------|
| 1 | <% tp.file.cursor() %> | 0% | pending |
| 2 |      | 0% | pending |
| 3 |      | 0% | pending |

---

## Habits (1 Month View)

--- start-multi-column: ID_monthly_habits
```column-settings
Number of Columns: 3
Largest Column: standard
Border: false
Alignment: center
```

```tracker
searchType: frontmatter
searchTarget: pomodoros_goal, pomodoros_hit
datasetName: Goal, Hit
startDate: -1M
folder: Resources/Agenda/Daily
fixedScale: 1
accum: true
line:
    title: Pomodoros
    yAxisLabel: Pomodoros Goal vs Pomodoros Hit
    lineColor: orange, green
    showLegend: true
```

--- column-break ---

```tracker
searchType: frontmatter
searchTarget: row_or_run
datasetName: Cardio
startDate: -1M
folder: Resources/Agenda/Daily
fixedScale: 1
month:
    color: blue
```

--- column-break ---

```tracker
searchType: frontmatter
searchTarget: strength
startDate: -1M
datasetName: Strength Train
folder: Resources/Agenda/Daily
fixedScale: 1
month:
    startWeekOn: 'Mon'
    color: steelblue
```
```tracker
searchType: frontmatter
searchTarget: strength
startDate: -1M
datasetName: Strength Train
folder: Resources/Agenda/Daily
summary:
    template: "Longest Streak: {{maxStreak()}} day(s)\nLongest Breaks: {{maxBreaks()}} day(s)\nLast streak: {{currentStreak()}} day(s)"
```

--- end-multi-column

---

## Weekly Breakdown

### Week 1
- [[Resources/Agenda/Weekly/<% tp.date.now("YYYY") %>-W<% tp.date.now("WW", 0) %>|Week <% tp.date.now("WW", 0) %>]]
- Focus:
- Key deliverables:

### Week 2
- [[Resources/Agenda/Weekly/<% tp.date.now("YYYY") %>-W<% tp.date.now("WW", 7) %>|Week <% tp.date.now("WW", 7) %>]]
- Focus:
- Key deliverables:

### Week 3
- [[Resources/Agenda/Weekly/<% tp.date.now("YYYY") %>-W<% tp.date.now("WW", 14) %>|Week <% tp.date.now("WW", 14) %>]]
- Focus:
- Key deliverables:

### Week 4
- [[Resources/Agenda/Weekly/<% tp.date.now("YYYY") %>-W<% tp.date.now("WW", 21) %>|Week <% tp.date.now("WW", 21) %>]]
- Focus:
- Key deliverables:

---

## Stream of Thought Rollup

> [!warning]- Incomplete Tasks (This Month)
> ```dataview
> TASK FROM "Resources/Agenda/Daily"
> WHERE file.day >= this.month_start AND file.day <= this.month_end
> WHERE contains(meta(section).subpath, "Tasks")
> WHERE !completed
> GROUP BY file.link
> ```

> [!todo]- MCO Incomplete (This Month)
> ```dataview
> TASK FROM "Resources/Agenda/Daily"
> WHERE file.day >= this.month_start AND file.day <= this.month_end
> WHERE contains(meta(section).subpath, "MCO")
> WHERE !completed
> GROUP BY file.link
> ```

> [!info]- Personal Incomplete (This Month)
> ```dataview
> TASK FROM "Resources/Agenda/Daily"
> WHERE file.day >= this.month_start AND file.day <= this.month_end
> WHERE contains(meta(section).subpath, "Personal")
> WHERE !completed
> GROUP BY file.link
> ```

---

## Scratch / Notes



---

> Quote


---

--- start-multi-column: ID_monthly_tasks
```column-settings
Number of Columns: 2
Largest Column: standard
```

## Tasks
- [ ]

--- column-end ---

## Action Items
*Priority items to follow up on*
1.

--- end-multi-column

---

## What I Did This Month

### Completed Tasks by Week
```dataview
TASK FROM "Resources/Agenda/Daily"
WHERE file.day >= this.month_start AND file.day <= this.month_end
WHERE completed
GROUP BY dateformat(file.day, "yyyy-'W'WW")
```

### Meetings This Month
```dataview
TABLE WITHOUT ID file.link as Meeting, Subject, People, date as Date
FROM "Archive/Meetings"
WHERE date >= this.month_start AND date <= this.month_end
SORT date DESC
```

---

## Monthly Retrospective
*Fill out at end of month*

### Accomplishments


### Challenges


### Learnings


---

*Monthly Note: <% tp.date.now("MMMM YYYY") %> | [[Home]] | [[Resources/Agenda/Quarterly/<% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %>|Q<% tp.date.now("Q") %>]]*
