import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const output = execFileSync("npm", ["pack", "--json"], {
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

const directory = mkdtempSync(join(tmpdir(), "connector-dryrun-package-"));
const packagePath = join(process.cwd(), pack.filename);

try {
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", directory, packagePath], {
    stdio: "pipe"
  });

  const binDirectory = join(directory, "node_modules", ".bin");
  const env = { ...process.env, PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ""}` };
  const runInstalledBin = (args) => execFileSync("connector-dryrun", args, {
    encoding: "utf8",
    env
  });

  const help = runInstalledBin(["--help"]);
  if (!help.includes("Usage: connector-dryrun")) {
    throw new Error("installed CLI help did not include its usage line");
  }

  const expectedVersion = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  const version = runInstalledBin(["--version"]).trim();
  if (version !== expectedVersion) {
    throw new Error(`installed CLI reported version ${version}; expected ${expectedVersion}`);
  }

  const fixture = fileURLToPath(new URL("../fixtures/sample-plan.json", import.meta.url));
  const receipt = JSON.parse(runInstalledBin([fixture, "--format", "json"]));
  if (receipt.name !== "CRM follow-up sync") {
    throw new Error("installed CLI did not render the fixture receipt");
  }

  console.log(`package smoke ok: ${pack.filename} includes ${pack.files.length} files and its installed bin renders fixtures`);
} finally {
  rmSync(directory, { recursive: true, force: true });
  rmSync(packagePath, { force: true });
}
