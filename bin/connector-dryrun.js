#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buildReceipt, renderJson, renderMarkdown } from '../src/index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const args = process.argv.slice(2);

function usage() {
  return `Usage: connector-dryrun <plan.json> [--format markdown|json]

Creates a local dry-run receipt for proposed connector actions.`;
}

if (args.length === 1 && args[0] === '--help') {
  console.log(usage());
  process.exit(0);
}

if (args.length === 1 && args[0] === '--version') {
  console.log(pkg.version);
  process.exit(0);
}

function usageError(message) {
  console.error(`${message}\n\n${usage()}`);
  process.exit(1);
}

if (args.length === 0) {
  usageError('A plan path is required.');
}

if (args[0].startsWith('-')) {
  usageError(`Unknown option: ${args[0]}`);
}

const planPath = args[0];
let format = 'markdown';

if (args.length > 1) {
  if (args[1] !== '--format') {
    usageError(args[1].startsWith('-') ? `Unknown option: ${args[1]}` : `Unexpected argument: ${args[1]}`);
  }
  if (args.length === 2) {
    usageError('Option --format requires a value.');
  }
  if (args.length > 3) {
    usageError(args[3].startsWith('-') ? `Unknown or duplicate option: ${args[3]}` : `Unexpected argument: ${args[3]}`);
  }
  format = args[2];
}

if (!['markdown', 'json'].includes(format)) {
  usageError('Unsupported format. Use markdown or json.');
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
