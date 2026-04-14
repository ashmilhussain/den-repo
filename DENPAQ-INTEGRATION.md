# DenPaq Integration Guide — Consuming the Registry

Step-by-step guide for modifying the DenPaq application to dynamically fetch, cache, and execute tools/skills/profiles from this public registry.

> **Registry URL:** `https://raw.githubusercontent.com/ashmilhussain/den-repo/main`

---

## Overview of Changes

```
DenPaq (apps/daemon)                  What Changes
──────────────────────                ─────────────
packages/types/src/index.ts           Add RegistryToolPlugin, ToolContext, RegistryToolManifest types
apps/daemon/src/registry/             NEW — RegistryManager service (fetch/cache/load)
apps/daemon/src/skills/catalog.ts     Remove github & web-search from SKILL_CATALOG
apps/daemon/src/skills/toolDefs.ts    Remove GITHUB_TOOLS & WEB_SEARCH_TOOLS, add registry merging
apps/daemon/src/skills/executors.ts   Remove execGitHub & execWebSearch, dynamic approval gates
apps/daemon/src/agents/AgentRunner.ts Modify buildExecutor() to route to registry plugins
apps/daemon/src/api/skills.ts         Add registry API endpoints
apps/daemon/src/api/templates.ts      Support registry profiles in Library UI
apps/daemon/src/settings.ts           Add registryUrl setting
apps/daemon/src/db/migrations/        New migration for registry tool tracking
apps/web/src/lib/api.ts               Add registry API client
apps/web/src/hooks/useSkills.ts       Merge built-in + registry catalog
```

---

## Step 1: Add New Types

**File:** `packages/types/src/index.ts`

### 1a. Narrow BuiltinSkillId (remove external tools)

```typescript
// BEFORE:
export type BuiltinSkillId = "kanban" | "workspace-files" | "github" | "web-search" | "code-runner" | "goals";

// AFTER:
export type BuiltinSkillId = "kanban" | "workspace-files" | "code-runner" | "goals";
```

### 1b. Add registry types

```typescript
/** Context passed by DenPaq to registry tool executors at call time */
export interface ToolContext {
  /** User-provided config values for this tool (e.g. github_token) */
  config: Record<string, string>;
  /** The agent executing this tool */
  agentId: string;
  /** The agent's display name */
  agentName: string;
}

/** Contract that every registry tool executor must implement */
export interface RegistryToolPlugin {
  /** Must match the tool id in manifest.json */
  id: string;
  /** Route a tool call and return the result string */
  execute: (
    toolName: string,
    input: Record<string, unknown>,
    context: ToolContext
  ) => Promise<string>;
}

/** Shape of a registry tool manifest.json */
export interface RegistryToolManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  author: string;
  minDenpaqVersion?: string;
  requiresConfig: boolean;
  configFields: SkillConfigField[];
  tags: string[];
  approvalGated: string[];
  tools: ToolDefinition[];
  executorFile: string;
  systemPromptCapability: string;
}

/** Shape of a registry skill manifest.json */
export interface RegistrySkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  intentKeywords: string[];
  instructionsFile: string;
}

/** Shape of a registry profile manifest.json */
export interface RegistryProfileManifest {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  specialty: string;
  version: string;
  author: string;
  tags: string[];
  defaultProvider: string;
  defaultModel: string;
  defaultPersonality: string;
  builtinSkills: BuiltinSkillId[];
  registryTools: string[];
  bundledSkills: { path: string }[];
  agentFile: string;
}

/** Registry index (registry.json) */
export interface RegistryIndex {
  version: string;
  tools: { id: string; path: string }[];
  skills: { id: string; path: string }[];
  profiles: { id: string; path: string }[];
}

/** Widen AgentSkill to support registry-sourced tools */
export interface AgentSkill {
  agentId: string;
  skillId: string;                     // Was BuiltinSkillId, now string to support registry IDs
  config: Record<string, string>;
  installedAt: number;
  source: "builtin" | "registry";      // NEW — track where this skill came from
}

/** Add to Settings */
export interface Settings {
  // ... existing fields ...
  registryUrl: string;                 // Default: "https://raw.githubusercontent.com/ashmilhussain/den-repo/main"
}
```

---

## Step 2: Create RegistryManager Service

**New file:** `apps/daemon/src/registry/RegistryManager.ts`

This is the core service that fetches, caches, and dynamically loads registry items.

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type {
  RegistryIndex,
  RegistryToolManifest,
  RegistryToolPlugin,
  RegistrySkillManifest,
  RegistryProfileManifest,
} from "@denpaq/types";
import { getSettings } from "../settings.js";

const CACHE_DIR = join(homedir(), ".denpaq", "registry-cache");
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In-memory plugin cache (loaded .mjs modules)
const pluginCache = new Map<string, RegistryToolPlugin>();

/** Ensure cache directory exists */
function ensureCacheDir(subpath: string) {
  const dir = join(CACHE_DIR, subpath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Check if cached file is still fresh */
function isCacheFresh(metaPath: string): boolean {
  if (!existsSync(metaPath)) return false;
  const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
  return Date.now() - meta.fetchedAt < CACHE_TTL;
}

/** Fetch a file from the registry, with disk cache */
async function fetchRegistryFile(relativePath: string, cacheSubpath: string, filename: string): Promise<string> {
  const cacheDir = ensureCacheDir(cacheSubpath);
  const cachedFile = join(cacheDir, filename);
  const metaFile = join(cacheDir, "_meta.json");

  // Return cached if fresh
  if (isCacheFresh(metaFile) && existsSync(cachedFile)) {
    return readFileSync(cachedFile, "utf-8");
  }

  // Fetch from registry
  const { registryUrl } = getSettings();
  const url = `${registryUrl}/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Registry fetch failed: ${res.status} ${url}`);

  const content = await res.text();

  // Write to cache
  writeFileSync(cachedFile, content, "utf-8");
  writeFileSync(metaFile, JSON.stringify({ fetchedAt: Date.now(), url }), "utf-8");

  return content;
}

/** Fetch the binary/JS executor bundle */
async function fetchExecutorBundle(toolId: string): Promise<string> {
  const cacheDir = ensureCacheDir(`tools/${toolId}`);
  const cachedFile = join(cacheDir, "executor.mjs");
  const metaFile = join(cacheDir, "_meta.json");

  if (isCacheFresh(metaFile) && existsSync(cachedFile)) {
    return cachedFile;
  }

  const { registryUrl } = getSettings();
  const url = `${registryUrl}/tools/${toolId}/dist/executor.mjs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Executor fetch failed: ${res.status} ${url}`);

  const content = await res.text();
  writeFileSync(cachedFile, content, "utf-8");
  writeFileSync(metaFile, JSON.stringify({ fetchedAt: Date.now(), url }), "utf-8");

  return cachedFile;
}

// ─── Public API ──────────────────────────────────────────

/** Fetch the master registry index */
export async function fetchIndex(): Promise<RegistryIndex> {
  const content = await fetchRegistryFile("registry.json", "", "registry.json");
  return JSON.parse(content);
}

/** Fetch a tool manifest */
export async function fetchToolManifest(toolId: string): Promise<RegistryToolManifest> {
  const content = await fetchRegistryFile(
    `tools/${toolId}/manifest.json`,
    `tools/${toolId}`,
    "manifest.json"
  );
  return JSON.parse(content);
}

/** Fetch a skill manifest + instructions */
export async function fetchSkill(skillId: string): Promise<{ manifest: RegistrySkillManifest; instructions: string }> {
  const manifestContent = await fetchRegistryFile(
    `skills/${skillId}/manifest.json`,
    `skills/${skillId}`,
    "manifest.json"
  );
  const manifest: RegistrySkillManifest = JSON.parse(manifestContent);
  const instructions = await fetchRegistryFile(
    `skills/${skillId}/${manifest.instructionsFile}`,
    `skills/${skillId}`,
    manifest.instructionsFile
  );
  return { manifest, instructions };
}

/** Fetch a profile manifest + agent.md + bundled skills */
export async function fetchProfile(profileId: string): Promise<{
  manifest: RegistryProfileManifest;
  agentMd: string;
  bundledSkills: { name: string; content: string }[];
}> {
  const manifestContent = await fetchRegistryFile(
    `profiles/${profileId}/manifest.json`,
    `profiles/${profileId}`,
    "manifest.json"
  );
  const manifest: RegistryProfileManifest = JSON.parse(manifestContent);
  const agentMd = await fetchRegistryFile(
    `profiles/${profileId}/${manifest.agentFile}`,
    `profiles/${profileId}`,
    manifest.agentFile
  );
  const bundledSkills = await Promise.all(
    manifest.bundledSkills.map(async (s) => {
      const filename = s.path.split("/").pop()!;
      const content = await fetchRegistryFile(
        `profiles/${profileId}/${s.path}`,
        `profiles/${profileId}/skills`,
        filename
      );
      return { name: filename.replace(".md", ""), content };
    })
  );
  return { manifest, agentMd, bundledSkills };
}

/** Load a tool plugin (dynamic import of cached .mjs). Returns cached instance if already loaded. */
export async function getPlugin(toolId: string): Promise<RegistryToolPlugin> {
  if (pluginCache.has(toolId)) return pluginCache.get(toolId)!;

  const mjsPath = await fetchExecutorBundle(toolId);
  // Dynamic import of ESM module
  const module = await import(/* webpackIgnore: true */ mjsPath);
  const plugin = module.default as RegistryToolPlugin;

  if (plugin.id !== toolId) {
    throw new Error(`Plugin ID mismatch: expected "${toolId}", got "${plugin.id}"`);
  }

  pluginCache.set(toolId, plugin);
  return plugin;
}

/** Load all plugins for a set of registry tool IDs */
export async function getPlugins(
  toolIds: string[]
): Promise<Map<string, { plugin: RegistryToolPlugin; manifest: RegistryToolManifest }>> {
  const result = new Map();
  await Promise.all(
    toolIds.map(async (id) => {
      const [plugin, manifest] = await Promise.all([
        getPlugin(id),
        fetchToolManifest(id),
      ]);
      result.set(id, { plugin, manifest });
    })
  );
  return result;
}

/** Force refresh — clear in-memory cache and re-fetch */
export function clearCache() {
  pluginCache.clear();
}

/** Check for available updates */
export async function checkForUpdates(
  installedTools: { id: string; version: string }[]
): Promise<{ id: string; installedVersion: string; latestVersion: string }[]> {
  const updates: { id: string; installedVersion: string; latestVersion: string }[] = [];
  await Promise.all(
    installedTools.map(async ({ id, version }) => {
      try {
        const manifest = await fetchToolManifest(id);
        if (manifest.version !== version) {
          updates.push({ id, installedVersion: version, latestVersion: manifest.version });
        }
      } catch { /* ignore fetch errors */ }
    })
  );
  return updates;
}
```

---

## Step 3: Add registryUrl to Settings

**File:** `apps/daemon/src/settings.ts`

Add `registryUrl` to the Settings interface default and save/load logic:

```typescript
const DEFAULT_SETTINGS: Settings = {
  // ... existing defaults ...
  registryUrl: "https://raw.githubusercontent.com/ashmilhussain/den-repo/main",
};
```

---

## Step 4: Remove External Tools from DenPaq Core

### 4a. catalog.ts

**File:** `apps/daemon/src/skills/catalog.ts`

Remove `github` and `web-search` from the hardcoded `SKILL_CATALOG`:

```typescript
// REMOVE these entries:
// { id: "github", name: "GitHub", ... }
// { id: "web-search", name: "Web Search", ... }

// KEEP only:
export const SKILL_CATALOG: SkillDefinition[] = [
  { id: "kanban", name: "Kanban Board", description: "...", icon: "Kanban", requiresConfig: false, configFields: [] },
  { id: "workspace-files", name: "Workspace Files", description: "...", icon: "FolderOpen", requiresConfig: false, configFields: [] },
  { id: "code-runner", name: "Code Runner", description: "...", icon: "Terminal", requiresConfig: false, configFields: [] },
  { id: "goals", name: "Goals", description: "...", icon: "Target", requiresConfig: false, configFields: [] },
];
```

Add a function to merge built-in + registry catalogs for the API:

```typescript
import { fetchIndex, fetchToolManifest } from "../registry/RegistryManager.js";

/** Returns full catalog: built-in skills + registry tools (converted to SkillDefinition shape) */
export async function getFullCatalog(): Promise<SkillDefinition[]> {
  const builtins = [...SKILL_CATALOG];

  try {
    const index = await fetchIndex();
    const registryTools = await Promise.all(
      index.tools.map(async (t) => {
        const manifest = await fetchToolManifest(t.id);
        return {
          id: manifest.id,
          name: manifest.name,
          description: manifest.description,
          icon: manifest.icon,
          requiresConfig: manifest.requiresConfig,
          configFields: manifest.configFields,
          source: "registry" as const,
        };
      })
    );
    return [...builtins, ...registryTools];
  } catch {
    // If registry is unreachable, return built-ins only
    return builtins;
  }
}
```

### 4b. toolDefs.ts

**File:** `apps/daemon/src/skills/toolDefs.ts`

Remove `GITHUB_TOOLS` and `WEB_SEARCH_TOOLS` arrays entirely.

Modify `toolsForSkills()` to accept registry manifests:

```typescript
import type { RegistryToolManifest } from "@denpaq/types";

export function toolsForSkills(
  skillIds: string[],
  registryManifests?: RegistryToolManifest[]
): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // Built-in tool routing (unchanged)
  for (const id of skillIds) {
    switch (id) {
      case "kanban":          tools.push(...KANBAN_TOOLS); break;
      case "workspace-files": tools.push(...FILE_TOOLS); break;
      case "code-runner":     tools.push(...RUNNER_TOOLS); break;
      case "goals":           tools.push(...PROJECT_TOOLS, ...GOAL_TOOLS); break;
      // REMOVED: case "github" and case "web-search"
    }
  }

  // Registry tool definitions
  if (registryManifests) {
    for (const manifest of registryManifests) {
      if (skillIds.includes(manifest.id)) {
        tools.push(...manifest.tools);
      }
    }
  }

  // Always include collaboration tools if agent has any skills
  if (skillIds.length > 0) {
    tools.push(TEAM_TOOL, REVIEW_TOOL);
  }

  return tools;
}
```

### 4c. executors.ts

**File:** `apps/daemon/src/skills/executors.ts`

Remove the `execGitHub()` and `execWebSearch()` functions entirely. Their code moves to registry `tools/github/executor.ts` and `tools/web-search/executor.ts`.

Change `APPROVAL_GATED_TOOLS` from a hardcoded Set to a function that merges:

```typescript
// BEFORE:
const APPROVAL_GATED_TOOLS = new Set([
  "github_create_issue",
  "github_create_pr",
  "github_merge_pr",
  "github_commit_file",
]);

// AFTER: Only built-in approval gates (if any)
const BUILTIN_APPROVAL_GATED = new Set<string>([
  // Currently empty — all approval-gated tools were github tools
  // Future built-in tools that need approval would go here
]);

/** Build merged approval gate set from built-in + registry manifests */
export function buildApprovalGates(
  registryManifests: RegistryToolManifest[]
): Set<string> {
  const gates = new Set(BUILTIN_APPROVAL_GATED);
  for (const manifest of registryManifests) {
    for (const tool of manifest.approvalGated ?? []) {
      gates.add(tool);
    }
  }
  return gates;
}

/** Updated checkApprovalGate — now takes the gate set as a parameter */
export function checkApprovalGate(
  toolName: string,
  input: Record<string, unknown>,
  agentId: string,
  approvalGated: Set<string>,
  taskId?: string
): string | null {
  if (!approvalGated.has(toolName)) return null;
  // ... same approval logic as before ...
}
```

---

## Step 5: Modify AgentRunner.ts — buildExecutor

**File:** `apps/daemon/src/agents/AgentRunner.ts`

This is the critical change. `buildExecutor()` currently has hardcoded `if (name.startsWith("github_"))` and `if (name.startsWith("web_"))` branches that must be replaced with dynamic registry plugin routing.

### Updated buildExecutor signature

```typescript
import { getPlugins } from "../registry/RegistryManager.js";
import { buildApprovalGates, checkApprovalGate } from "../skills/executors.js";
import type { RegistryToolPlugin, RegistryToolManifest, ToolContext } from "@denpaq/types";

function buildExecutor(
  agent: Agent,
  skillConfigMap: Record<string, Record<string, string>>,
  registryPlugins: Map<string, { plugin: RegistryToolPlugin; manifest: RegistryToolManifest }>,
  taskId?: string
): ToolExecutor {
  // Build merged approval gates
  const manifests = Array.from(registryPlugins.values()).map((r) => r.manifest);
  const approvalGated = buildApprovalGates(manifests);

  return async (name: string, input: Record<string, unknown>): Promise<string> => {
    // Check approval gate (built-in + registry)
    const gated = checkApprovalGate(name, input, agent.id, approvalGated, taskId);
    if (gated) return gated;

    // ── Built-in tool routing (unchanged) ──
    if (name.startsWith("kanban_"))  return execKanban(name, input, agent.id);
    if (name.startsWith("file_"))    return execFiles(name, input, agent.id);
    if (name.startsWith("goal_") || name.startsWith("project_"))
      return execGoals(name, input, agent.id);
    if (name === "run_script" || name === "start_webapp" || name === "list_running_apps" || name === "stop_app")
      return execRunner(name, input, agent.id);
    if (name === "delegate_task")    return handleDelegation(input, agent);
    if (name === "team_ask")         return handleTeamAsk(input, agent);
    if (name === "request_review")   return handleReviewRequest(input, agent);

    // REMOVED: if (name.startsWith("github_")) return execGitHub(name, input, token);
    // REMOVED: if (name.startsWith("web_"))    return execWebSearch(name, input);

    // ── Registry plugin routing (NEW) ──
    for (const [toolId, { plugin, manifest }] of registryPlugins) {
      const matchesTool = manifest.tools.some((t) => t.name === name);
      if (matchesTool) {
        const config = skillConfigMap[toolId] ?? {};
        const context: ToolContext = {
          config,
          agentId: agent.id,
          agentName: agent.name,
        };
        return plugin.execute(name, input, context);
      }
    }

    return `Unknown tool: ${name}`;
  };
}
```

### Update callers of buildExecutor

Every place that calls `buildExecutor()` must now load registry plugins first. There are 3 callers:

1. **`executeTask()`** — main task execution
2. **`personalChat()`** — direct chat with agent
3. **`respondToTeamMention()`** — when another agent @mentions

For each, add this before calling `buildExecutor`:

```typescript
// Determine which skills are registry-sourced
const agentSkills = await SkillsRepository.findByAgent(agent.id);
const builtinIds = new Set(["kanban", "workspace-files", "code-runner", "goals"]);
const registryToolIds = agentSkills
  .filter((s) => !builtinIds.has(s.skillId))
  .map((s) => s.skillId);

// Load registry plugins + manifests
const registryPlugins = await getPlugins(registryToolIds);

// Build skill config map (unchanged pattern)
const skillConfigMap: Record<string, Record<string, string>> = {};
for (const s of agentSkills) {
  skillConfigMap[s.skillId] = s.config;
}

// Pass to buildExecutor
const executor = buildExecutor(agent, skillConfigMap, registryPlugins, taskId);
```

Also update the `toolsForSkills` call to pass registry manifests:

```typescript
const registryManifests = Array.from(registryPlugins.values()).map((r) => r.manifest);
const tools = toolsForSkills(
  agentSkills.map((s) => s.skillId),
  registryManifests
);
```

---

## Step 6: New API Endpoints

**File:** `apps/daemon/src/api/skills.ts`

Add registry browsing/management endpoints:

```typescript
import * as RegistryManager from "../registry/RegistryManager.js";

// GET /registry/index — browse the full registry
fastify.get("/registry/index", async () => {
  return RegistryManager.fetchIndex();
});

// GET /registry/tools/:id — get a tool's manifest
fastify.get("/registry/tools/:id", async (req) => {
  const { id } = req.params as { id: string };
  return RegistryManager.fetchToolManifest(id);
});

// GET /registry/skills/:id — get a skill's manifest + instructions
fastify.get("/registry/skills/:id", async (req) => {
  const { id } = req.params as { id: string };
  return RegistryManager.fetchSkill(id);
});

// GET /registry/profiles/:id — get a profile's full data
fastify.get("/registry/profiles/:id", async (req) => {
  const { id } = req.params as { id: string };
  return RegistryManager.fetchProfile(id);
});

// POST /registry/refresh — force refresh cache
fastify.post("/registry/refresh", async () => {
  RegistryManager.clearCache();
  return { ok: true };
});

// Update existing catalog endpoint to merge built-in + registry
fastify.get("/skills/catalog", async () => {
  return getFullCatalog();  // From updated catalog.ts
});
```

---

## Step 7: Database Migration

**New file:** `apps/daemon/src/db/migrations/033_registry_tools.ts`

Add a `source` column to track where agent skills came from:

```typescript
import type { Database } from "better-sqlite3";

export function up(db: Database) {
  // Add source column to agent_skills (default "builtin" for existing rows)
  db.exec(`
    ALTER TABLE agent_skills ADD COLUMN source TEXT NOT NULL DEFAULT 'builtin';
  `);

  // Add registry_version column to track installed version for update detection
  db.exec(`
    ALTER TABLE agent_skills ADD COLUMN registry_version TEXT;
  `);
}

export function down(db: Database) {
  // SQLite doesn't support DROP COLUMN easily, so recreate
  db.exec(`
    CREATE TABLE agent_skills_backup AS SELECT
      agent_id, skill_id, config, installed_at
    FROM agent_skills;
    DROP TABLE agent_skills;
    ALTER TABLE agent_skills_backup RENAME TO agent_skills;
  `);
}
```

---

## Step 8: Frontend Changes

### 8a. API Client

**File:** `apps/web/src/lib/api.ts`

```typescript
export const registryApi = {
  getIndex: () => fetchApi<RegistryIndex>("/registry/index"),
  getToolManifest: (id: string) => fetchApi<RegistryToolManifest>(`/registry/tools/${id}`),
  getSkill: (id: string) => fetchApi<{ manifest: RegistrySkillManifest; instructions: string }>(`/registry/skills/${id}`),
  getProfile: (id: string) => fetchApi<{ manifest: RegistryProfileManifest; agentMd: string }>(`/registry/profiles/${id}`),
  refresh: () => fetchApi("/registry/refresh", { method: "POST" }),
};
```

### 8b. Updated useSkills Hook

**File:** `apps/web/src/hooks/useSkills.ts`

The `useSkills` hook should now return the merged catalog (built-in + registry):

```typescript
export function useSkillCatalog() {
  return useQuery({
    queryKey: ["skill-catalog"],
    queryFn: () => skillsApi.getCatalog(),  // Already returns merged catalog from Step 6
    staleTime: 5 * 60 * 1000,
  });
}
```

### 8c. Library UI

Add a new "Browse Registry" section to the Library/Skill installation UI that shows:

- **Tools tab:** Registry tools (github, web-search, future tools) with install/config buttons
- **Skills tab:** Registry skills with install buttons
- **Profiles tab:** Registry profiles with "Hire" buttons

Each registry item shows: name, description, version, author, tags, and an "Install" / "Update Available" badge.

---

## Step 9: Update Template Manager

**File:** `apps/daemon/src/workspace/templateManager.ts`

Update seed templates to reference registry tools via `registryTools` instead of `builtinSkills`:

```typescript
// In SEED_TEMPLATES, change profiles that use github/web-search:

// BEFORE (in agent.md frontmatter):
// builtinSkills:
//   - kanban
//   - workspace-files
//   - github
//   - web-search

// AFTER:
// builtinSkills:
//   - kanban
//   - workspace-files
// registryTools:
//   - github
//   - web-search
```

When hiring from a template, the `registryTools` array triggers auto-installation of those registry tools:

```typescript
// In the hire-from-template handler:
for (const toolId of template.registryTools ?? []) {
  await SkillsRepository.install(agentId, toolId, {}, "registry");
}
```

---

## Migration Sequence (Recommended Order)

```
1. packages/types         — Add new types (no breaking changes if additive)
2. settings.ts            — Add registryUrl default
3. RegistryManager        — New service (no existing code depends on it yet)
4. DB migration           — Add source + registry_version columns
5. executors.ts           — Remove execGitHub, execWebSearch; dynamic approval gates
6. catalog.ts             — Remove github/web-search from SKILL_CATALOG; add getFullCatalog()
7. toolDefs.ts            — Remove GITHUB_TOOLS, WEB_SEARCH_TOOLS; update toolsForSkills()
8. AgentRunner.ts         — Modify buildExecutor() for registry plugin routing
9. api/skills.ts          — Add registry endpoints
10. api/templates.ts      — Support registryTools in templates
11. Frontend              — API client + Library UI updates
```

> **Steps 5-8 should be done together** — they are interdependent. Removing the executor functions without updating AgentRunner will break tool execution.

---

## Testing Checklist

- [ ] Built-in tools (kanban, files, goals, code-runner) still work unchanged
- [ ] Registry index fetches successfully from raw GitHub URL
- [ ] Tool manifests load and cache correctly at `~/.denpaq/registry-cache/`
- [ ] `executor.mjs` loads via dynamic `import()` and returns a valid `RegistryToolPlugin`
- [ ] GitHub tool executes correctly (list repos, create issue with approval gate)
- [ ] Web search tool executes correctly
- [ ] Approval gates work for registry tools (human approval prompt shown)
- [ ] Tool config (e.g. github_token) passed correctly via `ToolContext`
- [ ] Skills install from registry and instructions appear in agent system prompt
- [ ] Profiles hire from registry with correct builtinSkills + registryTools + bundledSkills
- [ ] Library UI shows merged catalog (built-in + registry)
- [ ] "Update available" badge appears when registry has newer version
- [ ] Graceful fallback when registry is unreachable (built-in tools still work)
- [ ] Cache TTL works (doesn't re-fetch on every request)
