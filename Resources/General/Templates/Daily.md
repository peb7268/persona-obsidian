---
pomodoros_hit: 0
pomodoros_goal: 4
row_or_run: 0
water_drank: 0
strength: 0
cardio: 0
read: 0
---

--- start-multi-column: ID_quickactions
```column-settings
Number of Columns: 4
Largest Column: standard
Border: off
Shadow: off
```

```button
name New Meeting
type command
action QuickAdd: New Meeting
customColor #4285F4
customTextColor #fff
```

--- column-break ---

```button
name Ad-Hoc
type command
action QuickAdd: Ad-Hoc
customColor #5A9CF4
customTextColor #fff
```

--- column-break ---

```button
name 1:1
type command
action QuickAdd: 1to1
customColor #7AB3F4
customTextColor #fff
```

--- column-break ---

```button
name Person
type command
action QuickAdd: Person
customColor #3B78D4
customTextColor #fff
```

--- end-multi-column

---

```journals-home
show:
  - day
  - week
  - month
  - quarter
scale: 2
separator: " | "
```

---

```journal-nav
Type: Day
```

---

![[Resources/Agenda/Weekly/{{date:YYYY}}-W{{date:WW}}#^Week {{date:WW}} Focus]]

---

### Today's Meetings
```dataview
TABLE
    Subject,
    People
FROM "Archive/Meetings"
WHERE
    date(date) = date(this.file.name)
```

---

## Stream of Thought

### Tasks
<!-- Tasks that do not fit into one of the buckets below or are dumped here before being moved to the below sections ...  -->
* 

### MCO
<!-- Work-related thoughts, tasks, and notes - prioritized first -->
* <% tp.file.cursor() %>

### Personal
<!-- Personal tasks, ideas, and reminders -->
*

### Journal
<!-- Reflections, feelings, and daily observations -->
*

---

## Notes
<!-- Extracted notes and references -->

---

> [!abstract]- Personal & MCO
> ![[Resources/General/Embeds/PersonalMCO-Section]]

---

> [!abstract]- MHM Business (Sales)
> ![[Resources/General/Embeds/MHM-Business-Section]]

---

> [!info]- Quick References
> ### Starred/Pinned Items
> ```dataview
> TABLE file.name as Name, file.mtime as Updated
> FROM ""
> WHERE contains(file.tags, "pinned") OR contains(file.tags, "starred")
> SORT file.mtime DESC
> LIMIT 5
> ```
>
> ### Recent Files
> ```dataview
> TABLE file.name as Name, file.mtime as Modified
> FROM ""
> SORT file.mtime DESC
> LIMIT 5
> ```

---

> [!tip]- Quick Start Guide
> ![[Resources/General/Embeds/Daily-Quick-Start]]

---

*Daily Note: {{date}} | [[Home]] | [[Resources/Agenda/Weekly/{{date:YYYY}}-W{{date:WW}}|W{{date:WW}}]] | [[Resources/Agenda/Monthly/{{date:YYYY-MM}}|{{date:MMMM}}]] | [[Resources/Agenda/Quarterly/{{date:YYYY}}-Q{{date:Q}}|Q{{date:Q}}]]*
