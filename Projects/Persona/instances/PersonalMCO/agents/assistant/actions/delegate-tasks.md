# Delegate Tasks Action

Analyze `[A]` marked tasks in today's daily note and delegate to appropriate agents.

## Routing

This action is triggered when `[A]` tasks are found under PersonalMCO-related headers:
- `## Personal`
- `## MCO`

## Concurrency

Respects `max_concurrent_tasks` limit (default: 2). If limit reached, this task was queued in `state/queue.json` and triggered when a slot opened.

## Workflow

1. Read today's daily note
2. Find all `[A]` task markers in Personal/MCO sections
3. For each task, analyze context to determine:
   - If research needed → delegate to researcher
   - If project-related → delegate to project-manager
   - Otherwise → complete directly or queue for manual review

4. Update task markers:
   - `[A]` → `[x]` if completed
   - `[A]` → `[>]` if delegated (add link to delegated agent)
   - `[A]` → `[!]` if needs human input

## Task Analysis Criteria

### Research Tasks (delegate to researcher)
- Questions about topics, concepts, or information
- Requests for analysis or comparison
- "Find out about...", "Research...", "What is..."

### Project Tasks (delegate to project-manager)
- Task tracking and status updates
- Sprint or milestone planning
- "Update project...", "Check status of..."

### Direct Completion
- Simple tasks that can be done immediately
- Note updates or formatting
- Quick calculations or lookups

## Output

Update the daily note with delegation status and any immediate results.

Write results to: `Resources/General/Embeds/PersonalMCO-Section.md`
