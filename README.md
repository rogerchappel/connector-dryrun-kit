# connector-dryrun-kit

`connector-dryrun-kit` turns proposed connector actions into local dry-run receipts. It is designed for agents that need to preview external side effects before touching CRMs, project-management tools, chat systems, email, or issue trackers.

## Quickstart

```bash
npm install
npm run smoke
node bin/connector-dryrun.js fixtures/sample-plan.json --format json
```

Run the complete release candidate gate before publishing or cutting a release:

```bash
npm run release:check
```

That command runs syntax checks, tests, CLI smoke fixtures, validation, and an npm package contents smoke test.

## Input

Plans are JSON files with `name`, `owner`, optional `summary`, and an `actions` array. Each action should include `id`, `connector`, `verb`, `target`, `risk`, `approver`, and `rollback`.

## CLI Examples

Preview a valid connector plan as Markdown:

```bash
node bin/connector-dryrun.js fixtures/sample-plan.json --format markdown
```

Preview an approval-heavy plan as JSON:

```bash
node bin/connector-dryrun.js examples/approval-needed.json --format json
```

Check package contents before publishing:

```bash
npm run package:smoke
```

## Safety Notes

- The CLI never calls external APIs.
- Write-like verbs and high-risk actions require approval in the receipt.
- Missing fields are reported before a live connector run.
- `generatedAt` is deterministic for stable tests and review diffs.

## Limitations

- V1 accepts JSON only.
- Provider-specific schemas are intentionally not bundled.
- This project creates evidence for approvals; it does not grant approvals.

## Verification

```bash
npm test
```
