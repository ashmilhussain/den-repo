# DenPaq Registry

Central library of tools, skills, and agent profiles for DenPaq.

> **For maintainers only.** End users interact with this registry through DenPaq's Library UI — they never need to touch this repo directly.

## What's in here

| Category | Count | Description |
|----------|:-----:|-------------|
| **Tools** | 3 | External integrations with executable code (GitHub, Web Search, Notion) |
| **Skills** | 13 | Instruction sets injected into agent system prompts |
| **Profiles** | 10 | Pre-configured agent templates with roles, personalities, and skill bundles |

## Registry structure

```
registry.json                 ← Master index (DenPaq fetches this first)
tools/
  github/                     ← External tool with executor code
    manifest.json               Tool definitions + config + approval gates
    executor.ts                 TypeScript source
    dist/executor.mjs           Pre-built ESM bundle (CI produces this)
    README.md                   Documentation
  web-search/
  notion/
skills/
  project-planning/           ← Skill (data only, no code)
    manifest.json               Metadata + intent keywords
    instructions.md             Instructions injected into agent prompt
    README.md
  ...
profiles/
  project-manager/            ← Agent profile
    manifest.json               Role, skills, model, personality
    agent.md                    System prompt (YAML frontmatter + markdown)
    README.md
  ...
schemas/                      ← JSON Schema files for validation
scripts/                      ← Build + validation scripts
```

## Tools

Tools are external integrations with **executable code**. Each tool has a `manifest.json` (definitions, config, approval gates) and an `executor.ts` that implements the `RegistryToolPlugin` interface.

| Tool | Description | Requires Config | Docs |
|------|-------------|:--:|:--:|
| [GitHub](tools/github/) | Repos, issues, PRs, file commits | `github_token` | [README](tools/github/README.md) |
| [Web Search](tools/web-search/) | DuckDuckGo search + URL fetching | None | [README](tools/web-search/README.md) |
| [Notion](tools/notion/) | Pages, databases, content blocks | `notion_token` | [README](tools/notion/README.md) |

## Skills

Skills are **instruction-only** — no executable code. They provide domain knowledge and best practices that get injected into an agent's system prompt.

| Skill | Description |
|-------|-------------|
| [project-planning](skills/project-planning/) | Milestone decomposition, timeline management, status reports |
| [stakeholder-communication](skills/stakeholder-communication/) | Audience-appropriate communication, escalation format |
| [react-patterns](skills/react-patterns/) | Component architecture, hooks, state management |
| [api-design](skills/api-design/) | REST conventions, error handling, response shapes |
| [seo-optimization](skills/seo-optimization/) | On-page SEO, technical SEO, content structure |
| [agile-scrum](skills/agile-scrum/) | Sprint ceremonies, story format, estimation |
| [infrastructure](skills/infrastructure/) | Containers, CI/CD pipelines, env variables |
| [product-planning](skills/product-planning/) | Roadmaps, discovery checklists, definition of ready |
| [documentation-style](skills/documentation-style/) | Voice, tone, formatting standards |
| [seo-strategy](skills/seo-strategy/) | Keyword research, content strategy, competitor analysis |
| [notion-management](skills/notion-management/) | Workspace organisation, database design patterns |
| [tailwind-css](skills/tailwind-css/) | Utility-first styling, design tokens, responsive design, v4 migration |
| [shadcn-ui](skills/shadcn-ui/) | Component patterns, CLI usage, forms, theming, accessible UI |

## Profiles

Profiles are pre-configured agent templates. Each has a role, system prompt, default model, and a set of built-in skills, registry tools, and registry skills.

| Profile | Specialty | Built-in Skills | Registry Tools | Registry Skills |
|---------|-----------|----------------|---------------|----------------|
| [Project Manager](profiles/project-manager/) | Delivery, milestones, coordination | kanban, workspace-files | web-search | project-planning, stakeholder-communication |
| [Frontend Developer](profiles/frontend-developer/) | React, TypeScript, accessible UI | kanban, workspace-files, code-runner | github | react-patterns |
| [Backend Developer](profiles/backend-developer/) | APIs, databases, security | kanban, workspace-files, code-runner | github | api-design |
| [Full-Stack Developer](profiles/fullstack-developer/) | End-to-end features | kanban, workspace-files, code-runner | github, web-search | — |
| [DevOps Engineer](profiles/devops-engineer/) | Infrastructure, CI/CD, deployment | kanban, workspace-files, code-runner | — | infrastructure |
| [Technical Writer](profiles/technical-writer/) | Docs, user guides, API references | workspace-files | web-search | documentation-style |
| [Product Manager](profiles/product-manager/) | Strategy, roadmaps, PRDs | kanban, workspace-files | web-search | product-planning |
| [Data Analyst](profiles/data-analyst/) | SQL, analysis, visualisation | kanban, workspace-files, code-runner | web-search | — |
| [Designer](profiles/designer/) | UI/UX, design systems | kanban, workspace-files | web-search | — |
| [SEO Analyst](profiles/seo-analyst/) | Keyword research, technical SEO | kanban, workspace-files | web-search | seo-strategy |

## For maintainers

### Prerequisites

- Node.js 20+
- npm

### Build

Compiles `executor.ts` files into `dist/executor.mjs` bundles using esbuild:

```bash
npm install
npm run build
```

### Validate

Checks that all manifests, executors, and file references are valid:

```bash
npm run validate
```

### Adding a new tool

1. Create `tools/{your-tool}/manifest.json` — tool definitions, config fields, approval gates
2. Create `tools/{your-tool}/executor.ts` — implement `RegistryToolPlugin` interface
3. Create `tools/{your-tool}/README.md`
4. Add entry to `registry.json`
5. Run `npm run build && npm run validate`

### Adding a new skill

1. Create `skills/{your-skill}/manifest.json` — metadata and intent keywords
2. Create `skills/{your-skill}/instructions.md` — the actual instructions
3. Create `skills/{your-skill}/README.md`
4. Add entry to `registry.json`
5. Run `npm run validate`

### Adding a new profile

1. Create `profiles/{your-profile}/manifest.json` — role, skills, model config
2. Create `profiles/{your-profile}/agent.md` — system prompt
3. Create `profiles/{your-profile}/README.md`
4. Add entry to `registry.json`
5. Run `npm run validate`

### Plugin interface

Every tool executor must export a default `RegistryToolPlugin`:

```typescript
interface RegistryToolPlugin {
  id: string;
  execute: (
    toolName: string,
    input: Record<string, unknown>,
    context: { config: Record<string, string>; agentId: string; agentName: string }
  ) => Promise<string>;
}
```

### CI

GitHub Actions automatically builds executor bundles and validates on push to `main`.
