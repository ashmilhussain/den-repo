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
    minify: false,
    sourcemap: false,
  });

  console.log(`Built: ${toolId}/dist/executor.mjs`);
}

console.log("Done.");
