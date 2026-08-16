import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceipt, renderJson, renderMarkdown } from '../src/index.js';

test('builds a receipt and detects approval needs', () => {
  const receipt = buildReceipt({
    name: 'demo',
    owner: 'tester',
    actions: [
      { id: 'one', connector: 'crm', verb: 'create', target: 'contact:1', risk: 'medium' }
    ]
  });

  assert.equal(receipt.approvalRequired, true);
  assert.equal(receipt.highestRisk, 'medium');
  assert.equal(receipt.warnings.length, 1);
});

test('normalizes supported verb and risk tokens before policy decisions', () => {
  for (const verb of ['update', 'UPDATE', ' update ']) {
    const receipt = buildReceipt({
      name: 'demo',
      owner: 'tester',
      actions: [{ connector: 'crm', verb, target: 'contact:1', risk: ' LOW ' }]
    });

    assert.equal(receipt.actions[0].verb, 'update');
    assert.equal(receipt.actions[0].risk, 'low');
    assert.equal(receipt.actions[0].approvalRequired, true);
    assert.equal(receipt.approvalRequired, true);
    assert.equal(receipt.highestRisk, 'low');
  }
});

test('reports unsupported verb tokens and fails closed', () => {
  for (const verb of ['udpate', ' UDPATE ', 'publish']) {
    const receipt = buildReceipt({
      name: 'demo',
      owner: 'tester',
      actions: [{ id: 'unknown', connector: 'crm', verb, target: 'contact:1', risk: 'low' }]
    });

    assert.equal(receipt.actions[0].verb, verb.trim().toLowerCase());
    assert.equal(receipt.actions[0].approvalRequired, true);
    assert.equal(receipt.actions[0].rollback, 'Manual review required before live execution.');
    assert.equal(receipt.approvalRequired, true);
    assert.equal(receipt.highestRisk, 'low');
    assert.deepEqual(receipt.errors, [`unknown has unsupported verb: ${verb.trim().toLowerCase()}.`]);
  }
});

test('treats unknown risk tokens conservatively', () => {
  const receipt = buildReceipt({
    name: 'demo',
    owner: 'tester',
    actions: [{ connector: 'crm', verb: 'read', target: 'contact:1', risk: 'urgent' }]
  });

  assert.equal(receipt.actions[0].risk, 'high');
  assert.equal(receipt.approvalRequired, true);
  assert.equal(receipt.highestRisk, 'high');
});

test('preserves boolean requiresApproval values', () => {
  for (const requiresApproval of [true, false]) {
    const receipt = buildReceipt({
      name: 'demo',
      owner: 'tester',
      actions: [{ id: 'read', connector: 'crm', verb: 'read', target: 'contact:1', risk: 'low', requiresApproval }]
    });

    assert.equal(receipt.actions[0].approvalRequired, requiresApproval);
    assert.equal(receipt.approvalRequired, requiresApproval);
    assert.deepEqual(receipt.errors, []);
  }
});

test('rejects malformed requiresApproval values and fails closed', () => {
  for (const requiresApproval of ['true', 1, null, {}, []]) {
    const receipt = buildReceipt({
      name: 'demo',
      owner: 'tester',
      actions: [{ id: 'read', connector: 'crm', verb: 'read', target: 'contact:1', risk: 'low', requiresApproval }]
    });

    assert.equal(receipt.actions[0].approvalRequired, true);
    assert.equal(receipt.approvalRequired, true);
    assert.deepEqual(receipt.errors, ['read requiresApproval must be a boolean when provided.']);
    assert.equal(JSON.parse(renderJson(receipt)).actions[0].approvalRequired, true);
    assert.match(renderMarkdown(receipt), /Approval required: yes/);
    assert.match(renderMarkdown(receipt), /read requiresApproval must be a boolean when provided\./);
  }
});

test('requires supplied non-blank rollback evidence for write-like actions', () => {
  for (const [rollback, expectedError] of [
    [undefined, 'write rollback must be a non-blank string for write-like actions.'],
    ['', 'write rollback must be a non-blank string for write-like actions.'],
    ['   ', 'write rollback must be a non-blank string for write-like actions.'],
    [[], 'write rollback must be a non-blank string for write-like actions.']
  ]) {
    const action = { id: 'write', connector: 'crm', verb: 'update', target: 'contact:1', risk: 'low' };
    if (rollback !== undefined) action.rollback = rollback;

    const receipt = buildReceipt({ name: 'demo', owner: 'tester', actions: [action] });

    assert.ok(receipt.errors.includes(expectedError));
    assert.equal(receipt.actions[0].rollback, null);
    assert.match(renderMarkdown(receipt), /Rollback: not supplied/);
  }
});

test('keeps conservative rollback guidance optional for read-only actions', () => {
  const receipt = buildReceipt({
    name: 'demo',
    owner: 'tester',
    actions: [{ id: 'read', connector: 'crm', verb: 'read', target: 'contact:1', risk: 'low' }]
  });

  assert.equal(receipt.actions[0].rollback, 'Manual review required before live execution.');
  assert.equal(receipt.errors.length, 0);
});

test('returns deterministic errors for malformed plans and actions', () => {
  for (const plan of [null, [], 'plan']) {
    const receipt = buildReceipt(plan);
    assert.ok(receipt.errors.includes('Plan must be a JSON object.'));
    assert.deepEqual(receipt.actions, []);
  }

  const missingActions = buildReceipt({ name: 'bad', owner: 'tester' });
  assert.ok(missingActions.errors.includes('Plan actions must be an array.'));

  const malformedAction = buildReceipt({ name: 'bad', owner: 'tester', actions: [null] });
  assert.ok(malformedAction.errors.includes('Action 1 must be a JSON object.'));
  assert.equal(malformedAction.actions[0].risk, 'high');
  assert.equal(malformedAction.actions[0].approvalRequired, true);
});

test('reports missing connector fields as errors', () => {
  const receipt = buildReceipt({ name: 'bad', owner: 'tester', actions: [{ id: 'bad' }] });
  assert.ok(receipt.errors.includes('bad connector must be a non-blank string.'));
  assert.equal(receipt.highestRisk, 'high');
});

test('validates and safely normalizes malformed scalar fields', () => {
  const receipt = buildReceipt({
    name: { bad: true },
    owner: 42,
    summary: ['context'],
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
  });

  assert.deepEqual(receipt.errors, [
    'Plan name must be a non-blank string.',
    'Plan owner must be a non-blank string.',
    'Plan summary must be a string when provided.',
    'Action 1 id must be a string when provided.',
    'action-1 connector must be a non-blank string.',
    'action-1 target must be a non-blank string.',
    'action-1 approver must be a string when provided.',
    'action-1 rollback must be a string when provided.',
    'action-1 notes must be a string when provided.'
  ]);
  assert.equal(receipt.name, 'Unnamed connector plan');
  assert.equal(receipt.owner, 'unknown');
  assert.equal(receipt.actions[0].id, 'action-1');
  assert.equal(receipt.actions[0].connector, 'unknown');
  assert.equal(receipt.actions[0].target, 'unknown');

  const markdown = renderMarkdown(receipt);
  assert.doesNotMatch(markdown, /\[object Object\]/);
  assert.doesNotMatch(markdown, /^###\s*$/m);
});

test('rejects blank required strings with stable fallbacks', () => {
  const receipt = buildReceipt({
    name: ' ',
    owner: '\t',
    actions: [{ id: ' ', connector: ' ', verb: ' ', target: '\n', risk: 'low' }]
  });

  assert.ok(receipt.errors.includes('Plan name must be a non-blank string.'));
  assert.ok(receipt.errors.includes('Plan owner must be a non-blank string.'));
  assert.ok(receipt.errors.includes('action-1 connector must be a non-blank string.'));
  assert.ok(receipt.errors.includes('action-1 is missing verb.'));
  assert.ok(receipt.errors.includes('action-1 target must be a non-blank string.'));
  assert.equal(receipt.actions[0].id, 'action-1');
});

test('renders markdown receipt', () => {
  const receipt = buildReceipt({
    name: 'demo',
    owner: 'tester',
    actions: [{ id: 'safe', connector: 'slack', verb: 'read', target: 'channel:ops', risk: 'low' }]
  });

  assert.match(renderMarkdown(receipt), /Dry-Run Receipt: demo/);
  assert.match(renderMarkdown(receipt), /Connector: slack/);
});

test('summarizes plans without a usable actions collection conservatively', () => {
  for (const plan of [
    { name: 'missing', owner: 'tester' },
    { name: 'malformed', owner: 'tester', actions: null },
    { name: 'empty', owner: 'tester', actions: [] }
  ]) {
    const receipt = buildReceipt(plan);

    assert.equal(receipt.actions.length, 0);
    assert.equal(receipt.highestRisk, 'high');
    assert.equal(receipt.approvalRequired, true);
    assert.ok(receipt.errors.includes('Plan must include at least one action.'));

    const parsed = JSON.parse(renderJson(receipt));
    assert.equal(parsed.highestRisk, 'high');
    assert.equal(parsed.approvalRequired, true);

    const markdown = renderMarkdown(receipt);
    assert.match(markdown, /Highest risk: high/);
    assert.match(markdown, /Approval required: yes/);
  }
});

test('renders deterministic json receipts', () => {
  const receipt = buildReceipt({
    name: 'demo',
    owner: 'tester',
    actions: [{ id: 'safe', connector: 'slack', verb: 'read', target: 'channel:ops', risk: 'low' }]
  });

  const parsed = JSON.parse(renderJson(receipt));
  assert.equal(parsed.generatedAt, '1970-01-01T00:00:00.000Z');
  assert.equal(parsed.approvalRequired, false);
});
