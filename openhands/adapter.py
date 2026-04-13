from __future__ import annotations
import json
import os
import time
from datetime import datetime, timezone
from typing import Any

import requests
import socketio
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="GODMODE OpenHands Adapter")
STARTED_AT = datetime.now(timezone.utc).isoformat()
METRICS: dict[str, Any] = {
    "requests_total": 0,
    "forwarded_total": 0,
    "blocked_total": 0,
    "failed_total": 0,
    "by_endpoint": {
        "trigger": 0,
        "run_playwright": 0,
        "run_devtools": 0,
        "snapshot_devtools": 0,
    },
}


def _record_result(status: str) -> None:
    METRICS["requests_total"] += 1
    if status == "forwarded":
        METRICS["forwarded_total"] += 1
    elif status == "blocked":
        METRICS["blocked_total"] += 1
    else:
        METRICS["failed_total"] += 1


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
        "api_url": _resolve_openhands_api_url(),
        "trigger_url": os.environ.get("OPENHANDS_TRIGGER_URL") or "",
        "trigger_mode": os.environ.get("OPENHANDS_TRIGGER_MODE", "socketio").strip().lower() or "socketio",
        "trigger_wait_seconds": int(os.environ.get("OPENHANDS_TRIGGER_WAIT_SECONDS", "45")),
        "devtools_bridge_url": os.environ.get("DEVTOOLS_BRIDGE_URL") or "",
    }


@app.get("/metrics")
def metrics() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "openhands-adapter",
        "started_at": STARTED_AT,
        "metrics": METRICS,
    }


def _safe_json_from_response(response: requests.Response) -> dict[str, Any]:
    try:
        return response.json()
    except ValueError:
        body = response.text.strip()
        return {"raw": body[:2000]} if body else {}


def _forward_to_devtools(endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    bridge_url = os.environ.get("DEVTOOLS_BRIDGE_URL", "").strip()
    timeout = int(os.environ.get("DEVTOOLS_BRIDGE_TIMEOUT", "900"))

    if not bridge_url:
        _record_result("blocked")
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
        response_body = _safe_json_from_response(response)
        if response.status_code == 200:
            _record_result("forwarded")
            return {
                "status": "forwarded",
                "forwarded": True,
                "target_url": target_url,
                "target_status": response.status_code,
                "data": response_body,
            }

        hint = ""
        body_raw = str(response_body.get("raw", ""))
        if "already used" in body_raw or "reuseExistingServer" in body_raw:
            hint = (
                "Playwright webServer port conflict detected. "
                "Set reuseExistingServer=true or stop the process that already listens on port 4173."
            )
        _record_result("forward-failed")
        return {
            "status": "forward-failed",
            "forwarded": False,
            "target_url": target_url,
            "target_status": response.status_code,
            "response": response_body,
            "recovery_hint": hint,
            "payload": payload,
        }
    except requests.RequestException as exc:
        _record_result("forward-failed")
        return {
            "status": "forward-failed",
            "forwarded": False,
            "target_url": target_url,
            "error": str(exc),
            "payload": payload,
        }


def _resolve_openhands_api_url() -> str:
    api_url = os.environ.get("OPENHANDS_API_URL", "").strip()
    if api_url:
        return api_url.rstrip("/")
    public_url = os.environ.get("OPENHANDS_PUBLIC_URL", "").strip()
    return public_url.rstrip("/")


def _trigger_http(payload: MissionPayload, trigger_url: str, api_key: str) -> dict[str, Any]:
    if not trigger_url:
        return {
            "status": "blocked",
            "forwarded": False,
            "reason": "OPENHANDS_TRIGGER_URL is empty for http mode",
        }

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        response = requests.post(
            trigger_url,
            headers=headers,
            json=payload.model_dump(),
            timeout=30,
        )
        response_body = _safe_json_from_response(response)
        if response.status_code != 200:
            return {
                "status": "forward-failed",
                "forwarded": False,
                "target_status": response.status_code,
                "response": response_body,
                "target_url": trigger_url,
            }
        return {
            "status": "forwarded",
            "forwarded": True,
            "target_status": response.status_code,
            "response": response_body,
            "target_url": trigger_url,
        }
    except requests.RequestException as exc:
        return {
            "status": "forward-failed",
            "forwarded": False,
            "error": str(exc),
            "target_url": trigger_url,
        }


def _trigger_socketio(payload: MissionPayload, api_url: str, wait_seconds: int, socket_path: str) -> dict[str, Any]:
    if not api_url:
        return {
            "status": "blocked",
            "forwarded": False,
            "reason": "OPENHANDS_API_URL/OPENHANDS_PUBLIC_URL is empty for socketio mode",
        }

    api_key = os.environ.get("OPENHANDS_API_KEY", "").strip()
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    conversation_payload: dict[str, Any] = {
        "github_token": "",
        "latest_event_id": -1,
        "selected_repository": None,
        "args": {},
    }
    try:
        create_response = requests.post(
            f"{api_url}/api/conversations",
            headers=headers,
            json=conversation_payload,
            timeout=20,
        )
        create_body = _safe_json_from_response(create_response)
        if create_response.status_code != 200:
            return {
                "status": "forward-failed",
                "forwarded": False,
                "reason": "conversation-create-failed",
                "http_status": create_response.status_code,
                "response": create_body,
                "api_url": api_url,
            }
        conversation_id = str(create_body.get("conversation_id", "")).strip()
        if not conversation_id:
            return {
                "status": "forward-failed",
                "forwarded": False,
                "reason": "conversation_id missing in OpenHands response",
                "response": create_body,
                "api_url": api_url,
            }
    except requests.RequestException as exc:
        return {
            "status": "forward-failed",
            "forwarded": False,
            "reason": "conversation-create-network-error",
            "error": str(exc),
            "api_url": api_url,
        }

    sio = socketio.Client(logger=False, engineio_logger=False, reconnection=False)
    received_events: list[dict[str, Any]] = []
    connection_errors: list[str] = []

    @sio.on("oh_event")
    def _on_oh_event(data: Any) -> None:
        if isinstance(data, dict):
            received_events.append(data)
        else:
            received_events.append({"raw": str(data)})

    @sio.event
    def connect_error(data: Any) -> None:  # type: ignore[no-redef]
        connection_errors.append(str(data))

    socket_ready = False
    try:
        query_glue = "&" if "?" in api_url else "?"
        socket_url = f"{api_url}{query_glue}conversation_id={conversation_id}&latest_event_id=-1"
        sio.connect(
            socket_url,
            transports=["websocket"],
            socketio_path=socket_path.lstrip("/"),
            wait=True,
            wait_timeout=min(max(wait_seconds, 5), 30),
            auth={"github_token": ""},
        )
        socket_ready = sio.connected
        if not socket_ready:
            return {
                "status": "forward-failed",
                "forwarded": False,
                "reason": "socket-not-connected",
                "conversation_id": conversation_id,
                "errors": connection_errors,
                "api_url": api_url,
            }

        action_payload = {
            "action": "message",
            "args": {
                "content": payload.task,
                "wait_for_response": True,
            },
            "source": "user",
        }
        sio.emit("oh_action", action_payload)

        deadline = time.time() + wait_seconds
        while time.time() < deadline:
            if received_events:
                break
            time.sleep(0.2)

        search_preview: dict[str, Any] = {}
        try:
            search_response = requests.get(
                f"{api_url}/api/conversations/{conversation_id}/events/search",
                headers=headers,
                params={"start_id": 0, "limit": 5},
                timeout=15,
            )
            search_preview = {
                "status": search_response.status_code,
                "body": _safe_json_from_response(search_response),
            }
        except requests.RequestException as exc:
            search_preview = {"status": 0, "error": str(exc)}

        if received_events:
            return {
                "status": "forwarded",
                "forwarded": True,
                "mode": "socketio",
                "conversation_id": conversation_id,
                "event_count": len(received_events),
                "events_preview": received_events[:5],
                "events_search": search_preview,
                "api_url": api_url,
            }

        return {
            "status": "blocked",
            "forwarded": False,
            "reason": "no-oh_event-received-within-timeout",
            "mode": "socketio",
            "conversation_id": conversation_id,
            "wait_seconds": wait_seconds,
            "events_search": search_preview,
            "api_url": api_url,
        }
    except Exception as exc:
        return {
            "status": "forward-failed",
            "forwarded": False,
            "reason": "socketio-trigger-error",
            "error": str(exc),
            "conversation_id": locals().get("conversation_id", ""),
            "errors": connection_errors,
            "api_url": api_url,
        }
    finally:
        if socket_ready and sio.connected:
            try:
                sio.disconnect()
            except Exception:
                pass


@app.post("/trigger")
def trigger(payload: MissionPayload) -> dict[str, Any]:
    METRICS["by_endpoint"]["trigger"] += 1
    trigger_url = os.environ.get("OPENHANDS_TRIGGER_URL", "").strip()
    api_key = os.environ.get("OPENHANDS_API_KEY", "").strip()
    trigger_mode = os.environ.get("OPENHANDS_TRIGGER_MODE", "socketio").strip().lower() or "socketio"
    wait_seconds = int(os.environ.get("OPENHANDS_TRIGGER_WAIT_SECONDS", "45"))
    wait_seconds = max(5, min(wait_seconds, 180))
    socket_path = os.environ.get("OPENHANDS_SOCKET_PATH", "/socket.io").strip() or "/socket.io"
    api_url = _resolve_openhands_api_url()

    result: dict[str, Any]
    if trigger_mode == "http":
        result = _trigger_http(payload, trigger_url=trigger_url, api_key=api_key)
    else:
        result = _trigger_socketio(
            payload=payload,
            api_url=api_url,
            wait_seconds=wait_seconds,
            socket_path=socket_path,
        )
        if result.get("status") != "forwarded" and trigger_url:
            fallback = _trigger_http(payload, trigger_url=trigger_url, api_key=api_key)
            result["http_fallback"] = fallback
            if fallback.get("status") == "forwarded":
                result = {
                    "status": "forwarded",
                    "forwarded": True,
                    "mode": "http-fallback",
                    "reason": "socketio-failed-http-forwarded",
                    "socketio": result,
                    "http": fallback,
                }

    final_status = str(result.get("status", "forward-failed"))
    if final_status == "forwarded":
        _record_result("forwarded")
    elif final_status == "blocked":
        _record_result("blocked")
    else:
        _record_result("forward-failed")

    result["trigger_mode"] = trigger_mode
    result["payload"] = payload.model_dump()
    return result


@app.post("/run_playwright")
def run_playwright(payload: DevtoolsPayload) -> dict[str, Any]:
    METRICS["by_endpoint"]["run_playwright"] += 1
    return _forward_to_devtools("/run_playwright", payload.model_dump())


@app.post("/run_devtools")
def run_devtools(payload: DevtoolsPayload) -> dict[str, Any]:
    METRICS["by_endpoint"]["run_devtools"] += 1
    return _forward_to_devtools("/run_devtools", payload.model_dump())


@app.post("/snapshot_devtools")
def snapshot_devtools(payload: DevtoolsPayload) -> dict[str, Any]:
    METRICS["by_endpoint"]["snapshot_devtools"] += 1
    return _forward_to_devtools("/snapshot_devtools", payload.model_dump())
