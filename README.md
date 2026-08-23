# connector-dryrun-kit

`connector-dryrun-kit` turns proposed connector actions into local dry-run receipts. It is designed for agents that need to preview external side effects before touching CRMs, project-management tools, chat systems, email, or issue trackers.

Node.js 20.0.0 or newer is supported. Release checks verify the exact minimum and
the current Node.js 24 LTS line.

## Quickstart

```bash
npm install
npm run smoke
node bin/connector-dryrun.js fixtures/sample-plan.json --format json
node bin/connector-dryrun.js --version
```

The package root exposes the receipt builder and renderers for ESM consumers:

```js
import { buildReceipt, renderJson, renderMarkdown } from "connector-dryrun-kit";
```

Run the complete release candidate gate before publishing or cutting a release:

```bash
npm run release:check
```

That command runs syntax checks, tests, CLI smoke fixtures, validation, and a
package smoke. The package smoke verifies that `npm publish --dry-run` leaves the
manifest unchanged, installs the packed tarball in a clean consumer, imports the
public library API, and invokes the published `connector-dryrun` bin for help,
version, and fixture rendering. It does not publish the package.

## Input

Plans are JSON files with `name`, `owner`, optional `summary`, and an `actions` array. Each action should include `id`, `connector`, `verb`, `target`, `risk`, `approver`, and `rollback`.

Markdown receipts render plan-controlled values as literal, single-line text. Line
separators and repeated whitespace are collapsed, and Markdown punctuation is
escaped so values cannot introduce headings, lists, links, emphasis, code spans,
or table structure. JSON receipts retain the normalized semantic field values
without Markdown escaping.

Plans and actions must be JSON objects. Verb and risk tokens are trimmed and
lowercased, so casing or surrounding whitespace does not change approval policy.
The accepted verbs are `read`, `create`, `update`, `delete`, `send`, `invite`,
and `archive`. Unsupported non-blank verbs produce validation errors, require
approval even at low risk, retain their normalized token in the receipt, and use
manual-review rollback guidance. Unknown risks are treated conservatively as `high`.
Missing, non-array, and empty action collections produce validation errors and a
fail-closed summary (`highestRisk: "high"`, `approvalRequired: true`) so an
incomplete plan cannot be mistaken for a low-risk plan that needs no approval.
Write-like actions (`create`, `update`, `delete`, `send`, `invite`, and `archive`)
must supply a non-blank string in `rollback`. Missing, blank, or non-string
rollback values are rendered as validation errors and make the CLI exit `2`.
Read-only actions may omit rollback and receive conservative manual-review text.

## CLI Examples

Preview a valid connector plan as Markdown:

```bash
node bin/connector-dryrun.js fixtures/sample-plan.json --format markdown
```

Preview an approval-heavy plan as JSON:

```bash
node bin/connector-dryrun.js examples/approval-needed.json --format json
```

Check package contents before publishing:

```bash
npm run package:smoke
```

## Safety Notes

- The CLI never calls external APIs.
- Write-like verbs and high-risk actions require approval in the receipt.
- Missing fields are reported before a live connector run.
- `generatedAt` is deterministic for stable tests and review diffs.

## Limitations

- V1 accepts JSON only.
- Provider-specific schemas are intentionally not bundled.
- This project creates evidence for approvals; it does not grant approvals.

## Verification

```bash
npm run lint
npm test
npm run release:check
```
## Development checks

Run the same local gates that CI runs before opening a PR:

```bash
npm run check --if-present
npm run build --if-present
npm test --if-present
npm run smoke --if-present
```
