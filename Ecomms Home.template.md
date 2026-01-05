---
banner: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8"
tags:
  - starred
---
# Work Project Home

> This is a template for a work project home page. Customize it for your team/project.

---

## Project Overview

- [?] Key metrics for your project
- [?] Important links

---

## Quick Links

> Add links to your team's important resources:
> - Project management tools (Jira, Linear, etc.)
> - Documentation (Confluence, Notion, etc.)
> - Communication channels (Slack, Teams)

---

## Quality and Security Roadmaps

--- start-multi-column: ID_i36r
```column-settings
Number of Columns: 3
Largest Column: standard
```

**Quality**
> Link to quality roadmap

--- column-break ---

**Security**
> Link to security roadmap

--- column-break ---

**Cost Optimization**
> Link to cost initiatives

--- end-multi-column

---

## Current Sprint

> Current Sprint: [Sprint Number] | Ends on [Date]

--- start-multi-column: ID_87r0
```column-settings
Number of Columns: 2
Largest Column: standard
```

#### High Profile Tickets

> List your high-priority tickets here

--- column-break ---

#### Blockers & Risks

> List any blockers or risks

--- end-multi-column

---

## Release Schedule

### Current Release
> Release version and date

| Ticket | Description | Status |
|--------|-------------|--------|
| PROJ-001 | Feature description | In Progress |

### Upcoming Release
> Next release version and date

| Ticket | Description | Status |
|--------|-------------|--------|
| PROJ-002 | Feature description | Planning |

---

## Team Overview

--- start-multi-column: ID_wxce
```column-settings
Number of Columns: 2
Largest Column: left
Shadow: Off
Border: Off
```

**Team Composition**

<div class="dashboard-box-row">
   <div class="dashboard-box">
	   <h4>Total Team</h4>
	   0
   </div>
	<div class="dashboard-box">
		<h4>Dev</h4>
		0
	</div>
	<div class="dashboard-box">
		<h4>QA</h4>
		0
	</div>
</div>

--- column-break ---

**Sprint Velocity**

| Sprint | Committed | Burned |
|--------|-----------|--------|
| S1     | 0         | 0      |
| S2     | 0         | 0      |
| S3     | 0         | 0      |

--- end-multi-column

---

## Escalations & Incidents

> Track ongoing incidents and escalations

---

## Project Todos

```dataview
task
from "Resources/Agenda/Tasks/Work"
where !completed and contains(text, "⏫")
sort due desc
limit 15
```

---

## Resources

> Add links to team resources, documentation, and tools
