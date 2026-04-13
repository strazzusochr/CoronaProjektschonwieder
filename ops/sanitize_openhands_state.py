from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> dict[str, Any] | None:
    try:
        raw = path.read_text(encoding="utf-8")
        return json.loads(raw)
    except FileNotFoundError:
        return None
    except Exception:
        return None


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _sanitize_payload(
    payload: dict[str, Any],
    fallback_llm_api_key: str,
) -> tuple[dict[str, Any], list[str]]:
    fixes: list[str] = []
    updated = dict(payload)

    security_analyzer = updated.get("security_analyzer")
    if isinstance(security_analyzer, str):
        normalized = security_analyzer.strip().lower()
        if normalized in {"invariant", ""}:
            updated["security_analyzer"] = None
            fixes.append("security_analyzer->null")

    if fallback_llm_api_key and not str(updated.get("llm_api_key") or "").strip():
        updated["llm_api_key"] = fallback_llm_api_key
        fixes.append("llm_api_key->fallback")

    return updated, fixes


def sanitize_state(
    state_root: Path,
    evidence_dir: Path,
    fallback_llm_api_key: str,
) -> dict[str, Any]:
    timestamp = datetime.now(timezone.utc).isoformat()
    results: dict[str, Any] = {
        "status": "ok",
        "timestamp": timestamp,
        "state_root": str(state_root),
        "files_checked": 0,
        "files_changed": 0,
        "changed_files": [],
        "warnings": [],
    }

    candidates: list[Path] = [state_root / "settings.json"]
    candidates.extend((state_root / "sessions").glob("*/init.json"))

    for path in candidates:
        results["files_checked"] += 1
        payload = _load_json(path)
        if payload is None:
            results["warnings"].append(f"unreadable_or_missing:{path}")
            continue

        sanitized, fixes = _sanitize_payload(payload, fallback_llm_api_key)
        if fixes and sanitized != payload:
            _write_json(path, sanitized)
            results["files_changed"] += 1
            results["changed_files"].append(
                {
                    "path": str(path),
                    "fixes": fixes,
                }
            )

    evidence_dir.mkdir(parents=True, exist_ok=True)
    evidence_path = evidence_dir / "openhands_state_sanitize_latest.json"
    _write_json(evidence_path, results)
    results["evidence_path"] = str(evidence_path)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sanitize OpenHands persisted state to avoid stale analyzer/session crashes."
    )
    parser.add_argument(
        "--state-root",
        required=True,
        help="Path to ~/.openhands-state on the host",
    )
    parser.add_argument(
        "--evidence-dir",
        required=True,
        help="Directory to write sanitizer evidence JSON",
    )
    parser.add_argument(
        "--fallback-llm-api-key",
        default="",
        help="Optional fallback value used when persisted llm_api_key is empty",
    )
    args = parser.parse_args()

    state_root = Path(args.state_root).expanduser().resolve()
    evidence_dir = Path(args.evidence_dir).expanduser().resolve()
    report = sanitize_state(
        state_root=state_root,
        evidence_dir=evidence_dir,
        fallback_llm_api_key=args.fallback_llm_api_key.strip(),
    )
    print(
        f"OPENHANDS STATE SANITIZED: checked={report['files_checked']} "
        f"changed={report['files_changed']} evidence={report['evidence_path']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
