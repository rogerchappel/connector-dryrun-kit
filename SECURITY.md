# Security Policy

Do not put credentials, bearer tokens, customer secrets, or live API payloads in fixture plans.

`connector-dryrun-kit` is designed to run without network access. If a future integration adds network behavior, it must be opt-in, documented, disabled in tests, and guarded by approval language in `SKILL.md`.
