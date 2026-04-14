/**
 * Web Search Tool Executor — DenPaq Registry Plugin
 *
 * Implements the RegistryToolPlugin interface.
 * Search via DuckDuckGo and fetch web page content.
 * No API key required.
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

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function resolveUddgHref(rawHref: string): string {
  // DuckDuckGo wraps URLs: /l/?uddg=ENCODED_URL&...
  try {
    if (rawHref.includes("uddg=")) {
      const url = new URL(rawHref, "https://duckduckgo.com");
      const uddg = url.searchParams.get("uddg");
      if (uddg) return decodeURIComponent(uddg);
    }
    if (rawHref.startsWith("http")) return rawHref;
  } catch {
    // fall through
  }
  return rawHref;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

// ── Plugin ──────────────────────────────────────────────────────────────────

const plugin: RegistryToolPlugin = {
  id: "web-search",

  async execute(name, input, _ctx) {
    // ── web_fetch ─────────────────────────────────────────────────────────

    if (name === "web_fetch") {
      const url = (input["url"] as string).trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return "Error: URL must start with http:// or https://";
      }
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": BROWSER_UA,
            Accept: "text/html,text/plain,application/json,*/*",
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok)
          return `HTTP ${res.status} ${res.statusText} fetching ${url}`;
        const contentType = res.headers.get("content-type") ?? "";
        const text = await res.text();

        let content = text;
        if (contentType.includes("html")) {
          content = stripHtml(text);
        }

        const maxLen = 8000;
        if (content.length > maxLen) {
          content =
            content.slice(0, maxLen) +
            `\n\n[... content truncated — ${content.length} chars total]`;
        }
        return `Fetched: ${url}\n\n${content}`;
      } catch (err) {
        return `Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // ── web_search ────────────────────────────────────────────────────────

    if (name === "web_search") {
      const query = input["query"] as string;
      const count = Math.min(Math.max(Number(input["count"] ?? 5), 1), 10);

      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`;
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": BROWSER_UA,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
        });

        if (!res.ok) throw new Error(`DDG returned HTTP ${res.status}`);
        const html = await res.text();

        const results: Array<{
          title: string;
          url: string;
          snippet: string;
        }> = [];

        // Extract result titles + URLs
        const titlePattern =
          /<a\s[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
        let m: RegExpExecArray | null;
        while (
          (m = titlePattern.exec(html)) !== null &&
          results.length < count
        ) {
          const rawHref = m[1] ?? "";
          const rawTitle = m[2] ?? "";
          const url = resolveUddgHref(rawHref);
          const title = decodeHtmlEntities(
            rawTitle.replace(/<[^>]+>/g, "").trim()
          );
          if (!url.startsWith("http") || !title) continue;
          results.push({ title, url, snippet: "" });
        }

        // Extract snippets
        const snippetPattern =
          /<a\s[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
        let idx = 0;
        while (
          (m = snippetPattern.exec(html)) !== null &&
          idx < results.length
        ) {
          const rawSnippet = m[1] ?? "";
          const snippet = decodeHtmlEntities(
            rawSnippet.replace(/<[^>]+>/g, "").trim()
          );
          const result = results[idx];
          if (result) result.snippet = snippet;
          idx++;
        }

        if (results.length === 0) {
          return "No results found. DuckDuckGo may have returned a CAPTCHA or empty page — try rephrasing the query.";
        }

        return results
          .map(
            (r, i) =>
              `${i + 1}. **${r.title}**\n   ${r.url}${r.snippet ? "\n   " + r.snippet : ""}`
          )
          .join("\n\n");
      } catch (err) {
        return `Search failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    return `Unknown web search tool: ${name}`;
  },
};

export default plugin;
