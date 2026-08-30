import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowUrl = new URL('../.github/workflows/ci.yml', import.meta.url);

test('CI uses immutable actions, least-privilege permissions, and lockfile-only installs', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(
    workflow,
    /uses: actions\/checkout@[0-9a-f]{40} # v4/,
  );
  assert.match(
    workflow,
    /uses: actions\/setup-node@[0-9a-f]{40} # v4/,
  );
  assert.match(workflow, /run: npm ci$/m);
  assert.doesNotMatch(workflow, /npm install/);
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node)@v\d/);
});
