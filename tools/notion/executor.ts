/**
 * Notion Tool Executor — DenPaq Registry Plugin
 *
 * Implements the RegistryToolPlugin interface.
 * All Notion API interactions for DenPaq agents.
 *
 * Notion API version: 2022-06-28
 * Docs: https://developers.notion.com/reference
 */

// ── Types (inline to keep the bundle self-contained) ────────────────────────

interface ToolContext {
  config: Record<string, string>;
  agentId: string;
  agentName: string;
}

interface RegistryToolPlugin {
  id: string;
  execute: (
    toolName: string,
    input: Record<string, unknown>,
    context: ToolContext
  ) => Promise<string>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function notionHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionFetch(
  path: string,
  token: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      ...notionHeaders(token),
      ...(options?.headers ?? {}),
    },
  });
}

async function notionError(res: Response): Promise<string> {
  const body = await res.text();
  try {
    const err = JSON.parse(body);
    return `Notion API error ${res.status}: ${err.message || body}`;
  } catch {
    return `Notion API error ${res.status}: ${body}`;
  }
}

// ── Markdown to Notion Blocks ───────────────────────────────────────────────

interface NotionBlock {
  object: "block";
  type: string;
  [key: string]: unknown;
}

function parseRichText(
  text: string
): Array<{ type: "text"; text: { content: string }; annotations?: Record<string, boolean> }> {
  const segments: Array<{
    type: "text";
    text: { content: string };
    annotations?: Record<string, boolean>;
  }> = [];

  // Simple inline parsing: **bold**, *italic*, `code`
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        text: { content: text.slice(lastIndex, match.index) },
      });
    }

    if (match[2]) {
      // **bold**
      segments.push({
        type: "text",
        text: { content: match[2] },
        annotations: { bold: true },
      });
    } else if (match[3]) {
      // *italic*
      segments.push({
        type: "text",
        text: { content: match[3] },
        annotations: { italic: true },
      });
    } else if (match[4]) {
      // `code`
      segments.push({
        type: "text",
        text: { content: match[4] },
        annotations: { code: true },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      text: { content: text.slice(lastIndex) },
    });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", text: { content: text } });
  }

  return segments;
}

function markdownToBlocks(content: string): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Empty line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Divider
    if (line.trim() === "---") {
      blocks.push({ object: "block", type: "divider", divider: {} });
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim() || "plain text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        object: "block",
        type: "code",
        code: {
          rich_text: [{ type: "text", text: { content: codeLines.join("\n") } }],
          language: lang,
        },
      });
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: parseRichText(line.slice(4).trim()) },
      });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: parseRichText(line.slice(3).trim()) },
      });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: parseRichText(line.slice(2).trim()) },
      });
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, "").trim();
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: { rich_text: parseRichText(text) },
      });
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: parseRichText(line.slice(2).trim()) },
      });
      i++;
      continue;
    }

    // To-do / checkbox
    if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
      const checked = line.startsWith("- [x] ");
      const text = line.slice(6).trim();
      blocks.push({
        object: "block",
        type: "to_do",
        to_do: { rich_text: parseRichText(text), checked },
      });
      i++;
      continue;
    }

    // Quote
    if (line.startsWith("> ")) {
      blocks.push({
        object: "block",
        type: "quote",
        quote: { rich_text: parseRichText(line.slice(2).trim()) },
      });
      i++;
      continue;
    }

    // Default: paragraph
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: parseRichText(line.trim()) },
    });
    i++;
  }

  return blocks;
}

// ── Notion response formatters ──────────────────────────────────────────────

function formatPageProperties(properties: Record<string, any>): string {
  const lines: string[] = [];
  for (const [key, prop] of Object.entries(properties)) {
    const type = prop.type;
    let value = "";

    switch (type) {
      case "title":
        value = prop.title?.map((t: any) => t.plain_text).join("") ?? "";
        break;
      case "rich_text":
        value = prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
        break;
      case "number":
        value = prop.number != null ? String(prop.number) : "";
        break;
      case "select":
        value = prop.select?.name ?? "";
        break;
      case "multi_select":
        value = prop.multi_select?.map((s: any) => s.name).join(", ") ?? "";
        break;
      case "date":
        value = prop.date?.start ?? "";
        if (prop.date?.end) value += ` → ${prop.date.end}`;
        break;
      case "checkbox":
        value = prop.checkbox ? "Yes" : "No";
        break;
      case "url":
        value = prop.url ?? "";
        break;
      case "email":
        value = prop.email ?? "";
        break;
      case "phone_number":
        value = prop.phone_number ?? "";
        break;
      case "status":
        value = prop.status?.name ?? "";
        break;
      case "people":
        value = prop.people?.map((p: any) => p.name || p.id).join(", ") ?? "";
        break;
      case "relation":
        value = prop.relation?.map((r: any) => r.id).join(", ") ?? "";
        break;
      default:
        value = `[${type}]`;
    }

    if (value) lines.push(`  ${key}: ${value}`);
  }
  return lines.join("\n");
}

function formatBlocks(blocks: any[]): string {
  return blocks
    .map((b: any) => {
      const type = b.type;
      const content = b[type];
      if (!content) return "";

      const text =
        content.rich_text?.map((t: any) => t.plain_text).join("") ?? "";

      switch (type) {
        case "paragraph":
          return text;
        case "heading_1":
          return `# ${text}`;
        case "heading_2":
          return `## ${text}`;
        case "heading_3":
          return `### ${text}`;
        case "bulleted_list_item":
          return `- ${text}`;
        case "numbered_list_item":
          return `1. ${text}`;
        case "to_do":
          return `- [${content.checked ? "x" : " "}] ${text}`;
        case "quote":
          return `> ${text}`;
        case "code":
          return `\`\`\`${content.language ?? ""}\n${text}\n\`\`\``;
        case "divider":
          return "---";
        case "toggle":
          return `▸ ${text}`;
        case "callout":
          return `💡 ${text}`;
        default:
          return text || `[${type} block]`;
      }
    })
    .filter(Boolean)
    .join("\n");
}

// ── Plugin ──────────────────────────────────────────────────────────────────

const plugin: RegistryToolPlugin = {
  id: "notion",

  async execute(name, input, ctx) {
    const token = ctx.config.notion_token;
    if (!token) {
      return "Error: Notion integration token not configured. Please add it in the agent's skill settings.";
    }

    try {
      // ── Search ────────────────────────────────────────────────────────

      if (name === "notion_search") {
        const query = input["query"] as string;
        const pageSize = Math.min(Number(input["page_size"] ?? 10), 100);
        const body: Record<string, unknown> = {
          query,
          page_size: pageSize,
        };
        if (input["filter_type"]) {
          body["filter"] = { value: input["filter_type"], property: "object" };
        }

        const res = await notionFetch("/search", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) return await notionError(res);

        const data = (await res.json()) as { results: any[] };
        if (data.results.length === 0) return "No results found.";

        return data.results
          .map((r: any) => {
            const type = r.object; // "page" or "database"
            const title =
              type === "page"
                ? r.properties?.title?.title
                    ?.map((t: any) => t.plain_text)
                    .join("") ||
                  r.properties?.Name?.title
                    ?.map((t: any) => t.plain_text)
                    .join("") ||
                  "Untitled"
                : r.title?.map((t: any) => t.plain_text).join("") ||
                  "Untitled";
            return `[${type}] ${title}\n  ID: ${r.id}\n  URL: ${r.url ?? "N/A"}`;
          })
          .join("\n\n");
      }

      // ── Get Page ──────────────────────────────────────────────────────

      if (name === "notion_get_page") {
        const pageId = input["page_id"] as string;

        // Fetch page properties
        const pageRes = await notionFetch(`/pages/${pageId}`, token);
        if (!pageRes.ok) return await notionError(pageRes);
        const page = (await pageRes.json()) as {
          id: string;
          url: string;
          properties: Record<string, any>;
        };

        // Fetch child blocks
        const blocksRes = await notionFetch(
          `/blocks/${pageId}/children?page_size=100`,
          token
        );
        const blocksData = blocksRes.ok
          ? ((await blocksRes.json()) as { results: any[] })
          : { results: [] };

        const props = formatPageProperties(page.properties);
        const content = formatBlocks(blocksData.results);

        return [
          `Page: ${page.url}`,
          `ID: ${page.id}`,
          props ? `\nProperties:\n${props}` : "",
          content ? `\nContent:\n${content}` : "\n(empty page)",
        ]
          .filter(Boolean)
          .join("\n");
      }

      // ── Create Page ───────────────────────────────────────────────────

      if (name === "notion_create_page") {
        const parentId = input["parent_id"] as string;
        const parentType = input["parent_type"] as string;
        const title = input["title"] as string;
        const content = input["content"] as string | undefined;
        const propsStr = input["properties"] as string | undefined;

        const body: Record<string, unknown> = {
          parent: { [parentType]: parentId },
        };

        // Build properties
        const properties: Record<string, unknown> = {};
        if (propsStr) {
          try {
            Object.assign(properties, JSON.parse(propsStr));
          } catch {
            return "Error: Invalid JSON in properties parameter.";
          }
        }

        // Set title — find the title property name
        if (parentType === "database_id") {
          // For database pages, we need to find the title property
          // Default to "Name" or "title", or use the first title property
          if (!properties["Name"] && !properties["title"]) {
            properties["Name"] = {
              title: [{ text: { content: title } }],
            };
          }
        } else {
          properties["title"] = {
            title: [{ text: { content: title } }],
          };
        }
        body["properties"] = properties;

        // Add content blocks
        if (content) {
          body["children"] = markdownToBlocks(content);
        }

        const res = await notionFetch("/pages", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) return await notionError(res);

        const page = (await res.json()) as { id: string; url: string };
        return `Page created: ${title}\n  ID: ${page.id}\n  URL: ${page.url}`;
      }

      // ── Update Page ───────────────────────────────────────────────────

      if (name === "notion_update_page") {
        const pageId = input["page_id"] as string;
        const propsStr = input["properties"] as string;

        let properties: Record<string, unknown>;
        try {
          properties = JSON.parse(propsStr);
        } catch {
          return "Error: Invalid JSON in properties parameter.";
        }

        const res = await notionFetch(`/pages/${pageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ properties }),
        });
        if (!res.ok) return await notionError(res);

        const page = (await res.json()) as { id: string; url: string };
        return `Page updated: ${page.id}\n  URL: ${page.url}`;
      }

      // ── Archive Page ──────────────────────────────────────────────────

      if (name === "notion_archive_page") {
        const pageId = input["page_id"] as string;

        const res = await notionFetch(`/pages/${pageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ archived: true }),
        });
        if (!res.ok) return await notionError(res);

        return `Page archived: ${pageId}`;
      }

      // ── Get Database ──────────────────────────────────────────────────

      if (name === "notion_get_database") {
        const dbId = input["database_id"] as string;

        const res = await notionFetch(`/databases/${dbId}`, token);
        if (!res.ok) return await notionError(res);

        const db = (await res.json()) as {
          id: string;
          title: any[];
          description: any[];
          properties: Record<string, any>;
          url: string;
        };

        const title =
          db.title?.map((t: any) => t.plain_text).join("") || "Untitled";
        const desc =
          db.description?.map((t: any) => t.plain_text).join("") || "";

        const propLines = Object.entries(db.properties)
          .map(([name, prop]: [string, any]) => {
            let detail = prop.type;
            if (prop.type === "select" && prop.select?.options) {
              detail += `: [${prop.select.options.map((o: any) => o.name).join(", ")}]`;
            }
            if (prop.type === "multi_select" && prop.multi_select?.options) {
              detail += `: [${prop.multi_select.options.map((o: any) => o.name).join(", ")}]`;
            }
            if (prop.type === "status" && prop.status?.options) {
              detail += `: [${prop.status.options.map((o: any) => o.name).join(", ")}]`;
            }
            return `  ${name} (${detail})`;
          })
          .join("\n");

        return [
          `Database: ${title}`,
          `ID: ${db.id}`,
          `URL: ${db.url}`,
          desc ? `Description: ${desc}` : "",
          `\nProperties:\n${propLines}`,
        ]
          .filter(Boolean)
          .join("\n");
      }

      // ── Query Database ────────────────────────────────────────────────

      if (name === "notion_query_database") {
        const dbId = input["database_id"] as string;
        const pageSize = Math.min(Number(input["page_size"] ?? 20), 100);

        const body: Record<string, unknown> = { page_size: pageSize };

        if (input["filter"]) {
          try {
            body["filter"] = JSON.parse(input["filter"] as string);
          } catch {
            return "Error: Invalid JSON in filter parameter.";
          }
        }
        if (input["sorts"]) {
          try {
            body["sorts"] = JSON.parse(input["sorts"] as string);
          } catch {
            return "Error: Invalid JSON in sorts parameter.";
          }
        }

        const res = await notionFetch(`/databases/${dbId}/query`, token, {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) return await notionError(res);

        const data = (await res.json()) as { results: any[] };
        if (data.results.length === 0) return "No items found.";

        return data.results
          .map((page: any) => {
            const props = formatPageProperties(page.properties);
            return `ID: ${page.id}\n${props}`;
          })
          .join("\n\n---\n\n");
      }

      // ── Create Database Item ──────────────────────────────────────────

      if (name === "notion_create_database_item") {
        const dbId = input["database_id"] as string;
        const title = input["title"] as string;
        const content = input["content"] as string | undefined;
        const propsStr = input["properties"] as string | undefined;

        const properties: Record<string, unknown> = {};
        if (propsStr) {
          try {
            Object.assign(properties, JSON.parse(propsStr));
          } catch {
            return "Error: Invalid JSON in properties parameter.";
          }
        }

        // Set title property
        if (!properties["Name"] && !properties["title"]) {
          properties["Name"] = {
            title: [{ text: { content: title } }],
          };
        }

        const body: Record<string, unknown> = {
          parent: { database_id: dbId },
          properties,
        };

        if (content) {
          body["children"] = markdownToBlocks(content);
        }

        const res = await notionFetch("/pages", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) return await notionError(res);

        const page = (await res.json()) as { id: string; url: string };
        return `Database item created: ${title}\n  ID: ${page.id}\n  URL: ${page.url}`;
      }

      // ── Update Database Item ──────────────────────────────────────────

      if (name === "notion_update_database_item") {
        const pageId = input["page_id"] as string;
        const propsStr = input["properties"] as string;

        let properties: Record<string, unknown>;
        try {
          properties = JSON.parse(propsStr);
        } catch {
          return "Error: Invalid JSON in properties parameter.";
        }

        const res = await notionFetch(`/pages/${pageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ properties }),
        });
        if (!res.ok) return await notionError(res);

        const page = (await res.json()) as { id: string; url: string };
        return `Database item updated: ${page.id}\n  URL: ${page.url}`;
      }

      // ── Append Blocks ─────────────────────────────────────────────────

      if (name === "notion_append_blocks") {
        const pageId = input["page_id"] as string;
        const content = input["content"] as string;

        const blocks = markdownToBlocks(content);
        if (blocks.length === 0) {
          return "Error: No content blocks to append.";
        }

        const res = await notionFetch(
          `/blocks/${pageId}/children`,
          token,
          {
            method: "PATCH",
            body: JSON.stringify({ children: blocks }),
          }
        );
        if (!res.ok) return await notionError(res);

        return `Appended ${blocks.length} block(s) to page ${pageId}.`;
      }
    } catch (err) {
      return `Notion request failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    return `Unknown notion tool: ${name}`;
  },
};

export default plugin;
