#!/usr/bin/env python3
"""Autonomy supervisor loop for godmode_setup.

Automates queue hygiene and slot rotation for the existing autonomy control-plane
artifacts when direct interactive execution is not available.
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent
AUTONOMY_DIR = REPO_ROOT / ".godmode_runtime" / "autonomy"
TEAM_STATE_FILE = AUTONOMY_DIR / "team_state.json"
TASK_QUEUE_FILE = AUTONOMY_DIR / "task_queue.json"
CONTROL_STATE_FILE = AUTONOMY_DIR / "control_state.json"
HEARTBEAT_FILE = AUTONOMY_DIR / "heartbeat.json"
HEARTBEAT_LOG_FILE = AUTONOMY_DIR / "heartbeat_log.jsonl"

MAX_SLOTS = 6
SUPERVISOR_SLOTS = 2
BUILDER_SLOTS = MAX_SLOTS - SUPERVISOR_SLOTS

ROLE_ORDER = [
    "ProductScopeAgent",
    "GameDesignAgent",
    "WebGLClientAgent",
    "GameplaySystemsAgent",
    "MultiplayerNetcodeAgent",
    "BackendPlatformAgent",
    "CloudInfraDevOpsAgent",
    "QAValidationAgent",
    "SecurityAntiCheatAgent",
    "SentinelTruthAgent",
    "SentinelRuntimeAgent",
]

SUPERVISORS = ["SentinelTruthAgent", "SentinelRuntimeAgent"]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def append_jsonl(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=True) + "\n")


def role_rank(role: str) -> int:
    try:
        return ROLE_ORDER.index(role)
    except ValueError:
        return 999


def deliverable_exists(task: dict[str, Any]) -> bool:
    rel = task.get("deliverable")
    if not rel:
        return False
    return (REPO_ROOT / rel).exists()


def reconcile_task_status(task: dict[str, Any]) -> tuple[bool, str]:
    status = task.get("status")
    gate = task.get("gate_status")

    if status == "blocked":
        return False, "blocked"

    if status in {"queued", "in_progress"} and deliverable_exists(task):
        if status == "queued":
            task["status"] = "in_progress"
            task["updated_at"] = utc_now()
            task["gate_status"] = gate if gate in {"pass", "fail"} else "pending"
            return True, "promoted_to_in_progress"
        return False, "already_in_progress"

    return False, "unchanged"


def rotate(team: list[dict[str, Any]], queue: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_role = {entry.get("role"): entry for entry in team}

    for idx, role in enumerate(SUPERVISORS, start=1):
        entry = by_role.get(role)
        if not entry:
            continue
        entry["slot"] = idx
        entry["status"] = "active"
        entry["last_update"] = utc_now()

    candidates = []
    for task in queue:
        if task.get("status") not in {"queued", "in_progress"}:
            continue
        role = task.get("owner_role")
        if role in SUPERVISORS:
            continue
        candidates.append(role)

    deduped = []
    for role in sorted(candidates, key=role_rank):
        if role not in deduped:
            deduped.append(role)

    active_builders = deduped[:BUILDER_SLOTS]

    for role, entry in by_role.items():
        if role in SUPERVISORS:
            continue
        if role in active_builders:
            slot = SUPERVISOR_SLOTS + 1 + active_builders.index(role)
            entry["slot"] = slot
            if entry.get("status") != "blocked":
                entry["status"] = "active"
            entry["last_update"] = utc_now()
        else:
            entry["slot"] = None
            if entry.get("status") not in {"blocked"}:
                entry["status"] = "queued"

    active_roles = []
    for entry in sorted(team, key=lambda item: (item.get("slot") is None, item.get("slot") or 999)):
        if entry.get("slot") is None:
            continue
        active_roles.append(
            {
                "role": entry.get("role"),
                "slot": entry.get("slot"),
                "kind": entry.get("kind"),
            }
        )
    return active_roles


def run_once() -> dict[str, Any]:
    team = read_json(TEAM_STATE_FILE, [])
    queue = read_json(TASK_QUEUE_FILE, [])
    control = read_json(CONTROL_STATE_FILE, {})

    changed = []
    for task in queue:
        updated, reason = reconcile_task_status(task)
        if updated:
            changed.append({"task_id": task.get("task_id"), "reason": reason})

    active_roles = rotate(team, queue)
    control["max_active_slots"] = MAX_SLOTS
    control["reserved_supervisor_slots"] = SUPERVISOR_SLOTS
    control["builder_slots"] = BUILDER_SLOTS
    control["active_roles"] = active_roles
    control["last_rotation"] = utc_now()

    write_json(TEAM_STATE_FILE, team)
    write_json(TASK_QUEUE_FILE, queue)
    write_json(CONTROL_STATE_FILE, control)

    payload = {
        "timestamp": utc_now(),
        "changed_tasks": changed,
        "active_roles": active_roles,
        "queue_counts": {
            "queued": sum(1 for t in queue if t.get("status") == "queued"),
            "in_progress": sum(1 for t in queue if t.get("status") == "in_progress"),
            "blocked": sum(1 for t in queue if t.get("status") == "blocked"),
            "completed": sum(1 for t in queue if t.get("status") == "completed"),
        },
    }

    write_json(HEARTBEAT_FILE, payload)
    append_jsonl(HEARTBEAT_LOG_FILE, payload)
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Autonomy supervisor loop")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    parser.add_argument("--interval", type=int, default=60, help="Loop interval seconds")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.once:
        result = run_once()
        print(json.dumps(result, indent=2))
        return 0

    while True:
        result = run_once()
        print(json.dumps(result))
        time.sleep(max(5, args.interval))


if __name__ == "__main__":
    raise SystemExit(main())
