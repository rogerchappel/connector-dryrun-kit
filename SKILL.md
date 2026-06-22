# Connector Dry-Run Kit

Use this skill when an agent is preparing connector actions that may read or write external systems and needs a local approval receipt before execution.

## Required Inputs

- A JSON action plan.
- Connector names and targets.
- Risk level for each action.
- Rollback notes for write-like actions.

## Required Tools

- Local filesystem read access.
- Node.js 20 or newer.
- No live connector credentials are required.

## Side-Effect Boundaries

This skill only reads local plan files and writes terminal output. It must not call live APIs, mutate external systems, or infer approval from silence.

## Approval Requirements

Any action with risk `high` or verbs such as `create`, `update`, `delete`, `send`, `invite`, or `archive` must be treated as approval-required before live execution.

## Examples

```bash
node bin/connector-dryrun.js fixtures/sample-plan.json --format markdown
node bin/connector-dryrun.js fixtures/sample-plan.json --format json
```

## Validation Workflow

Run `npm test`, `npm run check`, and `npm run smoke`. Review warnings and errors in the receipt before using any separate live connector.
