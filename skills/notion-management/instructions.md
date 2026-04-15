## When to use Pages vs Databases

- **Page** — for one-off documents, wikis, meeting notes, project briefs. Content-first, no structured properties needed.
- **Database** — for collections of similar items that need filtering, sorting, and views. Task trackers, content calendars, CRMs, inventories.

Rule of thumb: if you'll have more than 5 similar items and want to filter or sort them, use a database.

## Workspace organisation

- Use a **top-level navigation** page as a homepage with links to key areas
- Organise by **team or domain**, not by tool (e.g. "Engineering" not "Databases")
- Keep nesting shallow — max 3 levels deep. Deep nesting makes content hard to find
- Use **database views** (table, board, calendar, gallery) instead of creating separate pages for different perspectives
- Archive stale content instead of deleting — use the archive feature

## Database design patterns

### Property types and when to use each

| Property | Use for | Example |
|----------|---------|---------|
| Title | Primary identifier | Task name, article title |
| Select | Single choice from fixed options | Status, Priority, Type |
| Multi-select | Multiple tags | Labels, categories |
| Status | Workflow states (built-in Kanban) | Not Started → In Progress → Done |
| Date | Deadlines, scheduled dates | Due date, publish date |
| Person | Assignment, ownership | Assignee, reviewer |
| Relation | Links between databases | Task ↔ Project, Article ↔ Author |
| Rollup | Aggregations from relations | Count of tasks, % complete |
| Formula | Computed values | Days until due, priority score |
| Checkbox | Boolean flags | Approved, published |
| URL | External links | Source link, PR URL |
| Number | Quantities, scores | Story points, revenue |

### Common database templates

**Task tracker:**
- Title (title), Status (status), Priority (select: Low/Medium/High/Urgent), Assignee (person), Due Date (date), Project (relation), Labels (multi-select)

**Content calendar:**
- Title (title), Status (status: Draft/Review/Scheduled/Published), Author (person), Publish Date (date), Channel (select), Topic (multi-select)

**Meeting notes:**
- Title (title), Date (date), Attendees (person), Type (select: Standup/Planning/Retro/1:1), Action Items (relation to task tracker)

**CRM / Contacts:**
- Name (title), Company (text), Email (email), Status (select: Lead/Active/Churned), Last Contact (date), Notes (text)

## Page structure best practices

- Start with a **summary or purpose** — one paragraph explaining what this page is for
- Use **headings** (H2, H3) to create scannable structure
- Use **callout blocks** for important notes and warnings
- Use **toggles** for detailed content that not everyone needs to see
- Add a **table of contents** at the top of long pages
- End with **next steps** or **action items** when applicable

## Working with the Notion API

- Always call `notion_get_database` before creating items — check the exact property names and types
- When querying, start with `notion_search` to find the database ID, then use `notion_query_database`
- Property names are **case-sensitive** — "Status" is not "status"
- For date properties, use ISO format: `2024-12-31` or `2024-12-31T14:00:00`
- When updating properties, you only need to include the properties you want to change
- The integration only sees pages/databases that have been **explicitly shared** with it

## Content writing in Notion

- Keep paragraphs short (2-3 sentences)
- Use bullet lists for related items
- Use numbered lists for sequential steps
- Use checkboxes for action items
- Use dividers (---) to separate sections
- Use code blocks for technical content with the correct language tag
- Bold key terms on first use
