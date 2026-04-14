/**
 * GitHub Tool Executor — DenPaq Registry Plugin
 *
 * Implements the RegistryToolPlugin interface.
 * All GitHub API interactions for DenPaq agents.
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

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DenPaq/1.0",
  };
}

async function ghFetch(
  path: string,
  token: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      ...ghHeaders(token),
      ...(options?.headers ?? {}),
    },
  });
}

// ── Plugin ──────────────────────────────────────────────────────────────────

const plugin: RegistryToolPlugin = {
  id: "github",

  async execute(name, input, ctx) {
    const token = ctx.config.github_token;
    if (!token) {
      return "Error: GitHub token not configured. Please add your Personal Access Token in the agent's skill settings.";
    }

    const headers = ghHeaders(token);

    try {
      // ── Repos ───────────────────────────────────────────────────────────

      if (name === "github_list_repos") {
        const perPage = Math.min(Number(input["per_page"] ?? 20), 30);
        const res = await ghFetch(
          `/user/repos?per_page=${perPage}&sort=updated`,
          token
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const repos = (await res.json()) as Array<{
          full_name: string;
          description: string | null;
          stargazers_count: number;
          language: string | null;
        }>;
        return repos
          .map(
            (r) =>
              `${r.full_name}${r.language ? ` [${r.language}]` : ""} ⭐${r.stargazers_count}${r.description ? ` — ${r.description}` : ""}`
          )
          .join("\n");
      }

      // ── Issues ──────────────────────────────────────────────────────────

      if (name === "github_list_issues") {
        const repo = input["repo"] as string;
        const state = (input["state"] as string) ?? "open";
        const res = await ghFetch(
          `/repos/${repo}/issues?state=${state}&per_page=20`,
          token
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const issues = (await res.json()) as Array<{
          number: number;
          title: string;
          state: string;
          html_url: string;
        }>;
        if (issues.length === 0) return "No issues found.";
        return issues
          .map((i) => `#${i.number} [${i.state}] ${i.title}\n  ${i.html_url}`)
          .join("\n");
      }

      if (name === "github_create_issue") {
        const repo = input["repo"] as string;
        const labels = input["labels"]
          ? String(input["labels"])
              .split(",")
              .map((l) => l.trim())
              .filter(Boolean)
          : undefined;
        const res = await ghFetch(`/repos/${repo}/issues`, token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input["title"],
            body: input["body"] ?? "",
            labels,
          }),
        });
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const issue = (await res.json()) as {
          number: number;
          html_url: string;
        };
        return `Issue created: #${issue.number}\n${issue.html_url}`;
      }

      if (name === "github_update_issue") {
        const repo = input["repo"] as string;
        const num = Number(input["issue_number"]);
        const body: Record<string, unknown> = {};
        if (input["title"]) body["title"] = input["title"];
        if (input["body"] !== undefined) body["body"] = input["body"];
        if (input["state"]) body["state"] = input["state"];
        if (input["labels"])
          body["labels"] = String(input["labels"])
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean);
        const res = await ghFetch(`/repos/${repo}/issues/${num}`, token, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const issue = (await res.json()) as {
          number: number;
          state: string;
          html_url: string;
        };
        return `Issue #${issue.number} updated (${issue.state}): ${issue.html_url}`;
      }

      // ── Pull Requests ───────────────────────────────────────────────────

      if (name === "github_list_prs") {
        const repo = input["repo"] as string;
        const state = (input["state"] as string) ?? "open";
        const res = await ghFetch(
          `/repos/${repo}/pulls?state=${state}&per_page=20`,
          token
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const prs = (await res.json()) as Array<{
          number: number;
          title: string;
          state: string;
          html_url: string;
          head: { ref: string };
          base: { ref: string };
        }>;
        if (prs.length === 0) return "No pull requests found.";
        return prs
          .map(
            (p) =>
              `#${p.number} [${p.state}] ${p.title}\n  ${p.head.ref} → ${p.base.ref}\n  ${p.html_url}`
          )
          .join("\n");
      }

      if (name === "github_create_pr") {
        const repo = input["repo"] as string;
        const res = await ghFetch(`/repos/${repo}/pulls`, token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input["title"],
            body: input["body"] ?? "",
            head: input["head"],
            base: input["base"],
            draft: input["draft"] ?? false,
          }),
        });
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const pr = (await res.json()) as {
          number: number;
          html_url: string;
        };
        return `PR created: #${pr.number}\n${pr.html_url}`;
      }

      if (name === "github_update_pr") {
        const repo = input["repo"] as string;
        const num = Number(input["pr_number"]);
        const body: Record<string, unknown> = {};
        if (input["title"]) body["title"] = input["title"];
        if (input["body"] !== undefined) body["body"] = input["body"];
        if (input["state"]) body["state"] = input["state"];
        if (input["base"]) body["base"] = input["base"];
        const res = await ghFetch(`/repos/${repo}/pulls/${num}`, token, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const pr = (await res.json()) as {
          number: number;
          state: string;
          html_url: string;
        };
        return `PR #${pr.number} updated (${pr.state}): ${pr.html_url}`;
      }

      if (name === "github_merge_pr") {
        const repo = input["repo"] as string;
        const num = Number(input["pr_number"]);
        const res = await ghFetch(
          `/repos/${repo}/pulls/${num}/merge`,
          token,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              commit_title: input["commit_title"] ?? undefined,
              merge_method: input["merge_method"] ?? "merge",
            }),
          }
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const result = (await res.json()) as {
          merged: boolean;
          message: string;
          sha: string;
        };
        return result.merged
          ? `PR #${num} merged. Commit: ${result.sha.slice(0, 7)}`
          : `Merge failed: ${result.message}`;
      }

      // ── File / Commit ───────────────────────────────────────────────────

      if (name === "github_get_file") {
        const repo = input["repo"] as string;
        const path = input["path"] as string;
        const ref = input["ref"] ? `?ref=${input["ref"]}` : "";
        const res = await ghFetch(
          `/repos/${repo}/contents/${path}${ref}`,
          token
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const data = (await res.json()) as {
          content?: string;
          encoding?: string;
        };
        if (data.encoding === "base64" && data.content) {
          const decoded = atob(data.content.replace(/\n/g, ""));
          return decoded.slice(0, 8000);
        }
        return "File content unavailable.";
      }

      if (name === "github_commit_file") {
        const repo = input["repo"] as string;
        const path = input["path"] as string;
        const branch = (input["branch"] as string | undefined) ?? undefined;
        const contentB64 = btoa(input["content"] as string);

        // Fetch existing file SHA (needed if file already exists)
        const refQuery = branch ? `?ref=${branch}` : "";
        const existRes = await ghFetch(
          `/repos/${repo}/contents/${path}${refQuery}`,
          token
        );
        let existingSha: string | undefined;
        if (existRes.ok) {
          const existing = (await existRes.json()) as { sha?: string };
          existingSha = existing.sha;
        }

        const body: Record<string, unknown> = {
          message: input["message"],
          content: contentB64,
        };
        if (branch) body["branch"] = branch;
        if (existingSha) body["sha"] = existingSha;

        const res = await ghFetch(
          `/repos/${repo}/contents/${path}`,
          token,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const result = (await res.json()) as {
          commit: { sha: string; html_url: string };
        };
        return `File committed: ${path}\nCommit: ${result.commit.sha.slice(0, 7)} — ${result.commit.html_url}`;
      }
    } catch (err) {
      return `GitHub request failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    return `Unknown github tool: ${name}`;
  },
};

export default plugin;
