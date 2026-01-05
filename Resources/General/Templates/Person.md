<%*
// --- User Prompts ---
const firstNameInput = await tp.system.prompt("First Name");
const lastNameInput = await tp.system.prompt("Last Name");
const teamInput = await tp.system.prompt("Team");
const partnerNameInput = await tp.system.prompt("Partner Name");
const kidsInput = await tp.system.prompt("Kids");
const companyInput = await tp.system.prompt("Company");
const phoneInput = await tp.system.prompt("Phone");
const notesInput = await tp.system.prompt("Notes");

// --- Default Value Logic ---
const N_A = "N/A"; // Define default value

const firstName = firstNameInput || N_A; // If blank, use N_A (handle for filename too)
const lastName = lastNameInput || N_A;   // If blank, use N_A (handle for filename too)

// --- Derived & Processed Values ---
// Prepare names for email generation (lowercase)
// Ensure that if N_A was set for names, it doesn't break email
const lowerFirstName = firstNameInput ? firstNameInput.toLowerCase() : "firstname"; // Use placeholder if original was blank
const lowerLastName = lastNameInput ? lastNameInput.toLowerCase() : "lastname";   // Use placeholder if original was blank
const generatedEmail = (firstNameInput && lastNameInput)
    ? `${lowerFirstName}.${lowerLastName}@mycomplianceoffice.com`
    : N_A; // Only generate full email if both names were provided

const handleValue = (firstNameInput && lastNameInput)
    ? `${firstNameInput}${lastNameInput}`
    : N_A;

// --- Populate tp.frontmatter ---
tp.frontmatter["first_name"] = firstName;
tp.frontmatter["last_name"] = lastName;
tp.frontmatter["handle"] = handleValue;
tp.frontmatter["email"] = generatedEmail;
tp.frontmatter["team"] = teamInput || N_A;
tp.frontmatter["partner_name"] = partnerNameInput || N_A;
tp.frontmatter["kids"] = kidsInput || N_A;
tp.frontmatter["company"] = companyInput || N_A;
tp.frontmatter["phone"] = phoneInput || N_A;
tp.frontmatter["notes"] = notesInput || N_A;

// --- File Renaming ---
// IMPORTANT: Double-check your QuickAdd "File Name Format".
// If QuickAdd's temporary filename is, for example, "Inbox/temp-person-{{DATE}}",
// then tp.file.title might be "temp-person-YYYY-MM-DD" (without the folder).
// The condition below should match the start of the FILENAME part.
const quickAddTempFilePrefix = "temp-person"; // <<< ENSURE THIS MATCHES THE START OF YOUR QUICKADD FILENAME
const currentFileName = tp.file.title; // Gets the current name of the file being processed

if (firstNameInput && lastNameInput && currentFileName.startsWith(quickAddTempFilePrefix)) {
    const desiredFilename = `${firstNameInput} ${lastNameInput}`; // Use original inputs for filename
    try {
        await tp.file.rename(desiredFilename);
        console.log(`Templater: File renamed to ${desiredFilename}.md`);
    } catch (e) {
        console.error("Templater: File rename failed.", e);
        new Notice("File rename failed. Check console (Ctrl+Shift+I) and QuickAdd temporary filename prefix.", 0);
    }
} else if (!firstNameInput || !lastNameInput) {
    console.log("Templater: File not renamed as first or last name was not provided.");
    new Notice("File not renamed: First or Last Name missing.", 0);
} else if (!currentFileName.startsWith(quickAddTempFilePrefix)) {
    console.log(`Templater: File not renamed. Current name "${currentFileName}" does not start with "${quickAddTempFilePrefix}".`);
    new Notice(`File not renamed: Name mismatch. Check console.`, 0);
}

%>---
first_name: <% tp.frontmatter.first_name %>
last_name: <% tp.frontmatter.last_name %>
handle: <% tp.frontmatter.handle %>
email: <% tp.frontmatter.email %>
team: <% tp.frontmatter.team %>
partner_name: <% tp.frontmatter.partner_name %>
kids: <% tp.frontmatter.kids %>
company: <% tp.frontmatter.company %>
phone: <% tp.frontmatter.phone %>
notes: <% tp.frontmatter.notes %>
---
<%*
// This ensures the script processing ends cleanly and content below is added.
tR += "";
%>
Handle: #<% tp.frontmatter.handle %> 

| **Team**    | <% tp.frontmatter.team %>         |
| ----------- | --------------------------------- |
| **Email**   | <% tp.frontmatter.email %>        |
| **Company** | <% tp.frontmatter.company %>      |
| **Phone**   | <% tp.frontmatter.phone %>        |
| **Partner** | <% tp.frontmatter.partner_name %> |
| **Kids**    | <% tp.frontmatter.kids %>         |

## Notes
<% tp.frontmatter.notes %>

---


## 👤 Mentions
```dataview
table WITHOUT ID file.link as Note
WHERE contains(file.tags, this.handle)
sort file.name desc
```



---
## 🗓️ Meetings
```dataview
table WITHOUT ID file.link as Meeting, Date
from "Archive/Meetings" OR "Resources/Agenda/Daily"
where contains(People, this.file.link)
sort Date desc
```
