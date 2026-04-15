# Notion Tool

Search, create, and update Notion pages and databases. Manage workspace content, query databases with filters, and append rich content blocks.

## Capabilities

| Tool | Description | Approval Required |
|------|-------------|:-:|
| `notion_search` | Search pages and databases by title | |
| `notion_get_page` | Get page properties and content | |
| `notion_create_page` | Create a new page (child page or database item) | Yes |
| `notion_update_page` | Update page properties | |
| `notion_archive_page` | Archive (soft-delete) a page | Yes |
| `notion_get_database` | Get database schema and properties | |
| `notion_query_database` | Query a database with filters and sorts | |
| `notion_create_database_item` | Add a new row to a database | Yes |
| `notion_update_database_item` | Update a database row's properties | |
| `notion_append_blocks` | Append content blocks to a page | |

## Configuration

Requires a **Notion Internal Integration Token**:

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the Internal Integration Token
4. **Important:** Share each page/database with your integration (click "..." > "Connections" > select your integration)

Add the token in the agent's skill settings as `notion_token`.

## Content Format

When creating pages or appending blocks, use markdown-like syntax:

```
# Heading 1
## Heading 2
### Heading 3

Plain paragraph text with **bold**, *italic*, and `code`.

- Bullet item
- Another bullet

1. Numbered item
2. Another number

- [ ] To-do item
- [x] Completed to-do

> Quote block

---

\`\`\`python
code block
\`\`\`
```

## Database Properties

When setting properties, pass a JSON string matching Notion's property format:

```json
{
  "Status": { "select": { "name": "In Progress" } },
  "Priority": { "select": { "name": "High" } },
  "Due Date": { "date": { "start": "2024-12-31" } },
  "Tags": { "multi_select": [{ "name": "frontend" }, { "name": "urgent" }] },
  "Assignee": { "people": [{ "id": "user-uuid" }] }
}
```

Use `notion_get_database` first to see available properties and their types.
