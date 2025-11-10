#!/usr/bin/env node
// Simple helper that moves a list of dependencies from the repo root into a specific workspace.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const options = new Map();

for (const arg of args) {
  const [key, value = ""] = arg.split("=");
  if (key.startsWith("--")) {
    options.set(key.slice(2), value);
  }
}

const listPath = resolve(process.cwd(), options.get("file") ?? "to-move.txt");
const target = options.get("target");

if (!target) {
  console.error("Missing required option --target=<workspace>");
  process.exit(1);
}

const content = readFileSync(listPath, "utf8");
const deps = content
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (deps.length === 0) {
  console.error(`No dependencies found in ${listPath}`);
  process.exit(1);
}

for (const dep of deps) {
  const removeCmd = `pnpm remove ${dep}`;
  const addCmd = `pnpm --filter ${target} add ${dep}`;

  console.log(`\n>> Removing ${dep} from root`);
  execSync(removeCmd, { stdio: "inherit" });

  console.log(`\n>> Adding ${dep} to ${target}`);
  execSync(addCmd, { stdio: "inherit" });
}

console.log("\nAll done. Review the diff before committing.");
