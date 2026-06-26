# CLI

```bash
connector-dryrun <plan.json> --format markdown
connector-dryrun <plan.json> --format json
```

Fixture-backed smoke commands:

```bash
node bin/connector-dryrun.js fixtures/sample-plan.json --format markdown
node bin/connector-dryrun.js fixtures/sample-plan.json --format json
node bin/connector-dryrun.js fixtures/invalid-plan.json --format markdown
```

Exit codes:

- `0`: receipt generated without validation errors.
- `1`: CLI usage or file parsing failed.
- `2`: receipt generated with validation errors.

Warnings do not fail the command because a reviewer may still use the receipt to request missing approvals.

Unsupported output formats fail before the plan is read, which keeps bad CLI invocations distinct from invalid receipt content.
