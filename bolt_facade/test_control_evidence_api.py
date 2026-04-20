from __future__ import annotations

import importlib.util
import json
import os
import tempfile
import time
import types
import unittest
import uuid
from pathlib import Path

from fastapi.testclient import TestClient


APP_PATH = Path(__file__).resolve().parent / "app.py"


def _load_app_module(module_name: str) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(module_name, APP_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {APP_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class BoltFacadeControlEvidenceApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        root = Path(self.temp_dir.name)
        repo_root = root / "repo"
        runtime_dir = root / "runtime" / "bolt_facade"
        evidence_dir = root / "runtime" / "evidence"
        repo_root.mkdir(parents=True, exist_ok=True)
        runtime_dir.mkdir(parents=True, exist_ok=True)
        evidence_dir.mkdir(parents=True, exist_ok=True)

        (repo_root / "agent_registry.json").write_text(json.dumps({"active_agents": [], "legacy_agents": []}), encoding="utf-8")
        (repo_root / "platform7_contract.json").write_text(
            json.dumps(
                {
                    "roles": [],
                    "status_model": [],
                    "maturity_model": [],
                    "required_supervisor_namespaces": ["sentinel_truth", "sentinel_runtime"],
                    "autonomy_profiles": [],
                }
            ),
            encoding="utf-8",
        )
        for filename in ("memory_vault.md", "FINAL_PROOF.md", "GODMODE_GOAL.md"):
            (repo_root / filename).write_text("fixture\n", encoding="utf-8")

        self._env_backup = {key: os.environ.get(key) for key in self._env_keys()}
        self.addCleanup(self._restore_env)
        os.environ["GODMODE_REPO_ROOT"] = str(repo_root)
        os.environ["BOLTDIY_RUNTIME_DIR"] = str(runtime_dir)
        os.environ["GODMODE_EVIDENCE_DIR"] = str(evidence_dir)
        os.environ["AGENT_REGISTRY_PATH"] = str(repo_root / "agent_registry.json")
        os.environ["PLATFORM7_CONTRACT_PATH"] = str(repo_root / "platform7_contract.json")
        os.environ["MEMORY_VAULT_PATH"] = str(repo_root / "memory_vault.md")
        os.environ["FINAL_PROOF_PATH"] = str(repo_root / "FINAL_PROOF.md")
        os.environ["GODMODE_GOAL_PATH"] = str(repo_root / "GODMODE_GOAL.md")

        self.module = _load_app_module(f"bolt_facade_test_app_{uuid.uuid4().hex}")
        self.module._target_health_status = lambda *_args, **_kwargs: {}
        self.client = TestClient(self.module.app)

    def _restore_env(self) -> None:
        for key, value in self._env_backup.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    @staticmethod
    def _env_keys() -> tuple[str, ...]:
        return (
            "GODMODE_REPO_ROOT",
            "BOLTDIY_RUNTIME_DIR",
            "GODMODE_EVIDENCE_DIR",
            "AGENT_REGISTRY_PATH",
            "PLATFORM7_CONTRACT_PATH",
            "MEMORY_VAULT_PATH",
            "FINAL_PROOF_PATH",
            "GODMODE_GOAL_PATH",
            "HF_AIDER_URL",
            "HF_AIDER_SPACE_URL",
            "HF_AIDER_DISPATCH_URL",
            "SMOLAGENTS_URL",
            "HF_SMOLAGENTS_SPACE_URL",
            "OLLAMAHF_BASE_URL",
            "OLLAMAHF_BEARER_TOKEN",
            "GLOBAL_ROUTING_OVERRIDE_TTL_SECONDS",
        )

    def _seed_running_run(self) -> dict:
        record = self.module._new_agent_chain_record(
            goal="Harden bolt facade state handling",
            profile_id="app_builder",
            profile_label="App Builder",
            agents=["backend_platform"],
        )
        record["status"] = "RUNNING"
        record["reason"] = "Run accepted; agent chain is executing in the background."
        record["next_action"] = "Monitor live timeline and keep supervisors active."
        record["current_step"] = 1
        record["current_agent"] = "backend_platform"
        record["steps"] = [
            {
                "step": 1,
                "agent": "backend_platform",
                "trace_id": record["trace_id"],
                "task_id": record["task_id"],
                "step_id": f"{record['run_id']}-step-1",
                "status": "running",
                "raw_status": "running",
                "runtime_target": "hf-aider",
                "dispatch_artifact": "",
                "reason": "Initial execution in progress.",
                "next_action": "Monitor live timeline and keep supervisors active.",
                "http_status": 200,
                "response_excerpt": "",
                "started_at": self.module._now_iso(),
                "finished_at": "",
            }
        ]
        self.module._persist_agent_chain_record(record)
        return record

    def test_run_control_updates_run_evidence_and_control_center_consistently(self) -> None:
        record = self._seed_running_run()

        pause_response = self.client.post(
            f"/runs/{record['run_id']}/pause",
            json={"source": "integration-test", "reason": "Awaiting supervisor review."},
        )
        self.assertEqual(pause_response.status_code, 200)
        pause_payload = pause_response.json()
        self.assertEqual(pause_payload["run_status"], "PAUSED")
        self.assertGreaterEqual(int(pause_payload.get("control_version", 0)), 1)
        self.assertEqual(pause_payload["reason"], "Awaiting supervisor review.")
        self.assertEqual(pause_payload["next_action"], "Use resume when dependency is cleared.")

        run_after_pause = self.client.get(f"/runs/{record['run_id']}").json()["run"]
        self.assertEqual(run_after_pause["status"], "PAUSED")
        self.assertEqual(run_after_pause["reason"], "Awaiting supervisor review.")
        self.assertEqual(run_after_pause["next_action"], "Use resume when dependency is cleared.")
        self.assertEqual(run_after_pause["steps"][-1]["status"], "paused")
        self.assertEqual(run_after_pause["steps"][-1]["next_action"], "Use resume when dependency is cleared.")

        evidence_payload = self.client.get(f"/runs/{record['run_id']}/evidence").json()
        self.assertEqual(evidence_payload["reason"], "Awaiting supervisor review.")
        self.assertEqual(evidence_payload["next_action"], "Use resume when dependency is cleared.")
        self.assertTrue(evidence_payload["evidence_manifest_latest_endpoint"].startswith("/evidence/manifests/"))

        control_center = self.client.get("/control-center/state?fresh=true").json()
        self.assertEqual(control_center["active_execution"]["current_state"], "Waiting")
        self.assertEqual(control_center["active_execution"]["reason"], "Awaiting supervisor review.")
        self.assertEqual(control_center["active_execution"]["next_action"], "Use resume when dependency is cleared.")

        resume_response = self.client.post(
            f"/runs/{record['run_id']}/resume",
            json={"source": "integration-test", "reason": "Dependency cleared."},
        )
        self.assertEqual(resume_response.status_code, 200)
        resume_payload = resume_response.json()
        self.assertEqual(resume_payload["run_status"], "RUNNING")
        self.assertGreater(int(resume_payload.get("control_version", 0)), int(pause_payload.get("control_version", 0)))
        self.assertEqual(resume_payload["reason"], "Dependency cleared.")

        run_after_resume = self.client.get(f"/runs/{record['run_id']}").json()["run"]
        self.assertEqual(run_after_resume["steps"][-1]["status"], "running")
        self.assertEqual(run_after_resume["reason"], "Dependency cleared.")

    def test_manifest_endpoint_serves_latest_manifest_for_seeded_run(self) -> None:
        record = self._seed_running_run()
        stop_response = self.client.post(
            f"/runs/{record['run_id']}/stop",
            json={"source": "integration-test", "reason": "Operator stopped the run."},
        )
        self.assertEqual(stop_response.status_code, 200)

        evidence_payload = self.client.get(f"/runs/{record['run_id']}/evidence").json()
        manifest_endpoint = evidence_payload["evidence_manifest_latest_endpoint"]
        manifest_response = self.client.get(manifest_endpoint)
        self.assertEqual(manifest_response.status_code, 200)
        manifest_payload = manifest_response.json()
        self.assertEqual(manifest_payload["run_id"], record["run_id"])
        self.assertEqual(manifest_payload["run_status"], "STOPPED")
        self.assertIn("validation", manifest_payload)

    def test_agent_chain_honors_operator_stop_before_next_dispatch_step(self) -> None:
        record = self.module._new_agent_chain_record(
            goal="Stop should abort further dispatches",
            profile_id="app_builder",
            profile_label="App Builder",
            agents=["backend_platform", "multiplayer_netcode"],
        )
        self.module._persist_agent_chain_record(record)
        run_id = record["run_id"]
        dispatch_calls = 0

        def fake_dispatch(_mission):
            nonlocal dispatch_calls
            dispatch_calls += 1
            if dispatch_calls == 1:
                self.module._execute_run_control_action(
                    run_id,
                    "stop",
                    self.module.RunControlRequest(
                        source="integration-test",
                        reason="Abort run after first step.",
                    ),
                )
            return {
                "status": "forwarded",
                "call_id": f"call-{dispatch_calls}",
                "runtime_target": "hf-aider",
                "dispatch_artifact": f"/tmp/dispatch-{dispatch_calls}.json",
                "result": {"http_status": 200, "response": {"ok": True}},
            }

        self.module.dispatch = fake_dispatch
        result = self.module._execute_agent_chain_record(
            record,
            source="integration-test",
            repo="strazzusochr/CoronaProjektschonwieder",
            ref="main",
            status="queued",
            halt_on_fail=False,
        )

        self.assertEqual(dispatch_calls, 1)
        self.assertEqual(result["status"], "STOPPED")
        self.assertEqual(result["reason"], "Abort run after first step.")
        self.assertEqual(result["current_agent"], "")
        self.assertEqual(len(result["steps"]), 1)
        latest_event = self.module._latest_json(self.module.CONTROL_EVENT_DIR / "latest.json")
        self.assertEqual(latest_event.get("action"), "agent-chain-halted")
        self.assertEqual(str(latest_event.get("state", "")).upper(), "STOPPED")

    def test_agent_chain_honors_operator_stop_before_mission_dispatch_window(self) -> None:
        record = self.module._new_agent_chain_record(
            goal="Stop should abort before mission dispatch",
            profile_id="app_builder",
            profile_label="App Builder",
            agents=["backend_platform", "multiplayer_netcode"],
        )
        self.module._persist_agent_chain_record(record)
        run_id = record["run_id"]
        original_persist = self.module._persist_agent_chain_record
        stop_issued = {"value": False}

        def wrapped_persist(run_record: dict) -> None:
            original_persist(run_record)
            if (
                not stop_issued["value"]
                and str(run_record.get("status", "")).upper() == "RUNNING"
                and int(run_record.get("current_step", 0) or 0) == 1
                and str(run_record.get("current_agent", "")).strip() == "backend_platform"
            ):
                stop_issued["value"] = True
                self.module._execute_run_control_action(
                    run_id,
                    "stop",
                    self.module.RunControlRequest(
                        source="integration-test",
                        reason="Stop before mission dispatch.",
                    ),
                )

        def fail_dispatch(_mission):
            raise AssertionError("dispatch should not run after stop is issued in pre-mission window")

        self.module._persist_agent_chain_record = wrapped_persist
        self.module.dispatch = fail_dispatch
        result = self.module._execute_agent_chain_record(
            record,
            source="integration-test",
            repo="strazzusochr/CoronaProjektschonwieder",
            ref="main",
            status="queued",
            halt_on_fail=False,
        )

        self.assertTrue(stop_issued["value"])
        self.assertEqual(result["status"], "STOPPED")
        self.assertEqual(result["reason"], "Stop before mission dispatch.")
        self.assertEqual(result["current_agent"], "")
        self.assertEqual(len(result["steps"]), 1)

    def test_control_center_exposes_storage_and_maintenance_payloads(self) -> None:
        response = self.client.get("/control-center/state?fresh=true")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("storage", payload)
        self.assertIn("maintenance", payload)
        self.assertIn("buckets", payload["storage"])
        self.assertIn("recovery_runbook", payload["maintenance"])

    def test_bootstrap_status_omits_masked_token_fingerprints(self) -> None:
        self.module._HF_TOKEN = "hf_example_secret_value"
        self.module.BOLTDIY_SPACE_TOKEN = "hf_example_secret_value"
        self.module.OLLAMAHF_BEARER_TOKEN = "bearer-example"
        self.module.OLLAMAHF_MASTER_KEY = "master-example"

        payload = self.module._bootstrap_status("boot-test", "integration-test", include_script_start=False)

        self.assertTrue(payload["tokens"]["hf_token_present"])
        self.assertNotIn("masked_hf_token", payload["tokens"])

    def test_normalize_hf_space_url_converts_huggingface_space_base_and_suffix(self) -> None:
        normalize = self.module._normalize_hf_space_url
        self.assertEqual(
            normalize("https://huggingface.co/spaces/Wrzzzrzr/aider-godmode-safe"),
            "https://wrzzzrzr-aider-godmode-safe.hf.space",
        )
        self.assertEqual(
            normalize("https://huggingface.co/spaces/Wrzzzrzr/aider-godmode-safe/gradio_api/run/build_outputs"),
            "https://wrzzzrzr-aider-godmode-safe.hf.space/gradio_api/run/build_outputs",
        )
        self.assertEqual(
            normalize("https://wrzzzrzr-aider-godmode-safe.hf.space/gradio_api/run/build_outputs"),
            "https://wrzzzrzr-aider-godmode-safe.hf.space/gradio_api/run/build_outputs",
        )

    def test_dispatch_hf_aider_uses_normalized_hf_space_target(self) -> None:
        self.module.HF_AIDER_URL = "https://huggingface.co/spaces/Wrzzzrzr/aider-godmode-safe"
        self.module.HF_AIDER_DISPATCH_URL = ""
        captured_urls: list[str] = []

        def fake_post_json(url: str, body: dict, timeout: int) -> dict:
            del body, timeout
            captured_urls.append(url)
            return {
                "status": "forwarded",
                "url": url,
                "http_status": 200,
                "response": {"ok": True},
            }

        self.module._post_json = fake_post_json
        payload = self.module.MissionPayload(
            agent="backend_platform",
            task="Build outputs with normalized HF endpoint",
            source="test",
            repo="strazzusochr/CoronaProjektschonwieder",
            ref="main",
            status="queued",
            timestamp=self.module._now_iso(),
        )
        result = self.module._dispatch_hf_aider(payload)

        self.assertEqual(result.get("status"), "forwarded")
        self.assertGreater(len(captured_urls), 0)
        for url in captured_urls:
            self.assertIn(".hf.space", url)
            self.assertNotIn("huggingface.co/spaces/", url)

    def test_dispatch_langgraph_probe_uses_health_endpoint(self) -> None:
        self.module.LANGGRAPH_API_INTERNAL_URL = "http://langgraph-godmode-local:8080"
        self.module.LANGGRAPH_API_URL = ""
        captured_urls: list[str] = []

        def fake_probe(url: str, timeout: int, headers: dict | None = None) -> dict:
            del timeout, headers
            captured_urls.append(url)
            return {"reachable": True, "url": url, "http_status": 200}

        def fail_post_json(*_args, **_kwargs) -> dict:
            raise AssertionError("_post_json should not be used for lightweight probe tasks")

        self.module._probe_url = fake_probe
        self.module._post_json = fail_post_json
        payload = self.module.MissionPayload(
            agent="local.langgraph.planner",
            task="Routing gate probe for langgraph-local",
            source="test",
            repo="strazzusochr/CoronaProjektschonwieder",
            ref="main",
            status="queued",
            timestamp=self.module._now_iso(),
        )
        result = self.module._dispatch_langgraph(payload)

        self.assertEqual(result.get("status"), "forwarded")
        self.assertEqual(result.get("probe_mode"), "health-lightweight")
        self.assertGreater(len(captured_urls), 0)
        self.assertTrue(captured_urls[0].endswith("/health"))

    def test_dispatch_ollamahf_probe_uses_models_health_endpoint(self) -> None:
        self.module.OLLAMAHF_BASE_URL = "https://example-ollamahf.hf.space"
        captured_urls: list[str] = []

        def fake_probe(url: str, timeout: int, headers: dict | None = None) -> dict:
            del timeout, headers
            captured_urls.append(url)
            return {"reachable": True, "url": url, "http_status": 200}

        def fail_post_json(*_args, **_kwargs) -> dict:
            raise AssertionError("_post_json should not be used for lightweight ollamahf probes")

        self.module._probe_url = fake_probe
        self.module._post_json = fail_post_json
        payload = self.module.MissionPayload(
            agent="external.ollamahf.solo_builder",
            task="Inventory verification probe for external.ollamahf.solo_builder",
            source="test",
            repo="strazzusochr/CoronaProjektschonwieder",
            ref="main",
            status="queued",
            timestamp=self.module._now_iso(),
        )
        result = self.module._dispatch_ollamahf(payload)

        self.assertEqual(result.get("status"), "forwarded")
        self.assertEqual(result.get("probe_mode"), "models-health-lightweight")
        self.assertGreater(len(captured_urls), 0)
        self.assertTrue(any(url.endswith("/v1/models") for url in captured_urls))

    def test_run_reroute_override_is_run_scoped_and_cleans_up_on_terminal_status(self) -> None:
        record = self._seed_running_run()
        self.module.ROUTING_OVERRIDE_STATE["mode"] = "auto"
        self.module.ROUTING_OVERRIDE_STATE["reason"] = "test-global-auto"

        reroute_response = self.client.post(
            f"/runs/{record['run_id']}/reroute/remote",
            json={"source": "integration-test", "reason": "run scoped override"},
        )
        self.assertEqual(reroute_response.status_code, 200)
        reroute_payload = reroute_response.json()
        self.assertEqual(reroute_payload.get("scope"), "run")
        self.assertEqual(reroute_payload.get("mode"), "remote")
        self.assertEqual(self.module.ROUTING_OVERRIDE_STATE.get("mode"), "auto")
        self.assertEqual(self.module._routing_mode_for_run(record["run_id"]), "remote")
        self.assertEqual(
            self.module._effective_runtime_target("langgraph-local", run_id=record["run_id"]),
            "ollama-hf-orchestrator",
        )
        self.assertEqual(
            self.module._effective_runtime_target("langgraph-local", run_id="another-run"),
            "langgraph-local",
        )

        stop_response = self.client.post(
            f"/runs/{record['run_id']}/stop",
            json={"source": "integration-test", "reason": "Stop run to trigger cleanup"},
        )
        self.assertEqual(stop_response.status_code, 200)
        self.assertEqual(self.module._routing_mode_for_run(record["run_id"]), "auto")

    def test_global_routing_override_has_ttl_metadata_and_expires_back_to_auto(self) -> None:
        response = self.client.post(
            "/routing/override",
            json={"mode": "remote", "source": "integration-test", "reason": "temporary remote triage"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        override = payload["override"]
        self.assertEqual(override["mode"], "remote")
        self.assertGreater(int(override.get("ttl_seconds", 0)), 0)
        self.assertGreater(float(override.get("seconds_remaining", 0.0)), 0.0)

        with self.module.ROUTING_OVERRIDE_LOCK:
            self.module.ROUTING_OVERRIDE_STATE["expires_at"] = time.time() - 1.0

        status_payload = self.client.get("/routing/status").json()
        expired_override = status_payload["override"]
        self.assertEqual(expired_override["mode"], "auto")
        self.assertTrue(expired_override["drift_prevented"])
        self.assertEqual(expired_override["previous_override"]["mode"], "remote")
        self.assertEqual(self.module._routing_mode_for_run(), "auto")

    def test_dispatch_ollamahf_blocks_stale_city_park_output_when_prompt_does_not_request_it(self) -> None:
        self.module.OLLAMAHF_BASE_URL = "https://example-ollamahf.hf.space"
        stale_html = (
            "<!DOCTYPE html><html><head><title>3D City Park Reference World</title></head>"
            "<body><h1>3D City Park Reference World</h1><p>Render-Loop Gefahr</p></body></html>"
        )

        def fake_post_json(url: str, body: dict, timeout: int, headers: dict | None = None) -> dict:
            del body, timeout, headers
            if url.endswith("/orchestrate"):
                return {
                    "status": "forwarded",
                    "url": url,
                    "http_status": 200,
                    "response": {"final_code": stale_html},
                }
            raise AssertionError(f"Unexpected endpoint in stale-output test: {url}")

        self.module._post_json = fake_post_json

        non_city_payload = self.module.MissionPayload(
            agent="external.ollamahf.solo_builder",
            task="Generate a neon cave arena with drones and zero city scenes.",
            source="test",
            repo="strazzusochr/CoronaProjektschonwieder",
            ref="main",
            status="queued",
            timestamp=self.module._now_iso(),
        )
        blocked = self.module._dispatch_ollamahf(non_city_payload)
        self.assertEqual(blocked.get("status"), "blocked")
        self.assertEqual(blocked.get("reason"), "prompt_fidelity_mismatch")
        self.assertTrue(str(blocked.get("final_code_artifact", "")).strip())

        city_payload = self.module.MissionPayload(
            agent="external.ollamahf.solo_builder",
            task="Create a 3D City Park reference world with navigation paths and skyline.",
            source="test",
            repo="strazzusochr/CoronaProjektschonwieder",
            ref="main",
            status="queued",
            timestamp=self.module._now_iso(),
        )
        allowed = self.module._dispatch_ollamahf(city_payload)
        self.assertEqual(allowed.get("status"), "forwarded")
        self.assertTrue(str(allowed.get("final_code_artifact", "")).strip())

    def test_monitor_probe_retries_public_once_on_invalid_hf_credentials(self) -> None:
        self.module.OLLAMAHF_BASE_URL = "https://example-ollamahf.hf.space"
        self.module.OLLAMAHF_BEARER_TOKEN = "bad-token"
        calls: list[dict] = []

        def fake_get_json(url: str, timeout: int, headers: dict | None = None) -> dict:
            del url, timeout
            calls.append(dict(headers or {}))
            if len(calls) == 1:
                return {
                    "status": "blocked",
                    "http_status": 401,
                    "response": {"error": "Invalid username or password."},
                    "error": "{\"error\":\"Invalid username or password.\"}",
                }
            return {
                "status": "forwarded",
                "http_status": 200,
                "response": {"events": [{"message": "public log ok"}]},
                "error": "",
            }

        self.module._get_json_url = fake_get_json
        result = self.module._monitor_probe_with_auth_fallback(
            "/monitor/api/logs/build",
            5,
            expect_json=True,
            allow_public_retry=True,
        )
        self.assertEqual(result.get("http_status"), 200)
        self.assertEqual(result.get("auth_state"), "invalid_fallback_public")
        self.assertTrue(bool(result.get("fallback_public")))
        self.assertEqual(len(calls), 2)
        self.assertIn("Authorization", calls[0])
        self.assertNotIn("Authorization", calls[1])

    def test_monitor_probe_retries_public_on_500_invalid_hf_credentials(self) -> None:
        self.module.OLLAMAHF_BASE_URL = "https://example-ollamahf.hf.space"
        self.module.OLLAMAHF_BEARER_TOKEN = "bad-token"
        calls: list[dict] = []

        def fake_get_json(url: str, timeout: int, headers: dict | None = None) -> dict:
            del url, timeout
            calls.append(dict(headers or {}))
            if len(calls) == 1:
                return {
                    "status": "forward-failed",
                    "http_status": 500,
                    "response": {"error": "Invalid username or password."},
                    "error": "{\"error\":\"Invalid username or password.\"}",
                }
            return {
                "status": "forwarded",
                "http_status": 200,
                "response": {"events": [{"message": "public log ok"}]},
                "error": "",
            }

        self.module._get_json_url = fake_get_json
        result = self.module._monitor_probe_with_auth_fallback(
            "/monitor/api/logs/build",
            5,
            expect_json=True,
            allow_public_retry=True,
        )
        self.assertEqual(result.get("http_status"), 200)
        self.assertEqual(result.get("auth_state"), "invalid_fallback_public")
        self.assertTrue(bool(result.get("fallback_public")))
        self.assertEqual(len(calls), 2)
        self.assertIn("Authorization", calls[0])
        self.assertNotIn("Authorization", calls[1])

    def test_monitor_dedupe_compresses_repeated_events(self) -> None:
        deduped = self.module._dedupe_monitor_records(
            [
                {
                    "stream": "build",
                    "model_id": "qwen2.5-coder-7b",
                    "state": "pulling",
                    "message": "pulling manifest",
                    "timestamp": "2026-04-20T16:20:12Z",
                    "epoch": 100.0,
                },
                {
                    "stream": "build",
                    "model_id": "qwen2.5-coder-7b",
                    "state": "pulling",
                    "message": "pulling manifest",
                    "timestamp": "2026-04-20T16:20:13Z",
                    "epoch": 101.0,
                },
                {
                    "stream": "build",
                    "model_id": "qwen2.5-coder-7b",
                    "state": "pulling",
                    "message": "pulling manifest",
                    "timestamp": "2026-04-20T16:21:00Z",
                    "epoch": 160.0,
                },
            ],
            10,
        )
        self.assertEqual(len(deduped), 2)
        self.assertEqual(int(deduped[0].get("repeat_count", 0)), 2)
        self.assertEqual(int(deduped[1].get("repeat_count", 0)), 1)

    def test_core12_profile_is_default_when_available_and_has_exact_size(self) -> None:
        self.module.AUTONOMY_PROFILES[self.module.CORE12_PROFILE_ID] = {
            "label": "Core-12 Coder-Swarm",
            "description": "fixed 10 coder + 2 supervisor profile",
            "agents": [
                "webgl_client",
                "gameplay_systems",
                "backend_platform",
                "multiplayer_netcode",
                "cloud_infra_devops",
                "qa_validation",
                "security_anticheat",
                "local.langgraph.planner",
                "local.langgraph.research",
                "local.langgraph.reviewer",
                "sentinel_truth",
                "sentinel_runtime",
            ],
        }
        defaults = self.module._recommended_defaults_payload()
        self.assertEqual(defaults.get("default_profile_id"), self.module.CORE12_PROFILE_ID)
        quick = defaults.get("quick_profile_ids", {})
        self.assertEqual(quick.get("core_12"), self.module.CORE12_PROFILE_ID)
        core12_state = self.module._core12_profile_state()
        self.assertTrue(bool(core12_state.get("core12_profile_active")))
        self.assertEqual(int(core12_state.get("coder_swarm_size", 0)), 12)


if __name__ == "__main__":
    unittest.main()
