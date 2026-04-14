# DenPaq Registry — Design Document

A public git repository that serves as the central library of **external tools**, **skills**, and **agent profiles** for DenPaq.

> **Key principle:** Built-in tools (kanban, workspace-files, goals, code-runner) live in DenPaq core — they need direct access to DenPaq internals (DB, filesystem, process manager). This registry only contains **external/third-party tools** with self-contained executor code, plus skills and profiles which are pure data.

---

## Repository Structure

```
denpaq-registry/
├── package.json                         # Build tooling (esbuild for compiling executors)
├── tsconfig.json                        # TypeScript config for executor code
├── registry.json                        # Master index — DenPaq fetches this first
│
├── tools/                               # External tools (code + definitions)
│   ├── github/
│   │   ├── manifest.json                # Metadata + tool definitions + config fields + approval gates
│   │   ├── executor.ts                  # TypeScript source — implements RegistryToolPlugin
│   │   ├── dist/
│   │   │   └── executor.mjs            # Pre-built ESM bundle (CI produces this)
│   │   └── README.md                    # Documentation shown in Library UI
│   └── web-search/
│       ├── manifest.json
│       ├── executor.ts
│       ├── dist/
│       │   └── executor.mjs
│       └── README.md
│
├── skills/                              # Instruction-based skills (pure data — no code)
│   ├── project-planning/
│   │   ├── manifest.json                # Skill metadata
│   │   ├── instructions.md              # Instructions injected into agent system prompt
│   │   └── README.md
│   ├── stakeholder-communication/
│   │   ├── manifest.json
│   │   ├── instructions.md
│   │   └── README.md
│   ├── react-patterns/
│   │   ├── manifest.json
│   │   ├── instructions.md
│   │   └── README.md
│   ├── api-design/
│   │   ├── manifest.json
│   │   ├── instructions.md
│   │   └── README.md
│   ├── seo-optimization/
│   │   ├── manifest.json
│   │   ├── instructions.md
│   │   └── README.md
│   └── agile-scrum/
│       ├── manifest.json
│       ├── instructions.md
│       └── README.md
│
├── profiles/                            # Agent profiles (shown in Hire modal)
│   ├── project-manager/
│   │   ├── manifest.json                # Profile metadata
│   │   ├── agent.md                     # System prompt (YAML frontmatter + markdown)
│   │   ├── README.md
│   │   └── skills/                      # Skills bundled with this profile
│   │       ├── project-planning.md
│   │       └── stakeholder-communication.md
│   ├── frontend-developer/
│   │   ├── manifest.json
│   │   ├── agent.md
│   │   ├── README.md
│   │   └── skills/
│   │       └── react-patterns.md
│   ├── content-writer/
│   │   ├── manifest.json
│   │   ├── agent.md
│   │   ├── README.md
│   │   └── skills/
│   │       └── seo-optimization.md
│   ├── backend-developer/
│   │   ├── manifest.json
│   │   ├── agent.md
│   │   ├── README.md
│   │   └── skills/
│   │       └── api-design.md
│   ├── devops-engineer/
│   │   ├── manifest.json
│   │   ├── agent.md
│   │   └── README.md
│   ├── data-analyst/
│   │   ├── manifest.json
│   │   ├── agent.md
│   │   └── README.md
│   └── designer/
│       ├── manifest.json
│       ├── agent.md
│       └── README.md
│
├── schemas/                             # JSON Schema files for validation
│   ├── tool-manifest.schema.json
│   ├── skill-manifest.schema.json
│   ├── profile-manifest.schema.json
│   └── registry.schema.json
│
└── .github/
    └── workflows/
        └── build.yml                    # CI: compiles executor.ts → dist/executor.mjs
```

---

## What belongs here vs. DenPaq Core

| Category | In Registry? | Why |
|----------|-------------|-----|
| **External tools** (github, web-search, future 3rd-party) | YES — with executor code | Self-contained, no DenPaq internal access needed |
| **Skills** (project-planning, react-patterns, etc.) | YES — data only | Pure markdown instructions, no code |
| **Profiles** (project-manager, frontend-dev, etc.) | YES — data only | Agent templates + bundled skill MDs |
| **Built-in tools** (kanban, workspace-files, goals, code-runner) | NO | Need direct access to DenPaq DB, filesystem, process manager |
| **Tool executors for built-in tools** | NO | Compiled into DenPaq daemon |
| **UI components** | NO | Part of DenPaq web app |
| **System prompt builder, memory, vector store** | NO | Core DenPaq infrastructure |

---

## File Formats

### registry.json (Master Index)

The root index that DenPaq fetches to populate the Library UI. Only external tools appear here.

```json
{
  "version": "1.0.0",
  "tools": [
    { "id": "github", "path": "tools/github" },
    { "id": "web-search", "path": "tools/web-search" }
  ],
  "skills": [
    { "id": "project-planning", "path": "skills/project-planning" },
    { "id": "stakeholder-communication", "path": "skills/stakeholder-communication" },
    { "id": "react-patterns", "path": "skills/react-patterns" },
    { "id": "api-design", "path": "skills/api-design" },
    { "id": "seo-optimization", "path": "skills/seo-optimization" },
    { "id": "agile-scrum", "path": "skills/agile-scrum" }
  ],
  "profiles": [
    { "id": "project-manager", "path": "profiles/project-manager" },
    { "id": "frontend-developer", "path": "profiles/frontend-developer" },
    { "id": "content-writer", "path": "profiles/content-writer" },
    { "id": "backend-developer", "path": "profiles/backend-developer" },
    { "id": "devops-engineer", "path": "profiles/devops-engineer" },
    { "id": "data-analyst", "path": "profiles/data-analyst" },
    { "id": "designer", "path": "profiles/designer" }
  ]
}
```

---

### Tool manifest.json (External Tools with Executor Code)

Contains everything DenPaq needs to understand, display, and run the tool.

```json
{
  "id": "github",
  "name": "GitHub",
  "description": "List repos, read files, create and list issues, manage PRs on GitHub repositories.",
  "icon": "Github",
  "version": "1.0.0",
  "author": "DenPaq",
  "minDenpaqVersion": "0.2.0",

  "requiresConfig": true,
  "configFields": [
    {
      "key": "github_token",
      "label": "Personal Access Token",
      "type": "password",
      "required": true,
      "placeholder": "ghp_..."
    }
  ],

  "tags": ["development", "github", "version-control"],

  "approvalGated": [
    "github_create_issue",
    "github_create_pr",
    "github_merge_pr",
    "github_commit_file"
  ],

  "tools": [
    {
      "name": "github_list_repos",
      "description": "List GitHub repositories for the authenticated user.",
      "parameters": {
        "type": "object",
        "properties": {
          "page": { "type": "number", "description": "Page number (default 1)" },
          "per_page": { "type": "number", "description": "Results per page (default 30)" }
        }
      }
    },
    {
      "name": "github_list_issues",
      "description": "List issues for a given repository.",
      "parameters": {
        "type": "object",
        "properties": {
          "owner": { "type": "string", "description": "Repository owner" },
          "repo": { "type": "string", "description": "Repository name" },
          "state": { "type": "string", "description": "Filter by state", "enum": ["open", "closed", "all"] }
        },
        "required": ["owner", "repo"]
      }
    }
  ],

  "executorFile": "dist/executor.mjs",

  "systemPromptCapability": "interact with GitHub: list repos, manage issues and PRs, read and commit files via github_* tools"
}
```

---

### Tool Plugin Interface (executor.ts contract)

Every external tool must export a default `RegistryToolPlugin` object:

```typescript
/**
 * Context provided by DenPaq at call time.
 * This is the only bridge between the plugin and DenPaq — no DB or internal API access.
 */
export interface ToolContext {
  /** Config values the user provided (e.g. github_token) */
  config: Record<string, string>;
  /** The agent executing this tool */
  agentId: string;
  /** The agent's display name */
  agentName: string;
}

/**
 * The contract every registry tool executor must implement.
 */
export interface RegistryToolPlugin {
  /** Must match the tool id in manifest.json */
  id: string;
  /** Route a tool call to the correct handler and return the result string */
  execute: (
    toolName: string,
    input: Record<string, unknown>,
    context: ToolContext
  ) => Promise<string>;
}
```

Example executor (`tools/github/executor.ts`):

```typescript
import type { RegistryToolPlugin, ToolContext } from "./types";

async function githubFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...options?.headers,
    },
  });
  if (!res.ok) return `GitHub API error: ${res.status} ${await res.text()}`;
  return res.json();
}

const plugin: RegistryToolPlugin = {
  id: "github",

  async execute(name, input, ctx) {
    const token = ctx.config.github_token;
    if (!token) return "Error: GitHub token not configured. Please add it in agent skill settings.";

    switch (name) {
      case "github_list_repos": {
        const page = (input.page as number) || 1;
        const data = await githubFetch(`/user/repos?page=${page}&per_page=30&sort=updated`, token);
        return typeof data === "string" ? data : JSON.stringify(data.map((r: any) => ({
          name: r.full_name, description: r.description, stars: r.stargazers_count
        })), null, 2);
      }

      case "github_list_issues": {
        const { owner, repo, state } = input as any;
        const data = await githubFetch(`/repos/${owner}/${repo}/issues?state=${state || "open"}`, token);
        return typeof data === "string" ? data : JSON.stringify(data, null, 2);
      }

      // ... more tool handlers ...

      default:
        return `Unknown tool: ${name}`;
    }
  },
};

export default plugin;
```

---

### Skill manifest.json

Skills are pure data — no code. They provide instructions injected into an agent's system prompt.

```json
{
  "id": "project-planning",
  "name": "Project Planning",
  "description": "Structured project planning, milestone decomposition, and timeline management",
  "version": "1.0.0",
  "author": "DenPaq",
  "tags": ["planning", "project-management", "milestones"],
  "intentKeywords": ["planning", "project", "milestone", "timeline", "plan"],
  "instructionsFile": "instructions.md"
}
```

### Skill instructions.md

```markdown
When planning a project:

1. Start by clarifying the goal — write it as a one-sentence outcome statement
2. Break the goal into 3-5 milestones with clear completion criteria
3. For each milestone, list the tasks required (owner, estimated effort, dependencies)
4. Identify the critical path
5. Build in a 20% buffer on the overall timeline
6. Write the plan to `shared/[project-name]/project-plan.md`

Status report format (weekly):
...
```

---

### Profile manifest.json

```json
{
  "id": "project-manager",
  "name": "Project Manager",
  "role": "Project Manager",
  "avatar": "🗂️",
  "color": "#0EA5E9",
  "specialty": "Project delivery, milestone tracking, and team coordination",
  "version": "1.0.0",
  "author": "DenPaq",
  "tags": ["management", "planning", "coordination"],
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-6",
  "defaultPersonality": "Clear, structured, and proactive — surface blockers before they become problems",
  "builtinSkills": ["kanban", "workspace-files", "goals"],
  "registryTools": ["github"],
  "bundledSkills": [
    { "path": "skills/project-planning.md" },
    { "path": "skills/stakeholder-communication.md" }
  ],
  "agentFile": "agent.md"
}
```

> **Note:** `builtinSkills` references DenPaq core tools. `registryTools` references tools from this registry. `bundledSkills` are instruction-only skills shipped with the profile.

### Profile agent.md

```yaml
---
templateId: project-manager
name: Project Manager
role: Project Manager
---

# Project Manager

## Role
Project Manager — you own the plan, track every dependency, flag risks early.

## Working Principles
1. **Plan before executing** — always produce a written plan first
2. **One source of truth** — maintain a single project doc
3. **No ambiguous tasks** — every task needs a definition of done, an owner, and dependencies
4. **Proactive** — surface blockers 48 hours before they become problems
5. **Short feedback loops** — check progress regularly
6. **Scope discipline** — log all scope changes formally
7. **Data-driven** — use actual task statuses to forecast

## Anti-patterns
- Do NOT do the actual writing, designing, or coding yourself
- Do NOT create tasks without goal tags
- Do NOT proceed without a plan
- Do NOT leave tasks without dependencies when order matters
```

### Profile bundled skill MD (skills/project-planning.md)

```yaml
---
name: Project Planning
description: Structured project planning, milestone decomposition, and timeline management
---

When planning a project:
1. Start by clarifying the goal...
```

---

## Build System

The registry uses esbuild to compile `executor.ts` files into self-contained ESM bundles.

### package.json

```json
{
  "name": "denpaq-registry",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build.mjs",
    "validate": "node scripts/validate.mjs"
  },
  "devDependencies": {
    "esbuild": "^0.20.0"
  }
}
```

### scripts/build.mjs

```javascript
import { build } from "esbuild";
import { readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const toolsDir = "./tools";

for (const toolId of readdirSync(toolsDir)) {
  const executorPath = join(toolsDir, toolId, "executor.ts");
  if (!existsSync(executorPath)) continue;

  const distDir = join(toolsDir, toolId, "dist");
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

  await build({
    entryPoints: [executorPath],
    outfile: join(distDir, "executor.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    minify: false,          // Keep readable for auditing
    sourcemap: false,
  });

  console.log(`Built: ${toolId}/dist/executor.mjs`);
}
```

### .github/workflows/build.yml

```yaml
name: Build Executors
on:
  push:
    branches: [main]
    paths: ["tools/**/executor.ts"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npm run build
      - run: npm run validate
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "build: compile executor bundles"
          file_pattern: "tools/*/dist/*.mjs"
```

---

## How DenPaq Consumes the Registry

### Fetching

DenPaq fetches from the registry via raw GitHub URLs:

```
Settings -> Registry URL: https://raw.githubusercontent.com/user/denpaq-registry/main
```

1. Fetch `registry.json` -> get the index of all tools/skills/profiles
2. For Library UI: fetch individual `manifest.json` files on demand
3. For tool installation: fetch `manifest.json` + `dist/executor.mjs`
4. For skill installation: fetch `manifest.json` + `instructions.md`
5. For profile hiring: fetch `manifest.json` + `agent.md` + bundled skill MDs
6. Cache locally at `~/.denpaq/registry-cache/` with TTL

### Cache Structure

```
~/.denpaq/registry-cache/
  registry.json
  _meta.json                             # { lastFetched, registryUrl, registryVersion }
  tools/
    github/
      manifest.json
      executor.mjs                       # The pre-built bundle
      _meta.json                         # { version: "1.0.0", fetchedAt: "..." }
    web-search/
      manifest.json
      executor.mjs
      _meta.json
  skills/
    project-planning/
      manifest.json
      instructions.md
  profiles/
    project-manager/
      manifest.json
      agent.md
      skills/
        project-planning.md
        stakeholder-communication.md
```

### Installation Flows

**External tool installation:**
1. Fetch `tools/{id}/manifest.json`
2. Fetch `tools/{id}/dist/executor.mjs` -> cache to `~/.denpaq/registry-cache/tools/{id}/executor.mjs`
3. Register tool definitions in `agent_skills` table with `source = "registry"`
4. At execution time: DenPaq dynamically `import()`s the cached `.mjs` and calls `plugin.execute()`

**Skill installation:**
1. Fetch `skills/{id}/manifest.json` + `instructions.md`
2. Store as `custom_skills` entry with `sourceUrl = "registry:{id}"`

**Profile hiring:**
1. Fetch `profiles/{id}/manifest.json` + `agent.md` + bundled skill MDs
2. Create agent with prompt from `agent.md`
3. Install listed `builtinSkills` (DenPaq core)
4. Install listed `registryTools` (fetched from this registry)
5. Install `bundledSkills` as custom_skills

### Tool Execution Flow

```
LLM calls tool "github_create_issue"
  -> AgentRunner.buildExecutor() routes the call
     -> Not a built-in prefix (kanban_, file_, goal_, etc.)
     -> Check loaded registry plugins
     -> Found match in github plugin manifest.tools[]
     -> Call plugin.execute("github_create_issue", input, {
          config: { github_token: "ghp_..." },
          agentId: "abc123",
          agentName: "Project Manager"
        })
     -> Plugin makes GitHub API call, returns result string
     -> Result fed back to LLM
```

---

## Versioning

Each item has a `version` field (semver). DenPaq tracks installed versions and can show "update available" when the registry has a newer version.

```json
{
  "version": "1.2.0",
  "minDenpaqVersion": "0.2.0"
}
```

---

## Contributing

Third-party contributors can add to the registry via PRs:

### Adding a new external tool

1. Create `tools/{your-tool}/manifest.json` with tool definitions
2. Create `tools/{your-tool}/executor.ts` implementing `RegistryToolPlugin`
3. Add a `README.md` with documentation
4. Add entry to `registry.json`
5. Run `npm run build` to generate `dist/executor.mjs`
6. Submit PR

### Adding a new skill

1. Create `skills/{your-skill}/manifest.json` with metadata
2. Create `skills/{your-skill}/instructions.md` with instructions
3. Add a `README.md`
4. Add entry to `registry.json`
5. Submit PR

### Adding a new profile

1. Create `profiles/{your-profile}/manifest.json`
2. Create `profiles/{your-profile}/agent.md` with system prompt
3. Optionally add `skills/` subdirectory with bundled skill MDs
4. Add a `README.md`
5. Add entry to `registry.json`
6. Submit PR

Registry maintainers review and merge. DenPaq instances fetch the updated registry on next library open.

---

## API Contract (DenPaq <-> Registry)

```
GET  {registryUrl}/registry.json                       -> Master index
GET  {registryUrl}/tools/{id}/manifest.json             -> Tool metadata + definitions
GET  {registryUrl}/tools/{id}/dist/executor.mjs         -> Pre-built executor bundle
GET  {registryUrl}/tools/{id}/README.md                 -> Tool documentation
GET  {registryUrl}/skills/{id}/manifest.json            -> Skill metadata
GET  {registryUrl}/skills/{id}/instructions.md          -> Skill instructions
GET  {registryUrl}/skills/{id}/README.md                -> Skill documentation
GET  {registryUrl}/profiles/{id}/manifest.json          -> Profile metadata
GET  {registryUrl}/profiles/{id}/agent.md               -> Agent system prompt
GET  {registryUrl}/profiles/{id}/README.md              -> Profile documentation
GET  {registryUrl}/profiles/{id}/skills/{name}.md       -> Bundled skill instructions
```

All fetches are simple HTTP GETs — no auth required (public repo). Private registries can use token-based auth configured in DenPaq settings.

---

## Security Considerations

- **Plugin isolation:** Registry tool executors receive only a `ToolContext` (config, agentId, agentName). They have NO access to DenPaq's database, filesystem, memory system, or internal APIs.
- **Approval gates:** Sensitive tool operations (e.g. `github_create_issue`, `github_merge_pr`) are listed in `manifest.json.approvalGated[]`. DenPaq enforces human approval before executing these.
- **Code auditing:** Executor bundles are unminified for easy review. The GitHub Actions workflow auto-builds from source, so the `.mjs` always matches the `.ts`.
- **Curated registry:** PRs are reviewed by maintainers before merge. DenPaq only fetches from the configured registry URL.
