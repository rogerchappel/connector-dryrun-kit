import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('prints the package version', async () => {
  const result = await runCli(['--version']);

  assert.equal(result.code, 0);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
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
  assert.match(result.stdout, /missing-connector connector must be a non-blank string/);
  assert.equal(result.stderr, '');
});

test('rejects unsupported output formats before reading the plan', async () => {
  const result = await runCli([validPlan, '--format', 'html']);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Unsupported format/);
});

test('renders normalized policy fields through the CLI', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'connector-dryrun-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const planPath = join(directory, 'normalized.json');
  await writeFile(planPath, JSON.stringify({
    name: 'normalized',
    owner: 'tester',
    actions: [{ connector: 'crm', verb: ' UPDATE ', target: 'contact:1', risk: ' LOW ' }]
  }));

  const result = await runCli([planPath, '--format', 'json']);

  assert.equal(result.code, 0);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.actions[0].verb, 'update');
  assert.equal(receipt.actions[0].risk, 'low');
  assert.equal(receipt.actions[0].approvalRequired, true);
  assert.equal(receipt.approvalRequired, true);
  assert.equal(receipt.highestRisk, 'low');
});

test('returns validation receipts for null plans and malformed actions', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'connector-dryrun-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  for (const [filename, value, expectedError] of [
    ['null.json', null, 'Plan must be a JSON object.'],
    ['actions.json', { name: 'bad', owner: 'tester', actions: null }, 'Plan actions must be an array.'],
    ['entry.json', { name: 'bad', owner: 'tester', actions: [null] }, 'Action 1 must be a JSON object.']
  ]) {
    const planPath = join(directory, filename);
    await writeFile(planPath, JSON.stringify(value));
    const result = await runCli([planPath, '--format', 'json']);

    assert.equal(result.code, 2);
    assert.equal(result.stderr, '');
    const receipt = JSON.parse(result.stdout);
    assert.ok(receipt.errors.includes(expectedError));
  }
});

test('returns validation exit code for malformed scalar fields', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'connector-dryrun-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const planPath = join(directory, 'malformed-scalars.json');
  await writeFile(planPath, JSON.stringify({
    name: {},
    owner: 42,
    summary: [],
    actions: [{
      id: [],
      connector: {},
      verb: 'read',
      target: 7,
      risk: 'low',
      approver: {},
      rollback: [],
      notes: {}
    }]
  }));

  const result = await runCli([planPath, '--format', 'markdown']);

  assert.equal(result.code, 2);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Plan summary must be a string when provided/);
  assert.doesNotMatch(result.stdout, /\[object Object\]/);
  assert.doesNotMatch(result.stdout, /^###\s*$/m);
});
