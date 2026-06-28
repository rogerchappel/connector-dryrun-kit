import { execFileSync } from "node:child_process";

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8"
});
const [pack] = JSON.parse(output);
const files = new Set(pack.files.map((file) => file.path));

const required = [
  "bin/connector-dryrun.js",
  "src/index.js",
  "docs/CLI.md",
  "docs/PLAN_SCHEMA.md",
  "examples/approval-needed.json",
  "fixtures/sample-plan.json",
  "fixtures/invalid-plan.json",
  "SKILL.md",
  "README.md",
  "LICENSE",
  "SECURITY.md"
];

const missing = required.filter((file) => !files.has(file));
if (missing.length > 0) {
  console.error(`Package smoke failed; missing files:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log(`package smoke ok: ${pack.filename} includes ${pack.files.length} files`);
