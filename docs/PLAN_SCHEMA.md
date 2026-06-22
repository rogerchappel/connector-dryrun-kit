# Plan Schema

Every plan is a JSON object with:

- `name`: human-readable plan name.
- `owner`: agent, team, or person responsible for the plan.
- `summary`: optional context for reviewers.
- `actions`: ordered connector actions.

Each action should include `id`, `connector`, `verb`, `target`, `risk`, `approver`, `rollback`, and optional `notes`.

Risk must be `low`, `medium`, or `high`. Unknown risks are treated as `high`.
