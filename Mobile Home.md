---
cssclasses:
  - mobile-home
---

# Quick Capture

--- start-multi-column: ID_mobilecapture
```column-settings
Number of Columns: 3
Largest Column: standard
Border: off
Shadow: off
```

```button
name Thought
type command
action QuickAdd: QuickNote
customColor #17a2b8
customTextColor #fff
```

--- column-break ---

```button
name Todo
type command
action QuickAdd: QuickTask
customColor #ffc107
customTextColor #000
```

--- column-break ---

```button
name Person
type command
action QuickAdd: Person
customColor #28a745
customTextColor #fff
```

--- end-multi-column

---

## Today

```journals-home
show:
  - day
scale: 3
```

```button
name Open Today's Note
type command
action Journals: Open today's note
customColor #007bff
customTextColor #fff
```

---

## Quick Links

<div class="mobile-nav-grid">
<a href="obsidian://open?vault=Main&file=Home" class="mobile-link">Home</a>
<a href="obsidian://open?vault=Main&file=Resources%2FZettlekasten%2FQuick%20Tasks" class="mobile-link">Quick Tasks</a>
<a href="obsidian://open?vault=Main&file=Resources%2FHistory%2FQuick%20Notes" class="mobile-link">Quick Notes</a>
<a href="obsidian://open?vault=Main&file=Resources%2FPeople%2Findex" class="mobile-link">People</a>
</div>

---

## High Priority

```dataview
TASK
FROM "Resources/Agenda/Tasks"
WHERE !completed AND contains(text, "⏫")
SORT due ASC
LIMIT 5
```

---

## Recent People

```dataview
LIST
FROM "Resources/People"
WHERE file.name != "index"
SORT file.mtime DESC
LIMIT 5
```
