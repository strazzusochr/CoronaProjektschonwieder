from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path("d:/Web/docs/godmode_setup")

SKIP_DIR_NAMES = {
    ".git",
    ".venv",
    "node_modules",
    ".next",
    "dist",
    "build",
}

KEYWORD_PATTERNS = [
    "HETZNER_API_TOKEN",
    "HF_TOKEN",
    "GITHUB_TOKEN",
    "OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY",
    "LITELLM_API_KEY",
    "ROOT_PASSWORD",
    "PASSWORD",
]

PLACEHOLDER_MARKERS = (
    "replace-with-",
    "dummy",
    "example",
    "unset",
    '""',
)

ROTATION_ACK_FIELDS = [
    "ROTATED_HETZNER_TOKEN_AT",
    "ROTATED_HF_TOKEN_AT",
    "ROTATED_GITHUB_TOKEN_AT",
    "ROTATED_ROOT_PASSWORD_AT",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_evidence_dir() -> Path:
    candidates = [
        REPO_ROOT / ".godmode_runtime" / "evidence",
        REPO_ROOT / "proofs",
    ]
    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            probe = candidate / ".write_test"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            return candidate
        except Exception:
            continue
    return REPO_ROOT / "proofs"


def should_scan(path: Path) -> bool:
    for part in path.parts:
        if part in SKIP_DIR_NAMES:
            return False
    if path.suffix.lower() == ".pyc":
        return False
    return True


def looks_like_hardcoded_secret(value: str) -> bool:
    normalized = value.strip().lower()
    if not normalized:
        return False
    if "$" in normalized:
        return False
    if normalized.startswith("http://") or normalized.startswith("https://"):
        return False
    return not any(marker in normalized for marker in PLACEHOLDER_MARKERS)


def tracked_files() -> set[Path]:
    try:
        output = subprocess.check_output(
            ["git", "-C", str(REPO_ROOT), "ls-files"],
            text=True,
        )
    except Exception:
        return set()
    items = set()
    for line in output.splitlines():
        line = line.strip()
        if line:
            items.add((REPO_ROOT / line).resolve())
    return items


def scan_for_exposed_values(tracked: set[Path]) -> list[dict]:
    findings = []
    for file_path in REPO_ROOT.rglob("*"):
        if not file_path.is_file() or not should_scan(file_path):
            continue
        if tracked and file_path.resolve() not in tracked:
            continue
        if file_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".zip", ".ico", ".woff", ".woff2"}:
            continue
        try:
            lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
        except Exception:
            continue
        for idx, line in enumerate(lines, start=1):
            candidate = line.strip()
            if not candidate or candidate.startswith("#"):
                continue
            if any(keyword in candidate for keyword in KEYWORD_PATTERNS):
                assignment = re.search(
                    r"(?:export\s+)?([A-Z0-9_]+)\s*[:=]\s*(.+)$",
                    candidate,
                )
                if not assignment:
                    continue
                key = assignment.group(1).strip()
                if key not in KEYWORD_PATTERNS:
                    continue
                raw_value = assignment.group(2).strip().strip('"').strip("'")
                if "$env:" in raw_value or "${" in raw_value:
                    continue
                if "os.environ" in raw_value or ".get(" in raw_value:
                    continue
                if looks_like_hardcoded_secret(raw_value):
                    findings.append(
                        {
                            "file": str(file_path),
                            "line": idx,
                            "content_preview": candidate[:200],
                        }
                    )
    return findings


def detect_local_env_secrets() -> list[dict]:
    local_env = REPO_ROOT / ".godmode_env"
    findings = []
    if not local_env.exists():
        return findings
    lines = local_env.read_text(encoding="utf-8", errors="replace").splitlines()
    for idx, line in enumerate(lines, start=1):
        candidate = line.strip()
        if not candidate or candidate.startswith("#"):
            continue
        assignment = re.search(r"(?:export\s+)?([A-Z0-9_]+)\s*[:=]\s*(.+)$", candidate)
        if not assignment:
            continue
        key = assignment.group(1).strip()
        value = assignment.group(2).strip().strip('"').strip("'")
        if key not in KEYWORD_PATTERNS:
            continue
        if looks_like_hardcoded_secret(value):
            findings.append(
                {
                    "file": str(local_env),
                    "line": idx,
                    "key": key,
                }
            )
    return findings


def collect_rotation_acks() -> dict[str, str]:
    local_env = REPO_ROOT / ".godmode_env"
    values = {key: "" for key in ROTATION_ACK_FIELDS}
    if not local_env.exists():
        return values
    text = local_env.read_text(encoding="utf-8", errors="replace")
    for key in ROTATION_ACK_FIELDS:
        match = re.search(rf"^\s*export\s+{re.escape(key)}\s*=\s*\"?([^\r\n\"]+)\"?", text, re.MULTILINE)
        if match:
            values[key] = match.group(1).strip()
    return values


def main() -> int:
    timestamp = now_iso()
    evidence_dir = resolve_evidence_dir()
    tracked = tracked_files()
    findings = scan_for_exposed_values(tracked)
    local_env_findings = detect_local_env_secrets()
    rotation_acks = collect_rotation_acks()
    ack_complete = all(rotation_acks.values())

    if findings:
        status = "BLOCKED"
        summary = "Exposed token-like values detected in tracked files."
    elif not ack_complete:
        status = "PARTIAL"
        summary = (
            "No tracked secret leaks found, but rotation acknowledgements are incomplete. "
            "Security rotation remains an operator action."
        )
    else:
        status = "PASS"
        summary = (
            "No tracked secret leaks found and rotation acknowledgements are complete. "
            "Local .godmode_env secrets are expected local-only state."
        )

    report = {
        "timestamp": timestamp,
        "status": status,
        "summary": summary,
        "tracked_findings": findings,
        "local_env_findings": local_env_findings,
        "local_env_findings_count": len(local_env_findings),
        "rotation_ack_fields": rotation_acks,
        "rotation_ack_complete": ack_complete,
        "notes": [
            "Real token/password rotation cannot be faked by repo edits.",
            "When acknowledgements are missing, status must not be elevated to PASS.",
        ],
    }

    evidence_dir.mkdir(parents=True, exist_ok=True)
    stamp = timestamp.replace(":", "-").replace(".", "-")
    out_file = evidence_dir / f"security_rotation_check_{stamp}.json"
    latest_file = evidence_dir / "security_rotation_check_latest.json"
    snapshot_written = True
    snapshot_error = ""
    try:
        out_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")
        latest_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")
    except PermissionError as exc:
        snapshot_written = False
        snapshot_error = str(exc)

    print(
        json.dumps(
            {
                "status": "ok",
                "security_status": status,
                "snapshot": str(out_file),
                "snapshot_written": snapshot_written,
                "snapshot_write_error": snapshot_error,
                "tracked_findings": len(findings),
                "local_env_findings": len(local_env_findings),
                "rotation_ack_complete": ack_complete,
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
