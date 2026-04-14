# GitHub Tool

Interact with GitHub repositories: list repos, manage issues and PRs, read and commit files.

## Capabilities

| Tool | Description | Approval Required |
|------|-------------|:-:|
| `github_list_repos` | List your repositories | |
| `github_list_issues` | List issues for a repo | |
| `github_create_issue` | Create a new issue | Yes |
| `github_update_issue` | Update an existing issue | |
| `github_list_prs` | List pull requests | |
| `github_create_pr` | Create a pull request | Yes |
| `github_update_pr` | Update a pull request | |
| `github_merge_pr` | Merge a pull request | Yes |
| `github_get_file` | Read a file from a repo | |
| `github_commit_file` | Create or update a file | Yes |

## Configuration

Requires a **GitHub Personal Access Token** with appropriate scopes:

- `repo` — full control of private repositories
- `public_repo` — access to public repositories (minimum)

Add the token in the agent's skill settings as `github_token`.

## Usage

Once installed on an agent, the agent can interact with GitHub repositories. Write operations (create issue, create PR, merge PR, commit file) require human approval before execution.
