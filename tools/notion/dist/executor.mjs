// tools/notion/executor.ts
var NOTION_API = "https://api.notion.com/v1";
var NOTION_VERSION = "2022-06-28";
function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json"
  };
}
async function notionFetch(path, token, options) {
  return fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      ...notionHeaders(token),
      ...options?.headers ?? {}
    }
  });
}
async function notionError(res) {
  const body = await res.text();
  try {
    const err = JSON.parse(body);
    return `Notion API error ${res.status}: ${err.message || body}`;
  } catch {
    return `Notion API error ${res.status}: ${body}`;
  }
}
function parseRichText(text) {
  const segments = [];
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        text: { content: text.slice(lastIndex, match.index) }
      });
    }
    if (match[2]) {
      segments.push({
        type: "text",
        text: { content: match[2] },
        annotations: { bold: true }
      });
    } else if (match[3]) {
      segments.push({
        type: "text",
        text: { content: match[3] },
        annotations: { italic: true }
      });
    } else if (match[4]) {
      segments.push({
        type: "text",
        text: { content: match[4] },
        annotations: { code: true }
      });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      text: { content: text.slice(lastIndex) }
    });
  }
  if (segments.length === 0) {
    segments.push({ type: "text", text: { content: text } });
  }
  return segments;
}
function markdownToBlocks(content) {
  const blocks = [];
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.trim() === "---") {
      blocks.push({ object: "block", type: "divider", divider: {} });
      i++;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim() || "plain text";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({
        object: "block",
        type: "code",
        code: {
          rich_text: [{ type: "text", text: { content: codeLines.join("\n") } }],
          language: lang
        }
      });
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: parseRichText(line.slice(4).trim()) }
      });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: parseRichText(line.slice(3).trim()) }
      });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: parseRichText(line.slice(2).trim()) }
      });
      i++;
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, "").trim();
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: { rich_text: parseRichText(text) }
      });
      i++;
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: parseRichText(line.slice(2).trim()) }
      });
      i++;
      continue;
    }
    if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
      const checked = line.startsWith("- [x] ");
      const text = line.slice(6).trim();
      blocks.push({
        object: "block",
        type: "to_do",
        to_do: { rich_text: parseRichText(text), checked }
      });
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push({
        object: "block",
        type: "quote",
        quote: { rich_text: parseRichText(line.slice(2).trim()) }
      });
      i++;
      continue;
    }
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: parseRichText(line.trim()) }
    });
    i++;
  }
  return blocks;
}
function formatPageProperties(properties) {
  const lines = [];
  for (const [key, prop] of Object.entries(properties)) {
    const type = prop.type;
    let value = "";
    switch (type) {
      case "title":
        value = prop.title?.map((t) => t.plain_text).join("") ?? "";
        break;
      case "rich_text":
        value = prop.rich_text?.map((t) => t.plain_text).join("") ?? "";
        break;
      case "number":
        value = prop.number != null ? String(prop.number) : "";
        break;
      case "select":
        value = prop.select?.name ?? "";
        break;
      case "multi_select":
        value = prop.multi_select?.map((s) => s.name).join(", ") ?? "";
        break;
      case "date":
        value = prop.date?.start ?? "";
        if (prop.date?.end) value += ` \u2192 ${prop.date.end}`;
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
        value = prop.people?.map((p) => p.name || p.id).join(", ") ?? "";
        break;
      case "relation":
        value = prop.relation?.map((r) => r.id).join(", ") ?? "";
        break;
      default:
        value = `[${type}]`;
    }
    if (value) lines.push(`  ${key}: ${value}`);
  }
  return lines.join("\n");
}
function formatBlocks(blocks) {
  return blocks.map((b) => {
    const type = b.type;
    const content = b[type];
    if (!content) return "";
    const text = content.rich_text?.map((t) => t.plain_text).join("") ?? "";
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
        return `\`\`\`${content.language ?? ""}
${text}
\`\`\``;
      case "divider":
        return "---";
      case "toggle":
        return `\u25B8 ${text}`;
      case "callout":
        return `\u{1F4A1} ${text}`;
      default:
        return text || `[${type} block]`;
    }
  }).filter(Boolean).join("\n");
}
var plugin = {
  id: "notion",
  async execute(name, input, ctx) {
    const token = ctx.config.notion_token;
    if (!token) {
      return "Error: Notion integration token not configured. Please add it in the agent's skill settings.";
    }
    try {
      if (name === "notion_search") {
        const query = input["query"];
        const pageSize = Math.min(Number(input["page_size"] ?? 10), 100);
        const body = {
          query,
          page_size: pageSize
        };
        if (input["filter_type"]) {
          body["filter"] = { value: input["filter_type"], property: "object" };
        }
        const res = await notionFetch("/search", token, {
          method: "POST",
          body: JSON.stringify(body)
        });
        if (!res.ok) return await notionError(res);
        const data = await res.json();
        if (data.results.length === 0) return "No results found.";
        return data.results.map((r) => {
          const type = r.object;
          const title = type === "page" ? r.properties?.title?.title?.map((t) => t.plain_text).join("") || r.properties?.Name?.title?.map((t) => t.plain_text).join("") || "Untitled" : r.title?.map((t) => t.plain_text).join("") || "Untitled";
          return `[${type}] ${title}
  ID: ${r.id}
  URL: ${r.url ?? "N/A"}`;
        }).join("\n\n");
      }
      if (name === "notion_get_page") {
        const pageId = input["page_id"];
        const pageRes = await notionFetch(`/pages/${pageId}`, token);
        if (!pageRes.ok) return await notionError(pageRes);
        const page = await pageRes.json();
        const blocksRes = await notionFetch(
          `/blocks/${pageId}/children?page_size=100`,
          token
        );
        const blocksData = blocksRes.ok ? await blocksRes.json() : { results: [] };
        const props = formatPageProperties(page.properties);
        const content = formatBlocks(blocksData.results);
        return [
          `Page: ${page.url}`,
          `ID: ${page.id}`,
          props ? `
Properties:
${props}` : "",
          content ? `
Content:
${content}` : "\n(empty page)"
        ].filter(Boolean).join("\n");
      }
      if (name === "notion_create_page") {
        const parentId = input["parent_id"];
        const parentType = input["parent_type"];
        const title = input["title"];
        const content = input["content"];
        const propsStr = input["properties"];
        const body = {
          parent: { [parentType]: parentId }
        };
        const properties = {};
        if (propsStr) {
          try {
            Object.assign(properties, JSON.parse(propsStr));
          } catch {
            return "Error: Invalid JSON in properties parameter.";
          }
        }
        if (parentType === "database_id") {
          if (!properties["Name"] && !properties["title"]) {
            properties["Name"] = {
              title: [{ text: { content: title } }]
            };
          }
        } else {
          properties["title"] = {
            title: [{ text: { content: title } }]
          };
        }
        body["properties"] = properties;
        if (content) {
          body["children"] = markdownToBlocks(content);
        }
        const res = await notionFetch("/pages", token, {
          method: "POST",
          body: JSON.stringify(body)
        });
        if (!res.ok) return await notionError(res);
        const page = await res.json();
        return `Page created: ${title}
  ID: ${page.id}
  URL: ${page.url}`;
      }
      if (name === "notion_update_page") {
        const pageId = input["page_id"];
        const propsStr = input["properties"];
        let properties;
        try {
          properties = JSON.parse(propsStr);
        } catch {
          return "Error: Invalid JSON in properties parameter.";
        }
        const res = await notionFetch(`/pages/${pageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ properties })
        });
        if (!res.ok) return await notionError(res);
        const page = await res.json();
        return `Page updated: ${page.id}
  URL: ${page.url}`;
      }
      if (name === "notion_archive_page") {
        const pageId = input["page_id"];
        const res = await notionFetch(`/pages/${pageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ archived: true })
        });
        if (!res.ok) return await notionError(res);
        return `Page archived: ${pageId}`;
      }
      if (name === "notion_get_database") {
        const dbId = input["database_id"];
        const res = await notionFetch(`/databases/${dbId}`, token);
        if (!res.ok) return await notionError(res);
        const db = await res.json();
        const title = db.title?.map((t) => t.plain_text).join("") || "Untitled";
        const desc = db.description?.map((t) => t.plain_text).join("") || "";
        const propLines = Object.entries(db.properties).map(([name2, prop]) => {
          let detail = prop.type;
          if (prop.type === "select" && prop.select?.options) {
            detail += `: [${prop.select.options.map((o) => o.name).join(", ")}]`;
          }
          if (prop.type === "multi_select" && prop.multi_select?.options) {
            detail += `: [${prop.multi_select.options.map((o) => o.name).join(", ")}]`;
          }
          if (prop.type === "status" && prop.status?.options) {
            detail += `: [${prop.status.options.map((o) => o.name).join(", ")}]`;
          }
          return `  ${name2} (${detail})`;
        }).join("\n");
        return [
          `Database: ${title}`,
          `ID: ${db.id}`,
          `URL: ${db.url}`,
          desc ? `Description: ${desc}` : "",
          `
Properties:
${propLines}`
        ].filter(Boolean).join("\n");
      }
      if (name === "notion_query_database") {
        const dbId = input["database_id"];
        const pageSize = Math.min(Number(input["page_size"] ?? 20), 100);
        const body = { page_size: pageSize };
        if (input["filter"]) {
          try {
            body["filter"] = JSON.parse(input["filter"]);
          } catch {
            return "Error: Invalid JSON in filter parameter.";
          }
        }
        if (input["sorts"]) {
          try {
            body["sorts"] = JSON.parse(input["sorts"]);
          } catch {
            return "Error: Invalid JSON in sorts parameter.";
          }
        }
        const res = await notionFetch(`/databases/${dbId}/query`, token, {
          method: "POST",
          body: JSON.stringify(body)
        });
        if (!res.ok) return await notionError(res);
        const data = await res.json();
        if (data.results.length === 0) return "No items found.";
        return data.results.map((page) => {
          const props = formatPageProperties(page.properties);
          return `ID: ${page.id}
${props}`;
        }).join("\n\n---\n\n");
      }
      if (name === "notion_create_database_item") {
        const dbId = input["database_id"];
        const title = input["title"];
        const content = input["content"];
        const propsStr = input["properties"];
        const properties = {};
        if (propsStr) {
          try {
            Object.assign(properties, JSON.parse(propsStr));
          } catch {
            return "Error: Invalid JSON in properties parameter.";
          }
        }
        if (!properties["Name"] && !properties["title"]) {
          properties["Name"] = {
            title: [{ text: { content: title } }]
          };
        }
        const body = {
          parent: { database_id: dbId },
          properties
        };
        if (content) {
          body["children"] = markdownToBlocks(content);
        }
        const res = await notionFetch("/pages", token, {
          method: "POST",
          body: JSON.stringify(body)
        });
        if (!res.ok) return await notionError(res);
        const page = await res.json();
        return `Database item created: ${title}
  ID: ${page.id}
  URL: ${page.url}`;
      }
      if (name === "notion_update_database_item") {
        const pageId = input["page_id"];
        const propsStr = input["properties"];
        let properties;
        try {
          properties = JSON.parse(propsStr);
        } catch {
          return "Error: Invalid JSON in properties parameter.";
        }
        const res = await notionFetch(`/pages/${pageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ properties })
        });
        if (!res.ok) return await notionError(res);
        const page = await res.json();
        return `Database item updated: ${page.id}
  URL: ${page.url}`;
      }
      if (name === "notion_append_blocks") {
        const pageId = input["page_id"];
        const content = input["content"];
        const blocks = markdownToBlocks(content);
        if (blocks.length === 0) {
          return "Error: No content blocks to append.";
        }
        const res = await notionFetch(
          `/blocks/${pageId}/children`,
          token,
          {
            method: "PATCH",
            body: JSON.stringify({ children: blocks })
          }
        );
        if (!res.ok) return await notionError(res);
        return `Appended ${blocks.length} block(s) to page ${pageId}.`;
      }
    } catch (err) {
      return `Notion request failed: ${err instanceof Error ? err.message : String(err)}`;
    }
    return `Unknown notion tool: ${name}`;
  }
};
var executor_default = plugin;
export {
  executor_default as default
};
