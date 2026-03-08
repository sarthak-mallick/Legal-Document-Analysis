#!/usr/bin/env bash

set -euo pipefail

echo "[run-current-e2e] Running Week 1 verification"
npm run typecheck
npm run build

