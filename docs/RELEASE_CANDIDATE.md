# Release Candidate Notes

## Scope

- Local JSON plan parsing.
- Markdown and JSON dry-run receipt rendering.
- Approval and risk checks.
- Agent skill instructions.

## Verification

- `npm run release:check` - pass; runs lint, 10 tests, markdown fixture smoke, schema validation, and asserted package smoke.
- `npm run validate` - pass; validates the sample and invalid fixtures.
- `npm test` - pass; covers CLI help/version, validation exit codes, missing actions, and deterministic JSON receipts.
- `npm run smoke` - pass; renders the sample CRM/project-management dry-run receipt.

## Classification

ship
