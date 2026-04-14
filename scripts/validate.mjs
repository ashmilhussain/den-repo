import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

let errors = 0;

function check(condition, msg) {
  if (!condition) {
    console.error(`  ERROR: ${msg}`);
    errors++;
  }
}

// ── Validate registry.json ──────────────────────────────────────────────────

console.log("Validating registry.json...");
const registry = JSON.parse(readFileSync("./registry.json", "utf-8"));
check(registry.version, "registry.json must have a version");
check(Array.isArray(registry.tools), "registry.json must have tools array");
check(Array.isArray(registry.skills), "registry.json must have skills array");
check(Array.isArray(registry.profiles), "registry.json must have profiles array");

// ── Validate tools ──────────────────────────────────────────────────────────

console.log("Validating tools...");
for (const tool of registry.tools) {
  console.log(`  Tool: ${tool.id}`);
  const manifestPath = join(tool.path, "manifest.json");
  check(existsSync(manifestPath), `${manifestPath} not found`);

  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    check(manifest.id === tool.id, `manifest.id "${manifest.id}" !== registry id "${tool.id}"`);
    check(manifest.name, "manifest must have name");
    check(manifest.version, "manifest must have version");
    check(Array.isArray(manifest.tools), "manifest must have tools array");
    check(manifest.executorFile, "manifest must have executorFile");

    const executorPath = join(tool.path, manifest.executorFile);
    check(existsSync(executorPath), `executor file ${executorPath} not found (run npm run build)`);

    for (const t of manifest.tools) {
      check(t.name, `tool definition must have name`);
      check(t.description, `tool ${t.name} must have description`);
      check(t.parameters?.type === "object", `tool ${t.name} must have parameters.type = "object"`);
    }
  }
}

// ── Validate skills ─────────────────────────────────────────────────────────

console.log("Validating skills...");
for (const skill of registry.skills) {
  console.log(`  Skill: ${skill.id}`);
  const manifestPath = join(skill.path, "manifest.json");
  check(existsSync(manifestPath), `${manifestPath} not found`);

  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    check(manifest.id === skill.id, `manifest.id !== registry id`);
    check(manifest.instructionsFile, "manifest must have instructionsFile");

    const instrPath = join(skill.path, manifest.instructionsFile);
    check(existsSync(instrPath), `${instrPath} not found`);
  }
}

// ── Validate profiles ───────────────────────────────────────────────────────

console.log("Validating profiles...");
for (const profile of registry.profiles) {
  console.log(`  Profile: ${profile.id}`);
  const manifestPath = join(profile.path, "manifest.json");
  check(existsSync(manifestPath), `${manifestPath} not found`);

  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    check(manifest.id === profile.id, `manifest.id !== registry id`);
    check(manifest.agentFile, "manifest must have agentFile");

    const agentPath = join(profile.path, manifest.agentFile);
    check(existsSync(agentPath), `${agentPath} not found`);

    for (const skill of manifest.bundledSkills ?? []) {
      const skillPath = join(profile.path, skill.path);
      check(existsSync(skillPath), `bundled skill ${skillPath} not found`);
    }
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log("");
if (errors > 0) {
  console.error(`Validation FAILED with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log("Validation passed.");
}
