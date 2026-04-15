# Web Search Tool

Search the internet and fetch web page content. Uses DuckDuckGo — no API key required.

## Capabilities

| Tool | Description | Approval Required |
|------|-------------|:-:|
| `web_search` | Search the internet via DuckDuckGo. Returns titles, URLs, and snippets. | |
| `web_fetch` | Fetch and read the full text content of any public URL. | |

## Configuration

No configuration required. This tool uses DuckDuckGo's public HTML search endpoint and standard HTTP fetch — no API keys needed.

| Key | Type | Required | Description |
|-----|------|:--:|-------------|
| — | — | — | No config fields |

## How it works

### web_search

- Searches via DuckDuckGo's HTML endpoint (no API key, no rate limits)
- Returns 1-10 results (default 5) with title, URL, and snippet for each
- Results are formatted as a numbered list with bold titles
- If DuckDuckGo returns a CAPTCHA or empty page, the agent sees a message to rephrase the query

### web_fetch

- Fetches any public URL using a standard browser User-Agent
- Strips HTML tags, scripts, and styles to return readable text
- Handles both HTML pages and plain text/JSON responses
- Content is truncated to **8000 characters** to fit within context windows
- 15-second timeout per request
- URL must start with `http://` or `https://`

## Typical usage pattern

1. Agent uses `web_search` to find relevant pages for a topic
2. Agent picks the most relevant result
3. Agent uses `web_fetch` to read the full content of that page
4. Agent uses the content to answer the user's question or complete the task

## Parameters

### web_search

| Parameter | Type | Required | Description |
|-----------|------|:--:|-------------|
| `query` | string | Yes | Search query — be specific for better results |
| `count` | number | No | Number of results (1-10, default 5) |

### web_fetch

| Parameter | Type | Required | Description |
|-----------|------|:--:|-------------|
| `url` | string | Yes | Full URL to fetch (must start with `http://` or `https://`) |
