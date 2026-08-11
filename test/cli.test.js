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

test('returns validation exit code for missing, blank, and malformed write rollback values', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'connector-dryrun-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  for (const [filename, rollback] of [
    ['missing.json', undefined],
    ['blank.json', '   '],
    ['malformed.json', []]
  ]) {
    const action = { id: 'write', connector: 'crm', verb: 'delete', target: 'contact:1', risk: 'low' };
    if (rollback !== undefined) action.rollback = rollback;
    const planPath = join(directory, filename);
    await writeFile(planPath, JSON.stringify({ name: 'rollback check', owner: 'tester', actions: [action] }));

    const result = await runCli([planPath, '--format', 'json']);

    assert.equal(result.code, 2, filename);
    assert.equal(result.stderr, '', filename);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.actions[0].rollback, null);
    assert.ok(receipt.errors.includes('write rollback must be a non-blank string for write-like actions.'));
  }
});

test('rejects unsupported output formats before reading the plan', async () => {
  const result = await runCli([validPlan, '--format', 'html']);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Unsupported format/);
});

test('accepts a plan path without an explicit format', async () => {
  const result = await runCli([validPlan]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /^# Dry-Run Receipt/m);
  assert.equal(result.stderr, '');
});

test('rejects invalid argument forms as usage errors before reading a plan', async () => {
  const missingPlan = '/definitely/missing/plan.json';
  const cases = [
    { args: [], message: /plan path is required/i },
    { args: ['--bogus'], message: /Unknown option: --bogus/ },
    { args: [missingPlan, '--bogus'], message: /Unknown option: --bogus/ },
    { args: [missingPlan, 'extra.json'], message: /Unexpected argument: extra\.json/ },
    { args: [missingPlan, '--format'], message: /requires a value/ },
    { args: [missingPlan, '--format', 'json', 'extra.json'], message: /Unexpected argument: extra\.json/ },
    { args: [missingPlan, '--format', 'json', '--format', 'markdown'], message: /Unknown or duplicate option: --format/ },
    { args: [missingPlan, '--format', 'json', '--help'], message: /Unknown or duplicate option: --help/ },
    { args: ['--help', missingPlan], message: /Unknown option: --help/ },
    { args: ['--version', missingPlan], message: /Unknown option: --version/ }
  ];

  for (const { args, message } of cases) {
    const result = await runCli(args);
    assert.equal(result.code, 1, args.join(' '));
    assert.equal(result.stdout, '', args.join(' '));
    assert.match(result.stderr, message, args.join(' '));
    assert.match(result.stderr, /Usage: connector-dryrun/, args.join(' '));
    assert.doesNotMatch(result.stderr, /ENOENT/, args.join(' '));
  }
});

test('renders normalized policy fields through the CLI', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'connector-dryrun-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const planPath = join(directory, 'normalized.json');
  await writeFile(planPath, JSON.stringify({
    name: 'normalized',
    owner: 'tester',
    actions: [{
      connector: 'crm',
      verb: ' UPDATE ',
      target: 'contact:1',
      risk: ' LOW ',
      rollback: 'Restore the previous contact snapshot.'
    }]
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

test('reports unsupported verbs in JSON and Markdown with validation exit status', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'connector-dryrun-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const planPath = join(directory, 'unsupported-verb.json');
  await writeFile(planPath, JSON.stringify({
    name: 'unsupported verb',
    owner: 'tester',
    actions: [{ id: 'typo', connector: 'crm', verb: ' UDPATE ', target: 'contact:1', risk: 'low' }]
  }));

  const jsonResult = await runCli([planPath, '--format', 'json']);
  assert.equal(jsonResult.code, 2);
  assert.equal(jsonResult.stderr, '');
  const receipt = JSON.parse(jsonResult.stdout);
  assert.equal(receipt.actions[0].verb, 'udpate');
  assert.equal(receipt.actions[0].approvalRequired, true);
  assert.equal(receipt.actions[0].rollback, 'Manual review required before live execution.');
  assert.equal(receipt.approvalRequired, true);
  assert.deepEqual(receipt.errors, ['typo has unsupported verb: udpate.']);

  const markdownResult = await runCli([planPath, '--format', 'markdown']);
  assert.equal(markdownResult.code, 2);
  assert.equal(markdownResult.stderr, '');
  assert.match(markdownResult.stdout, /Verb: udpate/);
  assert.match(markdownResult.stdout, /Approval required: yes/);
  assert.match(markdownResult.stdout, /Rollback: Manual review required before live execution\./);
  assert.match(markdownResult.stdout, /typo has unsupported verb: udpate\./);
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

test('renders conservative summaries for plans without actions in both formats', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'connector-dryrun-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  for (const [filename, value] of [
    ['missing.json', { name: 'missing', owner: 'tester' }],
    ['malformed.json', { name: 'malformed', owner: 'tester', actions: null }],
    ['empty.json', { name: 'empty', owner: 'tester', actions: [] }]
  ]) {
    const planPath = join(directory, filename);
    await writeFile(planPath, JSON.stringify(value));

    const jsonResult = await runCli([planPath, '--format', 'json']);
    assert.equal(jsonResult.code, 2, filename);
    assert.equal(jsonResult.stderr, '', filename);
    const receipt = JSON.parse(jsonResult.stdout);
    assert.equal(receipt.highestRisk, 'high', filename);
    assert.equal(receipt.approvalRequired, true, filename);

    const markdownResult = await runCli([planPath, '--format', 'markdown']);
    assert.equal(markdownResult.code, 2, filename);
    assert.equal(markdownResult.stderr, '', filename);
    assert.match(markdownResult.stdout, /Highest risk: high/, filename);
    assert.match(markdownResult.stdout, /Approval required: yes/, filename);
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
