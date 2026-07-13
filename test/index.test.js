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

test('reports missing connector fields as errors', () => {
  const receipt = buildReceipt({ name: 'bad', owner: 'tester', actions: [{ id: 'bad' }] });
  assert.ok(receipt.errors.some((error) => error.includes('missing connector')));
  assert.equal(receipt.highestRisk, 'high');
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

test('rejects plans with no actions', () => {
  const receipt = buildReceipt({ name: 'empty', owner: 'tester', actions: [] });

  assert.equal(receipt.actions.length, 0);
  assert.ok(receipt.errors.includes('Plan must include at least one action.'));
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
