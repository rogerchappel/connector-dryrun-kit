#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buildReceipt, renderJson, renderMarkdown } from '../src/index.js';
import pkg from '../package.json' with { type: 'json' };

const args = process.argv.slice(2);

function usage() {
  return `Usage: connector-dryrun <plan.json> [--format markdown|json]

Creates a local dry-run receipt for proposed connector actions.`;
}

if (args.includes('--help') || args.length === 0) {
  console.log(usage());
  process.exit(args.length === 0 ? 1 : 0);
}

if (args.includes('--version')) {
  console.log(pkg.version);
  process.exit(0);
}

const planPath = args[0];
const formatIndex = args.indexOf('--format');
const format = formatIndex === -1 ? 'markdown' : args[formatIndex + 1];

if (!['markdown', 'json'].includes(format)) {
  console.error('Unsupported format. Use markdown or json.');
  process.exit(1);
}

try {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const receipt = buildReceipt(plan);
  console.log(format === 'json' ? renderJson(receipt) : renderMarkdown(receipt));
  process.exit(receipt.errors.length > 0 ? 2 : 0);
} catch (error) {
  console.error(`connector-dryrun failed: ${error.message}`);
  process.exit(1);
}
