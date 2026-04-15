# GitHub Tool

Interact with GitHub repositories: list repos, manage issues and PRs, read and commit files.

## Capabilities

| Tool | Description | Approval Required |
|------|-------------|:-:|
| `github_list_repos` | List repositories for the authenticated user | |
| `github_list_issues` | List issues for a repo (filter by state) | |
| `github_create_issue` | Create a new issue with title, body, labels | Yes |
| `github_update_issue` | Update issue title, body, state, or labels | |
| `github_list_prs` | List pull requests (filter by state) | |
| `github_create_pr` | Create a pull request (head, base, draft support) | Yes |
| `github_update_pr` | Update PR title, body, state, or base branch | |
| `github_merge_pr` | Merge a PR (merge, squash, or rebase) | Yes |
| `github_get_file` | Read file content from a repo (any branch/ref) | |
| `github_commit_file` | Create or update a file (direct commit to branch) | Yes |

## Configuration

Requires a **GitHub Personal Access Token**.

### How to get a token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** (classic)
3. Select scopes:
   - `repo` — full control of private repositories
   - `public_repo` — sufficient for public repositories only
4. Copy the token (starts with `ghp_`)

### Config field

| Key | Type | Required | Description |
|-----|------|:--:|-------------|
| `github_token` | password | Yes | Personal Access Token (`ghp_...`) |

## How it works

- **Read operations** (list repos, list issues, list PRs, get file) execute immediately
- **Write operations** (create issue, create PR, merge PR, commit file) require **human approval** before execution — the agent proposes the action, the user confirms
- Repos are listed sorted by last updated, max 30 per request
- Issues and PRs return up to 20 per request
- File content is truncated to 8000 characters for large files
- Commit file auto-detects whether to create or update (fetches existing SHA)

## Parameter format

### Repo format
All repo parameters use `owner/name` format:
```
octocat/Hello-World
myorg/backend-api
```

### Labels
Pass as comma-separated string:
```
bug, priority:high, frontend
```

### Merge methods
`merge` (default), `squash`, or `rebase`
