# PRD

Build a local-first agent skill and CLI that converts proposed connector action plans into dry-run receipts.

## Goals

- Make connector side effects explicit.
- Require approval for risky or write-like actions.
- Produce stable Markdown and JSON artifacts.
- Support fixture-backed local verification.

## Non-Goals

- Live connector execution.
- Credential storage.
- Remote policy calls.
