# connector-dryrun-kit

`connector-dryrun-kit` turns proposed connector actions into local dry-run receipts. It is designed for agents that need to preview external side effects before touching CRMs, project-management tools, chat systems, email, or issue trackers.

## Quickstart

```bash
npm install
npm run smoke
node bin/connector-dryrun.js fixtures/sample-plan.json --format json
```

## Input

Plans are JSON files with `name`, `owner`, optional `summary`, and an `actions` array. Each action should include `id`, `connector`, `verb`, `target`, `risk`, `approver`, and `rollback`.

## Safety Notes

- The CLI never calls external APIs.
- Write-like verbs and high-risk actions require approval in the receipt.
- Missing fields are reported before a live connector run.
- `generatedAt` is deterministic for stable tests and review diffs.

## Limitations

- V1 accepts JSON only.
- Provider-specific schemas are intentionally not bundled.
- This project creates evidence for approvals; it does not grant approvals.
