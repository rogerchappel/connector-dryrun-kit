import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceipt, renderMarkdown } from '../src/index.js';

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
