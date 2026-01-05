# Project Shortcode System - Usage Guide

## Overview
The project shortcode system allows you to tag daily notes, tasks, and work entries with project-specific codes (like #mhm, #jfl) that automatically appear in project pages via dataview queries.

## How It Works

### 1. Project Setup
Each project has:
- **Project Page**: Located in `Projects/Clients/[Project-Name].md`
- **Shortcode**: A simple tag like `#mhm` or `#jfl` 
- **Dataview Queries**: Automatically find mentions across your vault

### 2. Daily Note Usage
In your daily notes, use the shortcode format:
```markdown
* [2.5h] #mhm Description of work done
* [1.0h] #jfl Client meeting notes
* Task related to #mhm project
* General note mentioning #jfl work
```

### 3. Automatic Tracking
The project pages automatically show:
- All mentions of the shortcode from daily notes
- Tasks containing the shortcode
- Meeting notes tagged with the project
- Time tracking entries

## Current Project Shortcodes

### #mhm - Mile High Marketing
- **Usage**: Internal MHM business development and operations
- **Project Page**: `Projects/Clients/Mile-High-Marketing.md`
- **Linear Team**: MHM (1dfc92f4-2986-4d9c-8fe5-ea1dc4b365ea)
- **Examples**:
  - `[3.0h] #mhm Implemented Linear billing integration`
  - `Meeting with potential client about #mhm services`
  - `- [ ] Update #mhm documentation`

### #jfl - JFL Project
- **Usage**: JFL client project work
- **Project Page**: `Projects/Clients/JFL-Project.md`
- **Linear Project**: JFL Project (3af980d1-8bbe-4a3c-94c7-d3687486305c)
- **Examples**:
  - `[1.5h] #jfl Requirements gathering call`
  - `Created design mockups for #jfl project`
  - `- [ ] Schedule follow-up with #jfl client`

## Time Tracking Format

### Standard Format
```markdown
[HoursWorked] #shortcode Description of work
```

### Examples
```markdown
* [2.5h] #mhm Developed Linear data extraction system
* [1.0h] #jfl Client requirements meeting
* [0.5h] #mhm Updated project documentation
* [3.0h] #jfl Initial development work
```

### Benefits
- **Automatic Billing**: Time entries are tracked per project
- **Progress Visibility**: See all work done on a project over time
- **Context Switching**: Easy to see what you worked on each day
- **Client Reporting**: Generate time reports per project

## Dataview Queries

### Project Mentions Query
```dataview
table WITHOUT ID file.link as Note, date(file.cday) as "Date Created", file.folder as "Folder"
WHERE contains(file.content, "#mhm") OR contains(file.tags, "mhm")
sort file.cday desc
limit 50
```

### Task Tracking Query
```dataview
task
WHERE contains(text, "#mhm")
sort completed, file.name
```

### Daily Note References Query
```dataview
table WITHOUT ID file.link as "Daily Note", date(file.name) as "Date"
FROM "Resources/Agenda/Daily"
WHERE contains(file.content, "#mhm")
sort file.name desc
limit 30
```

## Creating New Projects

### Using the Project Template
1. Use the `Project.md` template from `Resources/General/Templates/`
2. Fill in project details including shortcode
3. The template will set up all dataview queries automatically

### Manual Setup
1. Create project page in `Projects/Clients/`
2. Add shortcode to frontmatter: `tags: [project, shortcode]`
3. Add dataview queries (copy from existing projects)
4. Update this usage guide with the new shortcode

## Integration with Linear

### Linear Project Creation
Projects can be linked to Linear for enhanced project management:
```bash
# Create Linear project
curl -H "Authorization: $LINEAR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.linear.app/graphql \
     -d '{"query":"mutation { projectCreate(input: { name: \"Project Name\", teamIds: [\"team-id\"] }) { success project { id } } }"}'
```

### Linear Issue Creation
```bash
# Create issue for project
curl -H "Authorization: $LINEAR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.linear.app/graphql \
     -d '{"query":"mutation { issueCreate(input: { title: \"Issue Title\", teamId: \"team-id\", projectId: \"project-id\" }) { success issue { identifier url } } }"}'
```

## Benefits of the Shortcode System

### 1. Seamless Integration
- Tag work in daily notes naturally
- Automatic aggregation in project pages
- No manual copying or organizing needed

### 2. Time Tracking
- Simple format: `[2.5h] #project Description`
- Automatic billing preparation
- Easy client reporting

### 3. Context Switching
- See all work for a project in one place
- Track progress over time
- Identify patterns and bottlenecks

### 4. Client Communication
- Generate activity summaries easily
- Track time for billing
- Maintain project history

## Example Daily Note Entry
```markdown
## Today's Work

### Client Projects
* [x] [2.5h] #mhm Completed Linear data extraction implementation
* [x] [1.0h] #jfl Initial client requirements gathering call
* [x] [0.5h] #mhm Updated project documentation and setup guides
* [ ] [1.5h] #jfl Create design mockups for client review

### Notes
- #mhm Linear integration is working perfectly
- #jfl client is excited about the project, wants to move quickly
- Need to schedule follow-up meeting for #jfl requirements
```

This automatically appears in both project pages with proper categorization and time tracking.

## Troubleshooting

### Shortcode Not Appearing in Project Page
1. Check spelling of shortcode (case sensitive)
2. Verify dataview queries are correct
3. Make sure the note is saved
4. Refresh the project page

### Time Tracking Format Issues
- Use format: `[2.5h]` not `[2.5 hours]` or `2.5h`
- Include space after closing bracket: `] #shortcode`
- Use decimal format: `[2.5h]` not `[2h 30m]`

### Missing Daily Notes in Project Page
- Check the FROM path in dataview query
- Ensure daily notes are in `Resources/Agenda/Daily/`
- Verify date format in daily note filenames

## Next Steps

### Planned Enhancements
1. **Automated Time Calculation**: Sum total hours per project
2. **Billing Integration**: Connect with FreshBooks for invoicing  
3. **Sprint Planning**: Link with Linear for project planning
4. **Client Dashboards**: Create client-facing progress views

### Usage Recommendations
1. Use shortcodes consistently in daily notes
2. Include time estimates for better project tracking
3. Add context to entries for future reference
4. Review project pages weekly for progress tracking

---

*Created: 2025-08-10*
*This guide will be updated as the system evolves*