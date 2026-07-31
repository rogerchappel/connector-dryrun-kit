# Plan Schema

Every plan is a JSON object with:

- `name`: required, non-blank string containing the human-readable plan name.
- `owner`: required, non-blank string naming the agent, team, or person responsible.
- `summary`: optional string containing context for reviewers.
- `actions`: ordered connector actions.

Each action uses string fields for `id`, `connector`, `verb`, `target`, `risk`,
`approver`, `rollback`, and `notes`. `connector`, `verb`, and `target` must be
non-blank. An omitted or blank `id` receives a deterministic `action-N` fallback
and warning. `approver`, `rollback`, and `notes` are optional; when present they
must be strings. An omitted rollback receives a conservative manual-review
fallback.

The plan must be a JSON object and `actions` must be an array of JSON objects.
Malformed structures are rendered as receipt validation errors instead of causing a
runtime exception.
Present scalar fields with non-string values produce validation errors and safe
fallback text. This keeps JSON and Markdown receipts renderable without JavaScript
object or array coercion. Blank required strings also produce validation errors.

Verb and risk tokens are trimmed and lowercased before validation and approval
decisions. For example, `UPDATE`, ` update `, and `update` are all rendered as
`update` and require approval. Risk must normalize to `low`, `medium`, or `high`;
unknown, missing, and non-string risks are treated conservatively as `high`.
