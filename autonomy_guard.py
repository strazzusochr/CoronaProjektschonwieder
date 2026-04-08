#!/usr/bin/env python3
"""Autonomy guard for GODMODE mission state.

This script verifies repository evidence for mission completion and can
synchronize `GODMODE_GOAL.md` to DONE status when conditions are met.
"""

from __future__ import annotations

import argparse
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

GOAL_FILE = Path("GODMODE_GOAL.md")
PROOF_FILE = Path("FINAL_PROOF.md")
MEMORY_FILE = Path("memory_vault.md")


@dataclass
class CheckResult:
    proof_exists: bool
    current_sha: str
    goal_text: str
    needs_update: bool


def get_current_sha() -> str:
    return (
        subprocess.check_output(["git", "rev-parse", "HEAD"], text=True)
        .strip()
    )


def load_goal_text() -> str:
    if not GOAL_FILE.exists():
        raise FileNotFoundError(f"Missing {GOAL_FILE}")
    return GOAL_FILE.read_text(encoding="utf-8")


def mission_status_line(goal_text: str) -> str | None:
    for line in goal_text.splitlines():
        if line.startswith("Status:"):
            return line
    return None


def evaluate() -> CheckResult:
    proof_exists = PROOF_FILE.exists()
    current_sha = get_current_sha()
    goal_text = load_goal_text()
    status_line = mission_status_line(goal_text) or ""
    needs_update = proof_exists and "Status: DONE" not in status_line
    return CheckResult(
        proof_exists=proof_exists,
        current_sha=current_sha,
        goal_text=goal_text,
        needs_update=needs_update,
    )


def write_goal_done(goal_text: str, sha: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    done_line = f"Status: DONE ({stamp}, sha={sha[:12]})"
    lines = goal_text.splitlines()
    replaced = False

    for idx, line in enumerate(lines):
        if line.startswith("Status:"):
            lines[idx] = done_line
            replaced = True
            break

    if not replaced:
        lines.append(done_line)

    new_text = "\n".join(lines).rstrip() + "\n"
    GOAL_FILE.write_text(new_text, encoding="utf-8")
    return done_line


def append_memory_entry(status_line: str, sha: str) -> None:
    timestamp = datetime.now(timezone.utc).isoformat()
    entry = (
        f"- {timestamp} AUTONOMY_GUARD synced mission status: "
        f"{status_line}; sha={sha}\n"
    )
    MEMORY_FILE.write_text(
        (MEMORY_FILE.read_text(encoding="utf-8") if MEMORY_FILE.exists() else "") + entry,
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply mission status update")
    args = parser.parse_args()

    result = evaluate()

    print(f"proof_exists={result.proof_exists}")
    print(f"sha={result.current_sha}")
    print(f"needs_update={result.needs_update}")

    if not args.apply:
        return 0

    if not result.proof_exists:
        raise SystemExit("Cannot mark DONE: FINAL_PROOF.md is missing")

    if result.needs_update:
        status_line = write_goal_done(result.goal_text, result.current_sha)
        append_memory_entry(status_line, result.current_sha)
        print(f"updated_goal_status={status_line}")
    else:
        append_memory_entry("Status already DONE", result.current_sha)
        print("goal_status_already_done=true")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
