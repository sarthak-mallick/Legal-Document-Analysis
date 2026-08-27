#!/usr/bin/env bash

set -euo pipefail

echo "[run-current-e2e] Running canonical verification (typecheck + build)"
npm run typecheck
npm run build

