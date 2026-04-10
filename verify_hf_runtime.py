from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

RUNTIME_DIR = Path("d:/Web/docs/godmode_setup/.godmode_runtime/evidence")

SPACE_RULES = [
    {"space": "Wrzzzrzr/openhands-godmode", "expected": "RUNNING", "class": "core_public"},
    {"space": "Wrzzzrzr/langgraph-godmode", "expected": "RUNNING", "class": "core_public"},
    {"space": "Wrzzzrzr/smolagents-godmode", "expected": "RUNNING", "class": "core_public"},
    {"space": "Wrzzzrzr/aider-godmode-safe", "expected": "RUNNING", "class": "core_public"},
    {"space": "Wrzzzrzr/n8n-hf-space", "expected": "RUNNING", "class": "core_public"},
    {"space": "Wrzzzrzr/aider-web-ide", "expected": "PAUSED", "class": "legacy_public"},
    {"space": "Wrzzzrzr/bolt-diy-godmode", "expected": "RUNNING", "class": "private_or_blocked"},
    {"space": "Wrzzzrzr/godmode-pilot-v2", "expected": "RUNNING", "class": "private_or_blocked"},
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def call_api(space: str, token: str) -> dict[str, Any]:
    url = f"https://huggingface.co/api/spaces/{space}"
    req = request.Request(url=url, method="GET")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with request.urlopen(req, timeout=25) as response:
            payload = json.loads(response.read().decode("utf-8", errors="replace"))
            stage = ((payload.get("runtime") or {}).get("stage") or "").upper()
            return {
                "ok": True,
                "http_status": int(response.status),
                "runtime_stage": stage,
                "private": bool(payload.get("private", False)),
                "sdk": payload.get("sdk", ""),
                "space_url": payload.get("url", ""),
            }
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return {
            "ok": False,
            "http_status": int(exc.code),
            "runtime_stage": "",
            "error": raw or str(exc),
        }
    except Exception as exc:  # pragma: no cover - runtime path
        return {
            "ok": False,
            "http_status": None,
            "runtime_stage": "",
            "error": str(exc),
        }


def classify(rule: dict[str, Any], result: dict[str, Any], strict: bool) -> str:
    expected = str(rule["expected"]).upper()
    stage = str(result.get("runtime_stage", "")).upper()
    status = result.get("http_status")

    if result.get("ok") and stage == expected:
        return "VERIFIED"

    if rule["class"] == "legacy_public" and result.get("ok") and stage == "PAUSED":
        return "LEGACY"

    if status in {401, 403}:
        return "BLOCKED" if strict else "NOT VERIFIED"

    if status == 404:
        return "NOT VERIFIED"

    if result.get("ok"):
        return "PARTIAL"

    return "BLOCKED"


def main() -> int:
    token = os.environ.get("HF_TOKEN", "").strip()
    strict = os.environ.get("HF_VERIFY_STRICT", "true").strip().lower() in {"1", "true", "yes", "on"}
    timestamp = now_iso()

    rows: list[dict[str, Any]] = []
    for rule in SPACE_RULES:
        api_result = call_api(rule["space"], token)
        row = {
            "space": rule["space"],
            "class": rule["class"],
            "expected_runtime": rule["expected"],
            "result": api_result,
            "gate_status": classify(rule, api_result, strict),
        }
        rows.append(row)

    core_failures = [
        row for row in rows
        if row["class"] == "core_public" and row["gate_status"] != "VERIFIED"
    ]
    private_blockers = [
        row for row in rows
        if row["class"] == "private_or_blocked" and row["gate_status"] in {"BLOCKED", "NOT VERIFIED"}
    ]

    payload = {
        "timestamp": timestamp,
        "strict_mode": strict,
        "hf_token_present": bool(token),
        "summary": {
            "core_gate": "PASS" if not core_failures else "FAIL",
            "private_gate": "PASS" if not private_blockers else "BLOCKED",
            "core_failures": len(core_failures),
            "private_blockers": len(private_blockers),
        },
        "spaces": rows,
    }

    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    stamp = timestamp.replace(":", "-").replace(".", "-")
    out_file = RUNTIME_DIR / f"hf_runtime_snapshot_{stamp}.json"
    latest_file = RUNTIME_DIR / "hf_runtime_latest.json"
    out_file.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
    latest_file.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")

    print(json.dumps({"status": "ok", "snapshot": str(out_file), "summary": payload["summary"]}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

