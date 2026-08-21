# Release Candidate Notes

## Scope

- Local JSON plan parsing.
- Markdown and JSON dry-run receipt rendering.
- Approval and risk checks.
- Agent skill instructions.

## Verification

- `npm run release:check` - pass; runs syntax checks, tests, fixture smoke, validation, and the asserted package smoke.
- `npm run package:smoke` - pass; checks publish-normalized metadata with a dry run, package contents, the public import, and the installed CLI without publishing.
- `npm run validate` - pass; validates the sample and invalid fixtures.
- `npm test` - pass; covers CLI help/version, validation exit codes, missing actions, and deterministic JSON receipts.
- `npm run smoke` - pass; renders the sample CRM/project-management dry-run receipt.

## Classification

ship
