// tools/web-search/executor.ts
var BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function decodeHtmlEntities(text) {
  return text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function resolveUddgHref(rawHref) {
  try {
    if (rawHref.includes("uddg=")) {
      const url = new URL(rawHref, "https://duckduckgo.com");
      const uddg = url.searchParams.get("uddg");
      if (uddg) return decodeURIComponent(uddg);
    }
    if (rawHref.startsWith("http")) return rawHref;
  } catch {
  }
  return rawHref;
}
function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s{3,}/g, "\n\n").trim();
}
var plugin = {
  id: "web-search",
  async execute(name, input, _ctx) {
    if (name === "web_fetch") {
      const url = input["url"].trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return "Error: URL must start with http:// or https://";
      }
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": BROWSER_UA,
            Accept: "text/html,text/plain,application/json,*/*"
          },
          signal: AbortSignal.timeout(15e3)
        });
        if (!res.ok)
          return `HTTP ${res.status} ${res.statusText} fetching ${url}`;
        const contentType = res.headers.get("content-type") ?? "";
        const text = await res.text();
        let content = text;
        if (contentType.includes("html")) {
          content = stripHtml(text);
        }
        const maxLen = 8e3;
        if (content.length > maxLen) {
          content = content.slice(0, maxLen) + `

[... content truncated \u2014 ${content.length} chars total]`;
        }
        return `Fetched: ${url}

${content}`;
      } catch (err) {
        return `Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    if (name === "web_search") {
      const query = input["query"];
      const count = Math.min(Math.max(Number(input["count"] ?? 5), 1), 10);
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`;
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": BROWSER_UA,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
          }
        });
        if (!res.ok) throw new Error(`DDG returned HTTP ${res.status}`);
        const html = await res.text();
        const results = [];
        const titlePattern = /<a\s[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
        let m;
        while ((m = titlePattern.exec(html)) !== null && results.length < count) {
          const rawHref = m[1] ?? "";
          const rawTitle = m[2] ?? "";
          const url = resolveUddgHref(rawHref);
          const title = decodeHtmlEntities(
            rawTitle.replace(/<[^>]+>/g, "").trim()
          );
          if (!url.startsWith("http") || !title) continue;
          results.push({ title, url, snippet: "" });
        }
        const snippetPattern = /<a\s[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
        let idx = 0;
        while ((m = snippetPattern.exec(html)) !== null && idx < results.length) {
          const rawSnippet = m[1] ?? "";
          const snippet = decodeHtmlEntities(
            rawSnippet.replace(/<[^>]+>/g, "").trim()
          );
          const result = results[idx];
          if (result) result.snippet = snippet;
          idx++;
        }
        if (results.length === 0) {
          return "No results found. DuckDuckGo may have returned a CAPTCHA or empty page \u2014 try rephrasing the query.";
        }
        return results.map(
          (r, i) => `${i + 1}. **${r.title}**
   ${r.url}${r.snippet ? "\n   " + r.snippet : ""}`
        ).join("\n\n");
      } catch (err) {
        return `Search failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    return `Unknown web search tool: ${name}`;
  }
};
var executor_default = plugin;
export {
  executor_default as default
};
