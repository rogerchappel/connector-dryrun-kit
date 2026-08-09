# CLI

The CLI supports Node.js 20.0.0 and newer. CI verifies the declared minimum and
the current Node.js 24 LTS line using the packed and installed executable.

```bash
connector-dryrun <plan.json> --format markdown
connector-dryrun <plan.json> --format json
connector-dryrun <plan.json>
connector-dryrun --help
connector-dryrun --version
```

Fixture-backed smoke commands:

```bash
node bin/connector-dryrun.js fixtures/sample-plan.json --format markdown
node bin/connector-dryrun.js fixtures/sample-plan.json --format json
node bin/connector-dryrun.js fixtures/invalid-plan.json --format markdown
node bin/connector-dryrun.js --version
```

Exit codes:

- `0`: receipt generated without validation errors.
- `1`: CLI usage or file parsing failed.
- `2`: receipt generated with validation errors.

Warnings do not fail the command because a reviewer may still use the receipt to request missing approvals.
Malformed plan shapes, including `null` plans, non-array `actions`, and non-object
action entries, produce a receipt and exit `2`; malformed JSON or unreadable files
exit `1`.
Plans with missing, non-array, or empty `actions` render a fail-closed summary of
`Highest risk: high` and `Approval required: yes` (or the equivalent JSON fields),
alongside validation errors and exit `2`. The summary indicates that the invalid
plan cannot be safely assessed; it does not describe a validated action.
Write-like actions with a missing, blank, or non-string rollback also produce a
receipt and exit `2`. Their receipt displays `not supplied` instead of presenting
generated guidance as supplied evidence. Read-only actions may omit rollback and
receive conservative manual-review guidance without failing validation.

Unsupported output formats fail before the plan is read, which keeps bad CLI invocations distinct from invalid receipt content.

Arguments are parsed strictly in the forms shown above. Help and version must be
standalone. Unknown options, extra plan paths or other positional arguments,
duplicate or conflicting options, and a missing `--format` value print a usage
error to standard error and exit `1` before the plan file is read. The only
supported format values are `markdown` and `json`; omitting `--format` selects
`markdown`.
