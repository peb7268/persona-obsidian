---
journal: Weekly
journal-date: <% tp.date.now("YYYY-MM-DD") %>
journal-index: <% tp.date.now("WW") %>
week: <% tp.date.now("YYYY") %>-W<% tp.date.now("WW") %>
month: <% tp.date.now("YYYY-MM") %>
quarter: <% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %>
weekly_goal_1: ""
weekly_goal_1_completed: false
weekly_goal_2: ""
weekly_goal_2_completed: false
weekly_goal_3: ""
weekly_goal_3_completed: false
---

```journal-nav
Type: Week
```

---

### Monthly Context
**Current Month**: [[Resources/Agenda/Monthly/<% tp.date.now("YYYY-MM") %>|<% tp.date.now("MMMM YYYY") %>]]

> [!note]- Monthly Goals Reference
> ![[Resources/Agenda/Monthly/<% tp.date.now("YYYY-MM") %>#MonthlyGoals]]

---

## Week <% tp.date.now("WW") %> Focus
^Week <% tp.date.now("WW") %> Focus

*What 3 things must get done this week to advance monthly goals?*

- [ ] <% tp.file.cursor() %>
- [ ]
- [ ]

---

## Habits

--- start-multi-column: ID_weekly_habits
```column-settings
Number of Columns: 4
Largest Column: standard
Border: off
Shadow: off
```

```tracker
searchType: frontmatter
searchTarget: pomodoros_goal, pomodoros_hit
datasetName: Goal, Hit
folder: Resources/Agenda/Daily
accum: true
line:
    title: Pomodoros
    yAxisLabel: Pomodoros Goal vs Pomodoros Hit
    lineColor: orange, green
    showLegend: true
```

--- end-column ---

```tracker
searchType: frontmatter
searchTarget: strength
datasetName: Lifting
folder: Resources/Agenda/Daily
accum: false
month:
    color: green
    showAnnotation: true
```

--- end-column ---

```tracker
searchType: frontmatter
searchTarget: cardio
datasetName: Cardio
folder: Resources/Agenda/Daily
accum: false
month:
    color: blue
```

--- end-column ---

```tracker
searchType: frontmatter
searchTarget: read
datasetName: Reading
folder: Resources/Agenda/Daily
accum: false
month:
    color: red
    showAnnotation: true
```

--- end-multi-column

---

> Quote


---

## Weekly Review
*Fill out at end of week*

### Wins


### Challenges


### Next Week Focus


---

*Weekly Note: W<% tp.date.now("WW") %> <% tp.date.now("YYYY") %> | [[Home]] | [[Resources/Agenda/Monthly/<% tp.date.now("YYYY-MM") %>|<% tp.date.now("MMMM") %>]] | [[Resources/Agenda/Quarterly/<% tp.date.now("YYYY") %>-Q<% tp.date.now("Q") %>|Q<% tp.date.now("Q") %>]]*
