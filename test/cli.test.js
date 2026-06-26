import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/connector-dryrun.js', import.meta.url));
const validPlan = fileURLToPath(new URL('../fixtures/sample-plan.json', import.meta.url));
const invalidPlan = fileURLToPath(new URL('../fixtures/invalid-plan.json', import.meta.url));

async function runCli(args) {
  try {
    const result = await execFileAsync(process.execPath, [cli, ...args]);
    return { code: 0, ...result };
  } catch (error) {
    return {
      code: error.code,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

test('prints help without treating it as an error', async () => {
  const result = await runCli(['--help']);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Usage: connector-dryrun/);
  assert.equal(result.stderr, '');
});

test('renders json receipts from the fixture plan', async () => {
  const result = await runCli([validPlan, '--format', 'json']);

  assert.equal(result.code, 0);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.name, 'CRM follow-up sync');
  assert.equal(receipt.approvalRequired, true);
  assert.equal(receipt.highestRisk, 'high');
});

test('returns validation exit code when a receipt has errors', async () => {
  const result = await runCli([invalidPlan, '--format', 'markdown']);

  assert.equal(result.code, 2);
  assert.match(result.stdout, /missing-connector is missing connector/);
  assert.equal(result.stderr, '');
});

test('rejects unsupported output formats before reading the plan', async () => {
  const result = await runCli([validPlan, '--format', 'html']);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Unsupported format/);
});
