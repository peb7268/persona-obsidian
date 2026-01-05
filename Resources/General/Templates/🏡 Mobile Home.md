---
cssclass: dashboard
banner: "![[https://source.unsplash.com/random/1200×500/?nature]]"
banner_y: 0.47395
banner_x: 0.49813
---

<div class="title" style="color:rgba(255,255,255,.4)">HOME</div>






```tracker
searchType: frontmatter
searchTarget: pomodoros_goal, pomodoros_hit
datasetName: Goal, Hit
folder: Agenda/daily
fixedScale: 1
accum: true
line:
    title: Pomodoros
    yAxisLabel: Pomodoros Goal vs Pomodoros Hit
    lineColor: orange, green
    showLegend: true
```


```tracker
searchType: frontmatter
searchTarget: row_or_run
datasetName: Row or Run
folder: Agenda/daily
fixedScale: 1
month:
```


```tracker
searchType: frontmatter
searchTarget: strength_train
datasetName: Strength Train
folder: Agenda/daily
fixedScale: 1
month:
	startWeekOn: 'Mon'
	color: steelblue
```
```tracker
searchType: frontmatter
searchTarget: strength_train
datasetName: Strength Train
folder: Agenda/daily
summary:
	template: "Longest Streak: {{maxStreak()}} day(s)\nLongest Breaks: {{maxBreaks()}} day(s)\nLast streak: {{currentStreak()}} day(s)"
```



```jira-count
label: Unfinished Tasks From Current Sprint
query: project = HONT AND Sprint = "51" AND statusCategory != Done
```
```jira-count
label: Total Items In Current Sprint
query: project = HONT AND Sprint = "51"
```
```jira-search
label: Unestimated Issues
query: project = HONT AND issuetype = Story AND Sprint in openSprints() AND "Story Points[Number]" is EMPTY
```

## Jira | Incidents & Support
```jira-search  
query: issuetype = Incident AND project = FW AND status != DONE AND labels != None AND sprint in openSprints() OR issuetype = Support AND project = FW AND status != DONE AND labels != None AND sprint in openSprints()
```

## Jira | Items in QA
```jira-search  
query: issuetype = Task AND project = FW AND status = 'QA' AND sprint in openSprints() OR issuetype = Story AND project = FW AND status = 'QA' AND sprint in openSprints() OR issuetype = Sub-task AND project = FW AND status = 'QA' AND sprint in openSprints() OR issuetype = DevOps AND project = FW AND status = 'QA' AND sprint in openSprints() OR issuetype = Bug AND project = FW AND status = 'QA' AND sprint in openSprints() OR issuetype = Task AND project = FW AND status = 'QA-PROD' AND sprint in openSprints() OR issuetype = Story AND project = FW AND status = 'QA-PROD' AND sprint in openSprints() OR issuetype = Sub-task AND project = FW AND status = 'QA-PROD' AND sprint in openSprints() OR issuetype = DevOps AND project = FW AND status = 'QA-PROD' AND sprint in openSprints() OR issuetype = Bug AND project = FW AND status = 'QA-PROD' AND sprint in openSprints() OR issuetype = Support AND project = FW AND status = 'QA-PROD' AND sprint in openSprints() OR issuetype = Support AND project = FW AND status = 'QA' AND sprint in openSprints()
```



## Jira | Blocked
```jira-search  
query: project = HONT AND status = Blocked AND sprint in openSprints()
```

## Jira | Last Sprint Analysis 

```jira-count
label: Unfinished stories From Last Sprint
query: project = HONT AND Sprint = "50" AND statusCategory != Done
```
```jira-count
label: Total Items In Last Sprint
query: project = HONT AND Sprint = "50"
```
```jira-search
label: Unestimated Issues
query: project = HONT AND issuetype = Story AND Sprint in openSprints() AND "Story Points[Number]" is EMPTY
```

```jira-search
label: Issus with High Cycle Time
type: table
query: project = HONT AND status changed to "In Progress" before startOfDay(-5) AND Sprint in openSprints() AND status != "Done" AND status != "Duplicate" AND status != "Won't Do"
```

<br /> 

---
```dataviewjs
const fetchStats = async() => {
	const response =  await fetch(`https://leetcode-stats-api.herokuapp.com/peb7268`);
	const leetcodeStats = await response.json();
	console.log(leetcodeStats)
	
	return leetcodeStats;
};

window['stats'] = await fetchStats(); 
this.totalSolved = stats.totalSolved;
console.log(`totalSolved: ${stats.totalSolved}`);
```
## LeetCode TotalSolved:   `=this.totalSolved` 

---

* [!]  **Focus: <br /> 2 algorithms a day and currently focused studying**. 
* [i] Main reading during the morning, light reading in the evening      
---
<br />

## Parking Lot
* Tasks
	* Create the yearly tracker
	* Add a hydration tracker
	* Family board
	* Athena error detection for client data usage drops
* Ideas
	* Habits to institute: update front matter at start of day and end of day, med planner on sun's
	* Do [[Memoization of functions]] behave like Angular services caching data as well or just act as global functions?
	* where should we put Lucas's learning wall?

 
# Quick Nav
- 🗄️ Last 7 days
 `$=dv.list(dv.pages('"Agenda/daily"').sort(f=>f.file.mtime.ts,"desc").limit(7).file.link)`
 - 〽️ Month View `$=dv.list(dv.pages('"Agenda/monthly"').sort(f=>f.file.mtime.ts,"desc").limit(7).file.link)`
- Last 4 weeks `$=dv.list(dv.pages('"Agenda/weekly"').sort(f=>f.file.mtime.ts,"desc").limit(4).file.link)`
- ⭐ Tagged:  starred 
		`$=dv.list(dv.pages('#starred').sort(f=>f.file.name,"desc").limit(5).file.link)` 
- Recent Files 
		`$=dv.list(dv.pages('').sort(f=>f.file.mtime.ts,"desc").limit(7).file.link)`