# Plan Schema

Every plan is a JSON object with:

- `name`: human-readable plan name.
- `owner`: agent, team, or person responsible for the plan.
- `summary`: optional context for reviewers.
- `actions`: ordered connector actions.

Each action should include `id`, `connector`, `verb`, `target`, `risk`, `approver`, `rollback`, and optional `notes`.

The plan must be a JSON object and `actions` must be an array of JSON objects.
Malformed structures are rendered as receipt validation errors instead of causing a
runtime exception.

Verb and risk tokens are trimmed and lowercased before validation and approval
decisions. For example, `UPDATE`, ` update `, and `update` are all rendered as
`update` and require approval. Risk must normalize to `low`, `medium`, or `high`;
unknown, missing, and non-string risks are treated conservatively as `high`.
