// tools/github/executor.ts
function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DenPaq/1.0"
  };
}
async function ghFetch(path, token, options) {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      ...ghHeaders(token),
      ...options?.headers ?? {}
    }
  });
}
var plugin = {
  id: "github",
  async execute(name, input, ctx) {
    const token = ctx.config.github_token;
    if (!token) {
      return "Error: GitHub token not configured. Please add your Personal Access Token in the agent's skill settings.";
    }
    const headers = ghHeaders(token);
    try {
      if (name === "github_list_repos") {
        const perPage = Math.min(Number(input["per_page"] ?? 20), 30);
        const res = await ghFetch(
          `/user/repos?per_page=${perPage}&sort=updated`,
          token
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const repos = await res.json();
        return repos.map(
          (r) => `${r.full_name}${r.language ? ` [${r.language}]` : ""} \u2B50${r.stargazers_count}${r.description ? ` \u2014 ${r.description}` : ""}`
        ).join("\n");
      }
      if (name === "github_list_issues") {
        const repo = input["repo"];
        const state = input["state"] ?? "open";
        const res = await ghFetch(
          `/repos/${repo}/issues?state=${state}&per_page=20`,
          token
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const issues = await res.json();
        if (issues.length === 0) return "No issues found.";
        return issues.map((i) => `#${i.number} [${i.state}] ${i.title}
  ${i.html_url}`).join("\n");
      }
      if (name === "github_create_issue") {
        const repo = input["repo"];
        const labels = input["labels"] ? String(input["labels"]).split(",").map((l) => l.trim()).filter(Boolean) : void 0;
        const res = await ghFetch(`/repos/${repo}/issues`, token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input["title"],
            body: input["body"] ?? "",
            labels
          })
        });
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const issue = await res.json();
        return `Issue created: #${issue.number}
${issue.html_url}`;
      }
      if (name === "github_update_issue") {
        const repo = input["repo"];
        const num = Number(input["issue_number"]);
        const body = {};
        if (input["title"]) body["title"] = input["title"];
        if (input["body"] !== void 0) body["body"] = input["body"];
        if (input["state"]) body["state"] = input["state"];
        if (input["labels"])
          body["labels"] = String(input["labels"]).split(",").map((l) => l.trim()).filter(Boolean);
        const res = await ghFetch(`/repos/${repo}/issues/${num}`, token, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const issue = await res.json();
        return `Issue #${issue.number} updated (${issue.state}): ${issue.html_url}`;
      }
      if (name === "github_list_prs") {
        const repo = input["repo"];
        const state = input["state"] ?? "open";
        const res = await ghFetch(
          `/repos/${repo}/pulls?state=${state}&per_page=20`,
          token
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const prs = await res.json();
        if (prs.length === 0) return "No pull requests found.";
        return prs.map(
          (p) => `#${p.number} [${p.state}] ${p.title}
  ${p.head.ref} \u2192 ${p.base.ref}
  ${p.html_url}`
        ).join("\n");
      }
      if (name === "github_create_pr") {
        const repo = input["repo"];
        const res = await ghFetch(`/repos/${repo}/pulls`, token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input["title"],
            body: input["body"] ?? "",
            head: input["head"],
            base: input["base"],
            draft: input["draft"] ?? false
          })
        });
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const pr = await res.json();
        return `PR created: #${pr.number}
${pr.html_url}`;
      }
      if (name === "github_update_pr") {
        const repo = input["repo"];
        const num = Number(input["pr_number"]);
        const body = {};
        if (input["title"]) body["title"] = input["title"];
        if (input["body"] !== void 0) body["body"] = input["body"];
        if (input["state"]) body["state"] = input["state"];
        if (input["base"]) body["base"] = input["base"];
        const res = await ghFetch(`/repos/${repo}/pulls/${num}`, token, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const pr = await res.json();
        return `PR #${pr.number} updated (${pr.state}): ${pr.html_url}`;
      }
      if (name === "github_merge_pr") {
        const repo = input["repo"];
        const num = Number(input["pr_number"]);
        const res = await ghFetch(
          `/repos/${repo}/pulls/${num}/merge`,
          token,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              commit_title: input["commit_title"] ?? void 0,
              merge_method: input["merge_method"] ?? "merge"
            })
          }
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const result = await res.json();
        return result.merged ? `PR #${num} merged. Commit: ${result.sha.slice(0, 7)}` : `Merge failed: ${result.message}`;
      }
      if (name === "github_get_file") {
        const repo = input["repo"];
        const path = input["path"];
        const ref = input["ref"] ? `?ref=${input["ref"]}` : "";
        const res = await ghFetch(
          `/repos/${repo}/contents/${path}${ref}`,
          token
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const data = await res.json();
        if (data.encoding === "base64" && data.content) {
          const decoded = atob(data.content.replace(/\n/g, ""));
          return decoded.slice(0, 8e3);
        }
        return "File content unavailable.";
      }
      if (name === "github_commit_file") {
        const repo = input["repo"];
        const path = input["path"];
        const branch = input["branch"] ?? void 0;
        const contentB64 = btoa(input["content"]);
        const refQuery = branch ? `?ref=${branch}` : "";
        const existRes = await ghFetch(
          `/repos/${repo}/contents/${path}${refQuery}`,
          token
        );
        let existingSha;
        if (existRes.ok) {
          const existing = await existRes.json();
          existingSha = existing.sha;
        }
        const body = {
          message: input["message"],
          content: contentB64
        };
        if (branch) body["branch"] = branch;
        if (existingSha) body["sha"] = existingSha;
        const res = await ghFetch(
          `/repos/${repo}/contents/${path}`,
          token,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );
        if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
        const result = await res.json();
        return `File committed: ${path}
Commit: ${result.commit.sha.slice(0, 7)} \u2014 ${result.commit.html_url}`;
      }
    } catch (err) {
      return `GitHub request failed: ${err instanceof Error ? err.message : String(err)}`;
    }
    return `Unknown github tool: ${name}`;
  }
};
var executor_default = plugin;
export {
  executor_default as default
};
