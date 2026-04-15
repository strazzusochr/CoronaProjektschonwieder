#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[AUTO] repo: $ROOT_DIR"

require_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "[AUTO] missing required file: $file" >&2
    exit 1
  fi
}

step() {
  local name="$1"
  shift
  echo "[AUTO] step: $name"
  if "$@"; then
    echo "[AUTO] ok: $name"
  else
    echo "[AUTO] failed: $name" >&2
  fi
}

require_file "security_preflight.py"
require_file "verify_superbrain_merge.py"
require_file "autonomous_control_plane.py"
require_file "autonomy_supervisor_loop.py"

step "security_preflight" python security_preflight.py
step "verify_superbrain_merge" python verify_superbrain_merge.py
step "init_control_plane" python autonomous_control_plane.py init
step "supervisor_once" python autonomy_supervisor_loop.py --once

if [[ "${START_STACK:-0}" == "1" ]]; then
  step "start_godmode_stack" bash ./START_GODMODE.sh
fi

if [[ "${SUPERVISOR_LOOP:-0}" == "1" ]]; then
  interval="${SUPERVISOR_INTERVAL_SECONDS:-60}"
  echo "[AUTO] entering supervisor loop (interval=${interval})"
  python autonomy_supervisor_loop.py --interval "$interval"
fi

echo "[AUTO] completed"
