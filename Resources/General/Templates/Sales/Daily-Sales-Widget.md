## 📈 MHM Sales Dashboard

--- start-multi-column: ID_sales
```column-settings
Number of Columns: 3
Largest Column: standard
Border: off
Shadow: off
```

### Today's Activities
```dataview
TABLE WITHOUT ID
    "🎯 " + activity_type as "Activity",
    prospect as "Company",
    outcome as "Result"
FROM "Projects/Sales/Activities"
WHERE date(date) = date(today)
SORT date DESC
LIMIT 5
```

--- column-break ---

### Hot Prospects (80+)
```dataview
TABLE WITHOUT ID
    "🔥 " + company as "Company",
    qualification_score as "Score",
    pipeline_stage as "Stage"
FROM "Projects/Sales/Prospects"
WHERE qualification_score >= 80
SORT qualification_score DESC
LIMIT 3
```

--- column-break ---

### Follow-ups Due
```dataview
TABLE WITHOUT ID
    "⏰ " + prospect as "Company",
    follow_up_type as "Type",
    follow_up_date as "Due"
FROM "Projects/Sales/Activities" 
WHERE follow_up_required = true 
    AND date(follow_up_date) <= date(today)
SORT follow_up_date ASC
LIMIT 3
```

--- end-multi-column

--- start-multi-column: ID_sales_actions
```column-settings
Number of Columns: 4
Largest Column: standard
Border: off
Shadow: off
```

```button
name Sales Dashboard
type link
action obsidian://open?vault=Main&file=Projects%2FSales%2FSales-Dashboard
customColor #28a745
customTextColor #fff
class btn-inline
```

--- column-break ---

```button
name New Prospect
type command
action QuickAdd: Sales Prospect
customColor #007bff  
customTextColor #fff
class btn-inline
```

--- column-break ---

```button
name New Campaign
type command
action QuickAdd: Sales Campaign
customColor #17a2b8
customTextColor #fff
class btn-inline
```

--- column-break ---

```button
name All Activities
type link
action obsidian://open?vault=Main&file=Projects%2FSales%2FActivities
customColor #6c757d
customTextColor #fff
class btn-inline
```

--- end-multi-column

### Pipeline Summary
```dataview
TABLE WITHOUT ID
    pipeline_stage as "Stage",
    count(rows) as "Count",
    round(avg(qualification_score)) as "Avg Score"
FROM "Projects/Sales/Prospects"
GROUP BY pipeline_stage
SORT pipeline_stage
```