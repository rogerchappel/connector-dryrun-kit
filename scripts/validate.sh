#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
npm run smoke
node bin/connector-dryrun.js examples/approval-needed.json --format json >/tmp/connector-dryrun-kit-approval.json
