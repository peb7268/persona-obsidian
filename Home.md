---
cssclasses:
  - cards
  - dashboard
  - home
banner: "![[home.jpg]]"
banner_y: 0.60595
banner_x: 0.49813
---

## ⚡ Quick Actions

<div class="nav-grid-mobile-fix">
<div class="nav-buttons-container">
  <a href="javascript:void(0)" onclick="app.commands.executeCommandById('quickadd:choice:Person')" class="nav-button nav-button-1" style="background-color: #28a745; color: #fff;">👤 Person</a>
  <a href="javascript:void(0)" onclick="app.commands.executeCommandById('quickadd:choice:QuickTask')" class="nav-button nav-button-2" style="background-color: #ffc107; color: #000;">✅ Quick Task</a>
  <a href="javascript:void(0)" onclick="app.commands.executeCommandById('quickadd:choice:QuickNote')" class="nav-button nav-button-3" style="background-color: #17a2b8; color: #fff;">📝 Quick Note</a>
  <a href="javascript:void(0)" onclick="app.commands.executeCommandById('quickadd:choice:VocabWord')" class="nav-button nav-button-4" style="background-color: #6f42c1; color: #fff;">🔤 Vocab Word</a>
<a href="obsidian://open?vault=Main&file=Resources%2FZettlekasten%2FBP%20And%20Sports%20Hernia%20Recovery" class="nav-button nav-button-7" style="background-color: #28a745; color: #fff;">💪 Health Regiment</a>
</div>
</div>

---

```journals-home
show:
  - day
  - week
  - month
scale: 2
separator: " | "
```
---
```calendar-timeline

```

---
```journal-nav
Type: Month
```

---

## 🏠 Quick Navigation

<div class="nav-grid-mobile-fix">
<div class="nav-buttons-container">
  <a href="obsidian://open?vault=Main&file=Resources%2FZettlekasten%2FRelationship%20Journey" class="nav-button nav-button-1" style="background-color: #dc3545; color: #fff;">Home Journal</a>
  <a href="obsidian://open?vault=Main&file=Resources%2FGeneral%2FTemplates%2FEnhanced%20Daily" class="nav-button nav-button-2" style="background-color: #085891; color: #fff;">Daily Template</a>
  <a href="obsidian://open?vault=Main&file=Ecomms%20Home" class="nav-button nav-button-3" style="background-color: #0967aa; color: #fff;">Ecomms Home</a>
  <a href="obsidian://open?vault=Main&file=Resources%2FLearning%2FGuitar%2FGuitar" class="nav-button nav-button-4" style="background-color: #0f578a; color: #fff;">Guitar Practice</a>
  <a href="obsidian://open?vault=Main&file=Resources%2FGeneral%2FWorkflow" class="nav-button nav-button-5" style="background-color: #034a7c; color: #fff;">Shortcuts</a>
  <a href="obsidian://open?vault=Main&file=Resources%2FLearning%2FLanguages%2FSpoken%2FSpoken%20Languages" class="nav-button nav-button-6" style="background-color: #175582; color: #fff;">Languages</a>
</div>
</div>
 
 ---
```localquote
id FnPcn
search Working Out
refresh 1d
```
---
## Current Learning Focus

[[Generative AI & Deep Learning Curriculum]]

---
## Currently Reading
```dataview
table without id ("![](" + cover +")") as Cover, author as Author,
"[[" + "Resources/Learning/Books/" + file.name + "|" + file.name + "]]" as Book
where cover != null
AND reading_priority != null
AND contains(shelves, "currently-reading")
sort reading_priority asc
limit 4
```


## Up Next
```dataview
table without id ("![](" + cover +")") as Cover, author as Author,
"[[" + "Resources/Learning/Books/" + file.name + "|" + file.name + "]]" as Book
where cover != null
AND reading_priority != null
AND contains(shelves, "to-read")
sort reading_priority asc
limit 4
```

---
```dataviewjs
try {
    const fetchStats = async() => {
        const response = await fetch(`https://leetcode-stats-api.herokuapp.com/peb7268`);
        const leetcodeStats = await response.json();
        return leetcodeStats;
    };

    const stats = await fetchStats(); 
    dv.span(`**LeetCode Problems Solved:** ${stats.totalSolved}`);
} catch (error) {
    dv.span("LeetCode stats unavailable");
}
```

---


## High Priority Tasks
```dataview
TASK
FROM "Resources/Agenda/Tasks/Inbox" OR "Resources/Agenda/Tasks/MCO" OR "Resources/Agenda/Tasks/Ideas To Do"
WHERE !completed AND contains(text, "⏫")
SORT due ASC
LIMIT 15
```


---

# Quick Nav

- 🗄️ Last 7 days
 `$=dv.list(dv.pages('"Resources/Agenda/Daily"').sort(f=>f.file.mtime.ts,"desc").limit(7).file.link)`
 - 〽️ Month View `$=dv.list(dv.pages('"Resources/Agenda/Monthly"').sort(f=>f.file.mtime.ts,"desc").limit(7).file.link)`
- Last 4 weeks `$=dv.list(dv.pages('"Resources/Agenda/Weekly"').sort(f=>f.file.mtime.ts,"desc").limit(4).file.link)`
- ⭐ Tagged:  starred 
		`$=dv.list(dv.pages('#starred').sort(f=>f.file.name,"desc").limit(10).file.link)` 
- Recent Files 
		`$=dv.list(dv.pages('').sort(f=>f.file.mtime.ts,"desc").limit(10).file.link)`

---

<br>

