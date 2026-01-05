<%*
// --- Project Template with Shortcode System ---
// This template creates projects with shortcodes (like #mhm, #jfl) that can be referenced in daily notes
// and automatically show up in project pages via dataview queries

// --- User Prompts ---
const projectNameInput = await tp.system.prompt("Project Name (e.g., 'Mile High Marketing')");
const shortcodeInput = await tp.system.prompt("Project Shortcode (e.g., 'mhm', 'jfl') - no # needed");
const clientNameInput = await tp.system.prompt("Client/Company Name");
const projectTypeInput = await tp.system.prompt("Project Type (e.g., 'Website', 'Marketing Campaign', 'Development')");
const statusInput = await tp.system.prompt("Status (e.g., 'Active', 'Planning', 'On Hold', 'Completed')");
const startDateInput = await tp.system.prompt("Start Date (YYYY-MM-DD or leave blank)");
const endDateInput = await tp.system.prompt("End Date (YYYY-MM-DD or leave blank)");
const budgetInput = await tp.system.prompt("Budget (e.g., '$10,000' or leave blank)");
const linearTeamIdInput = await tp.system.prompt("Linear Team ID (leave blank if not using Linear)");
const linearProjectIdInput = await tp.system.prompt("Linear Project ID (leave blank if not using Linear)");
const descriptionInput = await tp.system.prompt("Project Description");

// --- Default Value Logic ---
const N_A = "N/A";

const projectName = projectNameInput || "New Project";
const shortcode = shortcodeInput ? shortcodeInput.toLowerCase().replace(/[^a-z0-9]/g, '') : "proj";
const clientName = clientNameInput || N_A;
const projectType = projectTypeInput || "General";
const status = statusInput || "Planning";
const startDate = startDateInput || N_A;
const endDate = endDateInput || N_A;
const budget = budgetInput || N_A;
const linearTeamId = linearTeamIdInput || N_A;
const linearProjectId = linearProjectIdInput || N_A;
const description = descriptionInput || "Project description to be added.";

// --- Generate Linear URLs if IDs provided ---
const linearTeamUrl = linearTeamId !== N_A ? `https://linear.app/imperative-design/team/${linearTeamId}` : N_A;
const linearProjectUrl = linearProjectId !== N_A ? `https://linear.app/imperative-design/project/${linearProjectId}` : N_A;

// --- Populate tp.frontmatter ---
tp.frontmatter["project_name"] = projectName;
tp.frontmatter["shortcode"] = shortcode;
tp.frontmatter["client_name"] = clientName;
tp.frontmatter["project_type"] = projectType;
tp.frontmatter["status"] = status;
tp.frontmatter["start_date"] = startDate;
tp.frontmatter["end_date"] = endDate;
tp.frontmatter["budget"] = budget;
tp.frontmatter["linear_team_id"] = linearTeamId;
tp.frontmatter["linear_project_id"] = linearProjectId;
tp.frontmatter["linear_team_url"] = linearTeamUrl;
tp.frontmatter["linear_project_url"] = linearProjectUrl;
tp.frontmatter["description"] = description;

// --- File Renaming Logic ---
const quickAddTempFilePrefix = "temp-project";
const currentFileName = tp.file.title;

if (projectNameInput && currentFileName.startsWith(quickAddTempFilePrefix)) {
    // Create a clean filename from project name
    const cleanProjectName = projectName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    const desiredFilename = cleanProjectName;
    try {
        await tp.file.rename(desiredFilename);
        console.log(`Templater: File renamed to ${desiredFilename}.md`);
    } catch (e) {
        console.error("Templater: File rename failed.", e);
        new Notice("File rename failed. Check console for details.", 0);
    }
} else if (!projectNameInput) {
    console.log("Templater: File not renamed as project name was not provided.");
    new Notice("File not renamed: Project Name missing.", 0);
}

%>---
project_name: <% tp.frontmatter.project_name %>
shortcode: <% tp.frontmatter.shortcode %>
client_name: <% tp.frontmatter.client_name %>
project_type: <% tp.frontmatter.project_type %>
status: <% tp.frontmatter.status %>
start_date: <% tp.frontmatter.start_date %>
end_date: <% tp.frontmatter.end_date %>
budget: <% tp.frontmatter.budget %>
linear_team_id: <% tp.frontmatter.linear_team_id %>
linear_project_id: <% tp.frontmatter.linear_project_id %>
linear_team_url: <% tp.frontmatter.linear_team_url %>
linear_project_url: <% tp.frontmatter.linear_project_url %>
description: <% tp.frontmatter.description %>
tags: [project, <% tp.frontmatter.shortcode %>]
---
<%*
// This ensures the script processing ends cleanly and content below is added.
tR += "";
%>
# <% tp.frontmatter.project_name %>

**Project Shortcode**: #<% tp.frontmatter.shortcode %>

## 📋 Project Overview

| **Field**      | **Details**                                    |
| -------------- | ---------------------------------------------- |
| **Client**     | <% tp.frontmatter.client_name %>               |
| **Type**       | <% tp.frontmatter.project_type %>              |
| **Status**     | <% tp.frontmatter.status %>                    |
| **Start Date** | <% tp.frontmatter.start_date %>                |
| **End Date**   | <% tp.frontmatter.end_date %>                  |
| **Budget**     | <% tp.frontmatter.budget %>                    |

## 📝 Description
<% tp.frontmatter.description %>

## 🔗 Linear Integration
<% tp.frontmatter.linear_team_id !== "N/A" ? `
**Team**: [Linear Team](<% tp.frontmatter.linear_team_url %>)
**Project**: [Linear Project](<% tp.frontmatter.linear_project_url %>)
**Team ID**: \`<% tp.frontmatter.linear_team_id %>\`
**Project ID**: \`<% tp.frontmatter.linear_project_id %>\`
` : "Linear integration not configured for this project." %>

## 📊 Project Goals & Objectives
- [ ] Define project scope and requirements
- [ ] Create project timeline and milestones
- [ ] Set up development/work environment
- [ ] Establish communication channels with client
- [ ] Complete initial project deliverables

## 💰 Budget & Time Tracking
- **Estimated Budget**: <% tp.frontmatter.budget %>
- **Time Tracking**: Use format `[2.5h] #<% tp.frontmatter.shortcode %> Description` in daily notes
- **Billing Method**: Hourly tracking with Linear integration

## 👥 Team & Contacts
| **Name** | **Role** | **Contact** | **Notes** |
|----------|----------|-------------|-----------|
|          |          |             |           |

## 📅 Project Timeline & Milestones
| **Milestone** | **Due Date** | **Status** | **Notes** |
|---------------|--------------|------------|-----------|
|               |              |            |           |

## 📈 Progress Tracking
- **Overall Progress**: 0%
- **Current Phase**: Planning
- **Next Actions**: Define project requirements

---

## 🏷️ Project Mentions
*All mentions of #<% tp.frontmatter.shortcode %> from daily notes and other documents*

```dataview
table WITHOUT ID file.link as Note, date(file.cday) as "Date Created", file.folder as "Folder"
WHERE contains(file.content, "#<% tp.frontmatter.shortcode %>") OR contains(file.tags, "<% tp.frontmatter.shortcode %>")
sort file.cday desc
limit 50
```

## ✅ Project Tasks & TODOs
*Tasks related to this project from daily notes*

```dataview
task
WHERE contains(text, "#<% tp.frontmatter.shortcode %>")
sort completed, file.name
```

## 🗓️ Daily Note References
*Daily notes that mention this project*

```dataview
table WITHOUT ID file.link as "Daily Note", date(file.name) as "Date"
FROM "Resources/Agenda/Daily"
WHERE contains(file.content, "#<% tp.frontmatter.shortcode %>")
sort file.name desc
limit 30
```

## 📝 Meeting Notes
*Meeting notes related to this project*

```dataview
table WITHOUT ID file.link as "Meeting", Date
WHERE contains(file.tags, "<% tp.frontmatter.shortcode %>") OR contains(file.content, "#<% tp.frontmatter.shortcode %>")
sort Date desc
```

## 🎯 Linear Issues
<% tp.frontmatter.linear_project_id !== "N/A" ? `
*Linear issues for this project (requires Linear MCP or manual updates)*

### Recent Issues:
- Check Linear project for current issues: [Linear Project](<% tp.frontmatter.linear_project_url %>)
- Use Linear CLI: \`lin new "Issue title" --team=<% tp.frontmatter.linear_team_id %>\`

### Issue Creation Commands:
\`\`\`bash
# Create new issue for this project
lin new "Issue title" --project="<% tp.frontmatter.linear_project_id %>"

# List project issues  
npm run linear:extract-billing -- --team-id="<% tp.frontmatter.linear_team_id %>"
\`\`\`
` : "Linear integration not configured. Issues will be tracked manually." %>

## 📊 Time & Billing Summary
*Will be populated by Linear billing integration*

### Time Entry Format for Daily Notes:
- **Format**: `[2.5h] #<% tp.frontmatter.shortcode %> Description of work done`
- **Example**: `[3.0h] #<% tp.frontmatter.shortcode %> Initial project setup and requirements gathering`

### Current Billing Status:
- **Total Hours**: TBD (automated via Linear integration)
- **Billable Amount**: TBD
- **Last Invoice**: TBD

---

## 📁 Project Resources
- **Repository**: 
- **Design Files**: 
- **Documentation**: 
- **Client Communication**: 

## 📋 Project Notes
*Additional notes and observations*

---

*Created: <% tp.date.now() %>*
*Last Updated: <% tp.date.now() %>*