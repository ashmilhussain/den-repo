# Web Search Tool

Search the internet and fetch web page content. Uses DuckDuckGo — no API key required.

## Capabilities

| Tool | Description |
|------|-------------|
| `web_search` | Search the internet via DuckDuckGo. Returns titles, URLs, and snippets. |
| `web_fetch` | Fetch and read the full text content of any public URL. |

## Configuration

No configuration required. This tool uses DuckDuckGo's public HTML search endpoint.

## Usage

Agents can search for current information, documentation, news, or any topic. Use `web_search` to find relevant pages, then `web_fetch` to read specific pages in full.

Results from `web_fetch` are limited to 8000 characters to fit within context windows.
