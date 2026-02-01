# Plan Day Action

## Purpose
Create meeting note placeholders for all calendar events for a specified date, enabling quick meeting prep and note-taking.

## Triggers
- **Automatic**: Daily note creation (`Resources/Agenda/Daily/*.md`)
- **Manual**: "Plan Day" button in Persona status bar menu (date-aware - plans for whichever daily note is open)

## Input
- **Target date**: `PERSONA_TARGET_DATE` environment variable (the date to plan for)
- **Today's date**: `PERSONA_TODAY` (actual current date, for reference)
- Calendar events via macOS Calendar

**Important**: When planning from the status bar menu, the target date comes from the active daily note's filename. This allows planning multiple days (today, tomorrow, etc.) without waiting.

## Process

### 1. Get Target Date
```bash
# TARGET_DATE is the date to plan for (may be today or another day)
TARGET_DATE="${PERSONA_TARGET_DATE:-$(date +%Y-%m-%d)}"
```

### 2. Fetch Calendar Events
Use AppleScript to get events for the TARGET_DATE from macOS Calendar:

```bash
# Pass TARGET_DATE to AppleScript
osascript -e "
on run argv
    set targetDateStr to item 1 of argv  -- e.g., \"2026-01-23\"

    tell application \"Calendar\"
        -- Parse the target date string (YYYY-MM-DD format)
        set {year:y, month:m, day:d} to (current date)
        set y to (text 1 thru 4 of targetDateStr) as integer
        set m to (text 6 thru 7 of targetDateStr) as integer
        set d to (text 9 thru 10 of targetDateStr) as integer

        set targetDate to current date
        set year of targetDate to y
        set month of targetDate to m
        set day of targetDate to d
        set time of targetDate to 0

        set startOfDay to targetDate
        set endOfDay to startOfDay + (1 * days)

        set output to \"\"
        repeat with cal in calendars
            -- Get events from MCO calendar (or adjust calendar name)
            if name of cal is \"MCO\" or name of cal is \"Calendar\" then
                set calEvents to (every event of cal whose start date ≥ startOfDay and start date < endOfDay)
                repeat with evt in calEvents
                    set eventUID to uid of evt
                    set eventTitle to summary of evt
                    set eventStart to start date of evt

                    -- Get attendees if available
                    set attendeeList to \"\"
                    try
                        set attendees to attendees of evt
                        repeat with att in attendees
                            if attendeeList is not \"\" then
                                set attendeeList to attendeeList & \",\"
                            end if
                            set attendeeList to attendeeList & (display name of att)
                        end repeat
                    end try

                    -- Output as pipe-delimited
                    set output to output & eventUID & \"|\" & eventTitle & \"|\" & eventStart & \"|\" & attendeeList & linefeed
                end repeat
            end if
        end repeat

        return output
    end tell
end run
" "$TARGET_DATE"
```

### 3. Read State File
```bash
STATE_FILE="Projects/Persona/instances/PersonalMCO/state/assistant.json"
# Parse planned_days[TARGET_DATE].meetings[] to get already-processed event IDs
```

### 4. Process Each Event
For each calendar event not already in state:

#### 4.1 Determine Category
```
function categorize(title):
    title_lower = title.lower()

    if any(kw in title_lower for kw in ['1:1', '1on1', '1-on-1']):
        return '1to1'

    if any(kw in title_lower for kw in ['standup', 'stand-up', 'retro', 'sprint', 'planning', 'scrum']):
        return 'Scrum'

    if any(kw in title_lower for kw in ['leadership', 'exec', 'staff', 'all-hands', 'all hands']):
        return 'Leadership'

    if any(kw in title_lower for kw in ['product', 'engineering', 'pande', 'p&e', 'tech review']):
        return 'PandE'

    # Default
    return 'Ad-Hoc'
```

#### 4.2 Format Attendees
```
attendees = ["John Smith", "Jane Doe"]
formatted = "[[John Smith]], [[Jane Doe]]"
```

#### 4.3 Create Meeting File
```
Category = categorize(event.title)
Filename = Archive/Meetings/{Category}/{TARGET_DATE} - {event.title}.md

# Check if file exists
if file_exists(Filename):
    skip (already created)

# Read template
Template = read("Resources/General/Templates/Meeting.md")

# Fill template variables
Content = Template
    .replace("{{DATE:YYYY-MM-DD}}", TARGET_DATE)
    .replace("{{VALUE:Subject}}", event.title)
    .replace("{{VALUE:People}}", formatted_attendees)
    .replace("{{date:YYYY-MM-DD}}", TARGET_DATE)

# Write file
write(Filename, Content)
```

#### 4.4 Update State
```json
{
  "id": "event-uid",
  "title": "Meeting Subject",
  "category": "Ad-Hoc",
  "created_file": "Archive/Meetings/Ad-Hoc/2026-01-22 - Meeting Subject.md",
  "attendees": ["John Smith", "Jane Doe"],
  "processed_at": "2026-01-22T06:00:00Z"
}
```

### 5. Save State
Update `state/assistant.json` with new `planned_days[TARGET_DATE]` entries.

### 6. Report Summary
```
Plan Day Complete:
- Created: 3 meeting files
- Skipped: 2 (already existed)

New meetings:
- Archive/Meetings/Scrum/2026-01-22 - Sprint Planning.md
- Archive/Meetings/1to1/2026-01-22 - 1:1 John Smith.md
- Archive/Meetings/Ad-Hoc/2026-01-22 - Team Sync.md
```

## Output
- Meeting files created in `Archive/Meetings/{Category}/`
- State updated in `state/assistant.json`
- Summary logged

## Duplicate Prevention

### Primary Check: Event ID
Each calendar event has a unique ID (UID). Before creating a file:
1. Check `planned_days[TARGET_DATE].meetings[].id`
2. If ID found, skip this event

### Secondary Check: File Existence
Even if event not in state (e.g., state was reset):
1. Check if file `Archive/Meetings/{Category}/{DATE} - {Title}.md` exists
2. If exists, skip creation but add to state

## Re-run Behavior
- **First run**: Creates all meeting files, records event IDs in state
- **Second run**: Detects all IDs already processed, creates nothing new
- **After new meeting added**: Only creates the new one, skips existing

## Error Handling
- If Calendar app not accessible: Log error, don't crash
- If template not found: Use minimal default template
- If file write fails: Log error, continue with next event
- Always update state with what was successfully processed
