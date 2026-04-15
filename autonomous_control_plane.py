#!/usr/bin/env python3
"""Autonomous multi-agent control plane for GODMODE.

Implements a strict 11-role model (9 builders + 2 supervisors), with:
- hard 6-slot runtime limit
- 2 reserved supervisor slots
- builder slot rotation
- evidence-first update ingestion
- supervisor gates for truth/runtime verification
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent
AUTONOMY_DIR = REPO_ROOT / ".godmode_runtime" / "autonomy"
TEAM_STATE_FILE = AUTONOMY_DIR / "team_state.json"
TASK_QUEUE_FILE = AUTONOMY_DIR / "task_queue.json"
CONTROL_STATE_FILE = AUTONOMY_DIR / "control_state.json"
EVIDENCE_LOG_FILE = AUTONOMY_DIR / "evidence_log.jsonl"

MAX_ACTIVE_SLOTS = 6
RESERVED_SUPERVISOR_SLOTS = 2
BUILDER_SLOTS = MAX_ACTIVE_SLOTS - RESERVED_SUPERVISOR_SLOTS

VALID_CLAIM_LABELS = {"verified", "inferred", "unknown"}
UI_IMPACTS = {"ui", "gameplay"}

ROLE_SPECS = [
    {"role": "ProductScopeAgent", "kind": "builder", "order": 1},
    {"role": "GameDesignAgent", "kind": "builder", "order": 2},
    {"role": "WebGLClientAgent", "kind": "builder", "order": 3},
    {"role": "GameplaySystemsAgent", "kind": "builder", "order": 4},
    {"role": "MultiplayerNetcodeAgent", "kind": "builder", "order": 5},
    {"role": "BackendPlatformAgent", "kind": "builder", "order": 6},
    {"role": "CloudInfraDevOpsAgent", "kind": "builder", "order": 7},
    {"role": "QAValidationAgent", "kind": "builder", "order": 8},
    {"role": "SecurityAntiCheatAgent", "kind": "builder", "order": 9},
    {"role": "SentinelTruthAgent", "kind": "supervisor", "order": 10},
    {"role": "SentinelRuntimeAgent", "kind": "supervisor", "order": 11},
]


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


def role_index(team: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {entry["role"]: entry for entry in team}


def init_team_state() -> list[dict[str, Any]]:
    team: list[dict[str, Any]] = []
    for spec in ROLE_SPECS:
        team.append(
            {
                "role": spec["role"],
                "kind": spec["kind"],
                "order": spec["order"],
                "status": "queued",
                "slot": None,
                "last_update": None,
            }
        )
    return team


def init_control_state() -> dict[str, Any]:
    return {
        "max_active_slots": MAX_ACTIVE_SLOTS,
        "reserved_supervisor_slots": RESERVED_SUPERVISOR_SLOTS,
        "builder_slots": BUILDER_SLOTS,
        "active_roles": [],
        "last_rotation": None,
    }


def sort_roles_by_order(roles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(roles, key=lambda item: int(item.get("order", 999)))


def open_tasks_for_role(role: str, queue: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        task
        for task in queue
        if task.get("owner_role") == role
        and task.get("status") in {"queued", "in_progress", "blocked"}
    ]


def choose_builder_priority(queue: list[dict[str, Any]]) -> list[str]:
    by_age = sorted(
        [task for task in queue if task.get("status") in {"queued", "in_progress", "blocked"}],
        key=lambda task: task.get("created_at", ""),
    )
    prioritized: list[str] = []
    for task in by_age:
        role = task.get("owner_role")
        if role and role not in prioritized:
            prioritized.append(role)

    if prioritized:
        return prioritized

    builder_specs = [spec for spec in ROLE_SPECS if spec["kind"] == "builder"]
    return [spec["role"] for spec in sort_roles_by_order(builder_specs)]


def rotate_slots(team: list[dict[str, Any]], queue: list[dict[str, Any]], control: dict[str, Any]) -> None:
    team_by_role = role_index(team)

    supervisors = [entry for entry in team if entry["kind"] == "supervisor"]
    supervisors = sort_roles_by_order(supervisors)
    for slot, supervisor in enumerate(supervisors, start=1):
        supervisor["slot"] = slot
        supervisor["status"] = "active"
        supervisor["last_update"] = utc_now()

    active_builder_roles = [
        entry["role"]
        for entry in team
        if entry["kind"] == "builder" and entry.get("slot")
    ]

    for role in list(active_builder_roles):
        if not open_tasks_for_role(role, queue):
            team_by_role[role]["slot"] = None
            team_by_role[role]["status"] = "queued"
            team_by_role[role]["last_update"] = utc_now()

    needed = BUILDER_SLOTS - len(
        [entry for entry in team if entry["kind"] == "builder" and entry.get("slot")]
    )
    if needed > 0:
        priority_roles = choose_builder_priority(queue)
        next_slot = RESERVED_SUPERVISOR_SLOTS + 1

        used_slots = {
            int(entry["slot"])
            for entry in team
            if entry.get("slot") is not None
        }
        while next_slot in used_slots and next_slot <= MAX_ACTIVE_SLOTS:
            next_slot += 1

        for role in priority_roles:
            if needed <= 0:
                break
            entry = team_by_role.get(role)
            if not entry or entry["kind"] != "builder":
                continue
            if entry.get("slot") is not None:
                continue
            while next_slot in used_slots and next_slot <= MAX_ACTIVE_SLOTS:
                next_slot += 1
            if next_slot > MAX_ACTIVE_SLOTS:
                break
            entry["slot"] = next_slot
            entry["status"] = "active"
            entry["last_update"] = utc_now()
            used_slots.add(next_slot)
            needed -= 1

    control["active_roles"] = [
        {
            "role": entry["role"],
            "slot": entry["slot"],
            "kind": entry["kind"],
        }
        for entry in sorted(
            [entry for entry in team if entry.get("slot") is not None],
            key=lambda item: int(item["slot"]),
        )
    ]
    control["last_rotation"] = utc_now()


def bootstrap(force: bool = False) -> None:
    AUTONOMY_DIR.mkdir(parents=True, exist_ok=True)

    if force or not TEAM_STATE_FILE.exists():
        write_json(TEAM_STATE_FILE, init_team_state())
    if force or not TASK_QUEUE_FILE.exists():
        write_json(TASK_QUEUE_FILE, [])
    if force or not CONTROL_STATE_FILE.exists():
        write_json(CONTROL_STATE_FILE, init_control_state())

    team = read_json(TEAM_STATE_FILE, [])
    queue = read_json(TASK_QUEUE_FILE, [])
    control = read_json(CONTROL_STATE_FILE, init_control_state())

    rotate_slots(team, queue, control)
    write_json(TEAM_STATE_FILE, team)
    write_json(TASK_QUEUE_FILE, queue)
    write_json(CONTROL_STATE_FILE, control)


def load_state() -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    if not TEAM_STATE_FILE.exists() or not TASK_QUEUE_FILE.exists() or not CONTROL_STATE_FILE.exists():
        bootstrap(force=False)
    return (
        read_json(TEAM_STATE_FILE, []),
        read_json(TASK_QUEUE_FILE, []),
        read_json(CONTROL_STATE_FILE, init_control_state()),
    )


def save_state(team: list[dict[str, Any]], queue: list[dict[str, Any]], control: dict[str, Any]) -> None:
    write_json(TEAM_STATE_FILE, team)
    write_json(TASK_QUEUE_FILE, queue)
    write_json(CONTROL_STATE_FILE, control)


def enqueue_task(task_id: str, owner_role: str, title: str, impact: str, description: str) -> None:
    team, queue, control = load_state()
    team_by_role = role_index(team)

    if owner_role not in team_by_role:
        raise SystemExit(f"Unknown owner role: {owner_role}")
    if team_by_role[owner_role]["kind"] != "builder":
        raise SystemExit(f"Task owner must be a builder role: {owner_role}")
    if any(task.get("task_id") == task_id for task in queue):
        raise SystemExit(f"Duplicate task_id: {task_id}")

    queue.append(
        {
            "task_id": task_id,
            "owner_role": owner_role,
            "title": title,
            "description": description,
            "impact": impact,
            "status": "queued",
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "gate_status": "pending",
        }
    )

    rotate_slots(team, queue, control)
    save_state(team, queue, control)


def validate_claims(claims: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(claims, list) or not claims:
        errors.append("claims must be a non-empty list")
        return errors

    for idx, claim in enumerate(claims):
        if not isinstance(claim, dict):
            errors.append(f"claims[{idx}] must be an object")
            continue
        label = claim.get("label")
        text = str(claim.get("text", "")).strip()
        if label not in VALID_CLAIM_LABELS:
            errors.append(f"claims[{idx}].label must be one of {sorted(VALID_CLAIM_LABELS)}")
        if not text:
            errors.append(f"claims[{idx}].text must be non-empty")
    return errors


def validate_update(update: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    for key in ["task_id", "agent_role", "status", "impact", "claims"]:
        if key not in update:
            errors.append(f"missing field: {key}")

    errors.extend(validate_claims(update.get("claims")))

    status = update.get("status")
    if status not in {"in_progress", "completed", "blocked"}:
        errors.append("status must be in_progress|completed|blocked")

    tools = update.get("tools_executed", [])
    if not isinstance(tools, list):
        errors.append("tools_executed must be a list")

    tests = update.get("tests", {})
    if not isinstance(tests, dict):
        errors.append("tests must be an object")

    if status == "completed":
        if not tools:
            errors.append("completed update requires tools_executed entries")
        if not str(tests.get("summary", "")).strip():
            errors.append("completed update requires tests.summary")
        if tests.get("passed") is not True:
            errors.append("completed update requires tests.passed=true")
        if not str(update.get("risk_note", "")).strip():
            errors.append("completed update requires risk_note")
        if not str(update.get("rollback_note", "")).strip():
            errors.append("completed update requires rollback_note")

    if update.get("impact") in UI_IMPACTS:
        browser = update.get("browser_checks", {})
        if not isinstance(browser, dict):
            errors.append("ui/gameplay update requires browser_checks object")
        else:
            for field in ["snapshot", "console", "network"]:
                if browser.get(field) is not True:
                    errors.append(f"ui/gameplay requires browser_checks.{field}=true")

    return errors


def supervisor_truth_verdict(update: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    reasons = list(errors)

    if update.get("status") == "completed":
        unknown_count = sum(
            1
            for claim in update.get("claims", [])
            if isinstance(claim, dict) and claim.get("label") == "unknown"
        )
        if unknown_count > 0:
            reasons.append("completed update cannot contain unknown claims")

    return {"pass": len(reasons) == 0, "reasons": reasons}


def supervisor_runtime_verdict(update: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    reasons = []
    if update.get("impact") in UI_IMPACTS:
        tools = set(update.get("tools_executed", []))
        if "chrome-devtools" not in tools:
            reasons.append("ui/gameplay evidence requires chrome-devtools in tools_executed")
        if "puppeteer" not in tools:
            reasons.append("ui/gameplay evidence requires puppeteer in tools_executed")

    if update.get("status") == "completed":
        tests = update.get("tests", {})
        if tests.get("passed") is not True:
            reasons.append("runtime gate requires tests.passed=true")

    for err in errors:
        if "browser_checks" in err or "tests" in err or "tools_executed" in err:
            reasons.append(err)

    return {"pass": len(reasons) == 0, "reasons": reasons}


def ingest_update(update: dict[str, Any]) -> dict[str, Any]:
    team, queue, control = load_state()
    team_by_role = role_index(team)

    errors = validate_update(update)
    truth = supervisor_truth_verdict(update, errors)
    runtime = supervisor_runtime_verdict(update, errors)
    gate_pass = bool(truth["pass"] and runtime["pass"])

    task_id = update.get("task_id")
    task = next((item for item in queue if item.get("task_id") == task_id), None)
    if task is None:
        raise SystemExit(f"Unknown task_id: {task_id}")

    role = update.get("agent_role")
    if role not in team_by_role:
        raise SystemExit(f"Unknown agent_role: {role}")
    if task.get("owner_role") != role:
        raise SystemExit(
            f"task owner mismatch: task owner is {task.get('owner_role')} but update came from {role}"
        )

    now = utc_now()
    task["updated_at"] = now
    task["last_update"] = update

    if gate_pass:
        task["status"] = update.get("status")
        task["gate_status"] = "pass"
    else:
        task["status"] = "blocked"
        task["gate_status"] = "fail"

    team_by_role[role]["last_update"] = now
    team_by_role[role]["status"] = "active"

    evidence_entry = {
        "timestamp": now,
        "task_id": task_id,
        "agent_role": role,
        "impact": update.get("impact"),
        "requested_status": update.get("status"),
        "effective_status": task["status"],
        "truth_gate": truth,
        "runtime_gate": runtime,
        "gate_pass": gate_pass,
    }
    append_jsonl(EVIDENCE_LOG_FILE, evidence_entry)

    rotate_slots(team, queue, control)
    save_state(team, queue, control)
    return evidence_entry


def get_status_payload() -> dict[str, Any]:
    team, queue, control = load_state()
    active = sorted(
        [entry for entry in team if entry.get("slot") is not None],
        key=lambda item: int(item["slot"]),
    )
    return {
        "timestamp": utc_now(),
        "active_roles": [
            {
                "slot": entry.get("slot"),
                "role": entry.get("role"),
                "kind": entry.get("kind"),
                "status": entry.get("status"),
            }
            for entry in active
        ],
        "queue": {
            "total": len(queue),
            "queued": len([task for task in queue if task.get("status") == "queued"]),
            "in_progress": len([task for task in queue if task.get("status") == "in_progress"]),
            "blocked": len([task for task in queue if task.get("status") == "blocked"]),
            "completed": len([task for task in queue if task.get("status") == "completed"]),
        },
        "control": control,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GODMODE autonomous control plane")
    sub = parser.add_subparsers(dest="cmd", required=True)

    init_parser = sub.add_parser("init", help="Initialize autonomy runtime files")
    init_parser.add_argument("--force", action="store_true")

    queue_parser = sub.add_parser("queue-task", help="Queue a builder task")
    queue_parser.add_argument("--task-id", required=True)
    queue_parser.add_argument("--owner-role", required=True)
    queue_parser.add_argument("--title", required=True)
    queue_parser.add_argument("--impact", required=True)
    queue_parser.add_argument("--description", default="")

    update_parser = sub.add_parser("ingest-update", help="Ingest a task update JSON file")
    update_parser.add_argument("--file", required=True)

    sub.add_parser("rotate", help="Force slot rotation evaluation")
    sub.add_parser("status", help="Print control-plane status JSON")

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.cmd == "init":
        bootstrap(force=args.force)
        print(json.dumps({"ok": True, "action": "init", "path": str(AUTONOMY_DIR)}, indent=2))
        return 0

    if args.cmd == "queue-task":
        enqueue_task(
            task_id=args.task_id,
            owner_role=args.owner_role,
            title=args.title,
            impact=args.impact,
            description=args.description,
        )
        print(json.dumps({"ok": True, "action": "queue-task", "task_id": args.task_id}, indent=2))
        return 0

    if args.cmd == "ingest-update":
        payload = read_json(Path(args.file), default=None)
        if payload is None:
            raise SystemExit(f"Failed to read JSON update: {args.file}")
        result = ingest_update(payload)
        print(json.dumps({"ok": True, "action": "ingest-update", "result": result}, indent=2))
        return 0

    if args.cmd == "rotate":
        team, queue, control = load_state()
        rotate_slots(team, queue, control)
        save_state(team, queue, control)
        print(json.dumps({"ok": True, "action": "rotate", "control": control}, indent=2))
        return 0

    if args.cmd == "status":
        print(json.dumps(get_status_payload(), indent=2))
        return 0

    raise SystemExit(f"Unknown command: {args.cmd}")


if __name__ == "__main__":
    raise SystemExit(main())
