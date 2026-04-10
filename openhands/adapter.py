from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import requests
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="GODMODE OpenHands Adapter")


class MissionPayload(BaseModel):
    agent: str = Field(default="OpenHands")
    task: str
    source: str = Field(default_factory=lambda: os.environ.get("GODMODE_SOURCE", "unknown"))
    repo: str = Field(default_factory=lambda: os.environ.get("GITHUB_REPO_URL", ""))
    ref: str = "main"
    status: str = "queued"
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class DevtoolsPayload(BaseModel):
    command: list[str] | None = None
    include_unit_tests: bool = False
    force_run: bool = False


@app.get("/")
def root() -> dict[str, Any]:
    return {"status": "online", "service": "openhands-adapter"}


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "healthy",
        "public_url": os.environ.get("OPENHANDS_PUBLIC_URL"),
        "trigger_url": os.environ.get("OPENHANDS_TRIGGER_URL") or "",
        "devtools_bridge_url": os.environ.get("DEVTOOLS_BRIDGE_URL") or "",
    }


def _forward_to_devtools(endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    bridge_url = os.environ.get("DEVTOOLS_BRIDGE_URL", "").strip()
    timeout = int(os.environ.get("DEVTOOLS_BRIDGE_TIMEOUT", "900"))

    if not bridge_url:
        return {
            "status": "blocked",
            "reason": "DEVTOOLS_BRIDGE_URL is empty",
            "forwarded": False,
            "endpoint": endpoint,
            "payload": payload,
        }

    target_url = f"{bridge_url.rstrip('/')}/{endpoint.lstrip('/')}"
    try:
        response = requests.post(target_url, json=payload, timeout=timeout)
        response.raise_for_status()
        return {
            "status": "forwarded",
            "forwarded": True,
            "target_url": target_url,
            "target_status": response.status_code,
            "data": response.json(),
        }
    except requests.RequestException as exc:
        return {
            "status": "forward-failed",
            "forwarded": False,
            "target_url": target_url,
            "error": str(exc),
            "payload": payload,
        }


@app.post("/trigger")
def trigger(payload: MissionPayload) -> dict[str, Any]:
    trigger_url = os.environ.get("OPENHANDS_TRIGGER_URL", "").strip()
    api_key = os.environ.get("OPENHANDS_API_KEY", "").strip()

    if not trigger_url:
        return {
            "status": "accepted-local",
            "forwarded": False,
            "payload": payload.model_dump(),
        }

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        response = requests.post(
            trigger_url,
            headers=headers,
            json=payload.model_dump(),
            timeout=15,
        )
        response.raise_for_status()
        return {
            "status": "forwarded",
            "forwarded": True,
            "target_status": response.status_code,
            "payload": payload.model_dump(),
        }
    except requests.RequestException as exc:
        return {
            "status": "forward-failed",
            "forwarded": False,
            "error": str(exc),
            "payload": payload.model_dump(),
        }


@app.post("/run_playwright")
def run_playwright(payload: DevtoolsPayload) -> dict[str, Any]:
    return _forward_to_devtools("/run_playwright", payload.model_dump())


@app.post("/run_devtools")
def run_devtools(payload: DevtoolsPayload) -> dict[str, Any]:
    return _forward_to_devtools("/run_devtools", payload.model_dump())


@app.post("/snapshot_devtools")
def snapshot_devtools(payload: DevtoolsPayload) -> dict[str, Any]:
    return _forward_to_devtools("/snapshot_devtools", payload.model_dump())
