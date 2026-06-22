# Orchestration

1. Ask the agent to draft a connector action plan locally.
2. Run the plan through `connector-dryrun`.
3. Review errors, warnings, risk level, and approval assignment.
4. Store the receipt with the agent run evidence.
5. Use a separate approved connector runner only after explicit approval.

The CLI is intentionally read-only and should be safe to run inside planning, review, and release-readiness lanes.
