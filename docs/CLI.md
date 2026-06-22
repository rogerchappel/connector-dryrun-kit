# CLI

```bash
connector-dryrun <plan.json> --format markdown
connector-dryrun <plan.json> --format json
```

Exit codes:

- `0`: receipt generated without validation errors.
- `1`: CLI usage or file parsing failed.
- `2`: receipt generated with validation errors.

Warnings do not fail the command because a reviewer may still use the receipt to request missing approvals.
