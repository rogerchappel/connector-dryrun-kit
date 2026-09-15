# Changelog

## [Unreleased]

- Summarize plans with missing, malformed, or empty action collections as high
  risk and approval-required while retaining their validation errors.
- Restore compatibility with the declared Node.js 20.0.0 minimum, exercise the
  packed and installed CLI, and verify the minimum plus Node.js 24 LTS in CI.
- Add release-readiness checks for package metadata, pack contents, and CI verification.
- Added fixture-backed CLI integration coverage for help, JSON receipts, validation exit codes, and unsupported output formats.
- Documented CLI smoke commands that exercise successful and validation-error receipt paths.

## 0.1.0

- Initial local-first connector dry-run CLI.
- Added receipt builder, Markdown and JSON renderers, fixtures, tests, and agent skill documentation.
