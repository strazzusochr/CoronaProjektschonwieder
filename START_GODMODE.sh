#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$REPO_ROOT/.godmode_env"

echo "STARTING GODMODE ULTIMATE STACK..."

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

RUNTIME_DIR="$REPO_ROOT/.godmode_runtime"
N8N_KEY_FILE="$RUNTIME_DIR/n8n_encryption_key.txt"

get_stable_n8n_key() {
  mkdir -p "$RUNTIME_DIR"
  if [[ ! -f "$N8N_KEY_FILE" ]]; then
    local docker_prefix=(docker)
    if [[ "${CORE_DOCKER_CONTEXT:-default}" != "default" ]]; then
      docker_prefix+=(--context "$CORE_DOCKER_CONTEXT")
    fi
    existing_key="$("${docker_prefix[@]}" run --rm -v n8n_n8n_data:/data alpine sh -lc "sed -n 's/.*\"encryptionKey\": \"\\([^\"]*\\)\".*/\\1/p' /data/config 2>/dev/null" 2>/dev/null || true)"
    if [[ -n "$existing_key" ]]; then
      printf '%s' "$existing_key" > "$N8N_KEY_FILE"
    fi
  fi
  if [[ ! -f "$N8N_KEY_FILE" ]]; then
    python - <<'PY' > "$N8N_KEY_FILE"
import uuid
print(uuid.uuid4().hex + uuid.uuid4().hex)
PY
  fi
  tr -d '\r\n' < "$N8N_KEY_FILE"
}

test_http_endpoint() {
  local url="$1"
  local label="$2"
  local headers="${3:-}"
  local attempt
  for attempt in $(seq 1 20); do
    if [[ -n "$headers" ]]; then
      if curl -fsS -H "$headers" "$url" >/dev/null 2>&1; then
        echo "OK  $label -> $url"
        return 0
      fi
    else
      if curl -fsS "$url" >/dev/null 2>&1; then
        echo "OK  $label -> $url"
        return 0
      fi
    fi
    sleep 2
  done
  echo "WARN $label -> $url (unreachable)"
  return 1
}

assert_required_env() {
  local name="$1"
  local reason="$2"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Preflight failed: missing required variable '$name'. $reason" >&2
    exit 1
  fi
  if [[ "$value" == replace-with* || "$value" == changeme* || "$value" == your-* || "$value" == \<* || "$value" == "unset" ]]; then
    echo "Preflight failed: variable '$name' still has placeholder-like content. $reason" >&2
    exit 1
  fi
}

ensure_core_network() {
  local network_name="${GODMODE_CORE_NETWORK:-godmode_core}"
  if ! "${docker_cmd[@]}" network inspect "$network_name" >/dev/null 2>&1; then
    "${docker_cmd[@]}" network create "$network_name" >/dev/null
    echo "OK  Core network created: $network_name"
  else
    echo "OK  Core network present: $network_name"
  fi
}

export CORE_RUNTIME_PROVIDER="${CORE_RUNTIME_PROVIDER:-local}"
export CORE_RUNTIME_MODE="${CORE_RUNTIME_MODE:-local}"
export CORE_RUNTIME_HOST="${CORE_RUNTIME_HOST:-127.0.0.1}"
export CORE_RUNTIME_PUBLIC_URL="${CORE_RUNTIME_PUBLIC_URL:-http://$CORE_RUNTIME_HOST}"
export CORE_RUNTIME_SSH_HOST="${CORE_RUNTIME_SSH_HOST:-}"
export CORE_DOCKER_CONTEXT="${CORE_DOCKER_CONTEXT:-default}"
export CORE_DEPLOY_PROFILE="${CORE_DEPLOY_PROFILE:-local}"
export GODMODE_CORE_NETWORK="${GODMODE_CORE_NETWORK:-godmode_core}"
export LITELLM_PORT="${LITELLM_PORT:-4000}"
export BOLTDIY_MODE="${BOLTDIY_MODE:-hybrid}"
export BOLTDIY_FACADE_PORT="${BOLTDIY_FACADE_PORT:-3901}"
export BOLTDIY_FACADE_URL="${BOLTDIY_FACADE_URL:-http://$CORE_RUNTIME_HOST:$BOLTDIY_FACADE_PORT}"
export BOLTDIY_FACADE_INTERNAL_URL="${BOLTDIY_FACADE_INTERNAL_URL:-http://bolt-facade-godmode:3901}"
export BOLTDIY_FORWARD_TIMEOUT="${BOLTDIY_FORWARD_TIMEOUT:-20}"
export CONTROL_CENTER_STATUS_CACHE_TTL="${CONTROL_CENTER_STATUS_CACHE_TTL:-8}"
export DISPATCH_APPEND_PROJECT_LOGS="${DISPATCH_APPEND_PROJECT_LOGS:-false}"
export BOLTDIY_SPACE_ID="${BOLTDIY_SPACE_ID:-Wrzzzrzr/bolt-diy-godmode}"
if [[ -z "${BOLTDIY_SPACE_URL:-}" ]]; then
  export BOLTDIY_SPACE_URL="https://huggingface.co/spaces/$BOLTDIY_SPACE_ID"
fi
if [[ -z "${HF_TOKEN:-}" && -f "$HOME/.cache/huggingface/token" ]]; then
  export HF_TOKEN="$(tr -d '\r\n' < "$HOME/.cache/huggingface/token")"
  echo "OK  HF token loaded from local Hugging Face cache"
fi
export BOLTDIY_SPACE_TOKEN="${BOLTDIY_SPACE_TOKEN:-${HF_TOKEN:-}}"
export OLLAMAHF_BASE_URL="${OLLAMAHF_BASE_URL:-https://cgjgj-ollamahftrae.hf.space}"
export OLLAMAHF_MASTER_KEY="${OLLAMAHF_MASTER_KEY:-}"
export OLLAMAHF_BEARER_TOKEN="${OLLAMAHF_BEARER_TOKEN:-}"
export AGENT_REGISTRY_PATH="${AGENT_REGISTRY_PATH:-$REPO_ROOT/agent_registry.json}"
export ZERO_COMPUTE_POLICY="${ZERO_COMPUTE_POLICY:-true}"
export GODMODE_ALLOW_LOCAL_HEAVY="${GODMODE_ALLOW_LOCAL_HEAVY:-false}"
export SMOLAGENTS_URL="${SMOLAGENTS_URL:-${HF_SMOLAGENTS_SPACE_URL:-}}"
export HF_AIDER_URL="${HF_AIDER_URL:-${HF_AIDER_SPACE_URL:-}}"
export DEVTOOLS_BRIDGE_ENABLED="${DEVTOOLS_BRIDGE_ENABLED:-true}"
export DEVTOOLS_BRIDGE_HOST="${DEVTOOLS_BRIDGE_HOST:-0.0.0.0}"
export DEVTOOLS_BRIDGE_PORT="${DEVTOOLS_BRIDGE_PORT:-3911}"
export DEVTOOLS_BRIDGE_URL="${DEVTOOLS_BRIDGE_URL:-http://host.docker.internal:3911}"
export DEVTOOLS_BRIDGE_TIMEOUT="${DEVTOOLS_BRIDGE_TIMEOUT:-900}"
export DEVTOOLS_BRIDGE_COMMAND_TIMEOUT="${DEVTOOLS_BRIDGE_COMMAND_TIMEOUT:-900}"
export HF_VERIFY_STRICT="${HF_VERIFY_STRICT:-true}"
export ORACLE_VERIFY_ENABLED="${ORACLE_VERIFY_ENABLED:-true}"
export ORACLE_ENABLED="${ORACLE_ENABLED:-false}"
export ORACLE_PLACEHOLDER="${ORACLE_PLACEHOLDER:-true}"
export ORACLE_RESERVED_FOR_FUTURE="${ORACLE_RESERVED_FOR_FUTURE:-true}"
export OPENHANDS_PORT="${OPENHANDS_PORT:-3000}"
export OPENHANDS_ADAPTER_PORT="${OPENHANDS_ADAPTER_PORT:-3001}"
export OPENHANDS_API_INTERNAL_URL="${OPENHANDS_API_INTERNAL_URL:-http://openhands-godmode:3000}"
export OPENHANDS_ADAPTER_INTERNAL_URL="${OPENHANDS_ADAPTER_INTERNAL_URL:-http://openhands-godmode-adapter:3001}"
export OPENHANDS_ADAPTER_URL="${OPENHANDS_ADAPTER_URL:-$OPENHANDS_ADAPTER_INTERNAL_URL}"
export OPENHANDS_TRIGGER_MODE="${OPENHANDS_TRIGGER_MODE:-socketio}"
export OPENHANDS_TRIGGER_WAIT_SECONDS="${OPENHANDS_TRIGGER_WAIT_SECONDS:-180}"
export OPENHANDS_SOCKET_PATH="${OPENHANDS_SOCKET_PATH:-/socket.io}"
export OPENHANDS_PUBLIC_URL="${OPENHANDS_PUBLIC_URL:-http://127.0.0.1:$OPENHANDS_PORT}"
export OPENHANDS_LLM_MODEL="${OPENHANDS_LLM_MODEL:-smart-router}"
export OPENHANDS_LLM_BASE_URL="${OPENHANDS_LLM_BASE_URL:-http://litellm-godmode:4000}"
export OPENHANDS_LLM_API_KEY="${OPENHANDS_LLM_API_KEY:-${LITELLM_API_KEY:-}}"
export OPENHANDS_FILE_STORE="${OPENHANDS_FILE_STORE:-local}"
export OPENHANDS_FILE_STORE_PATH="${OPENHANDS_FILE_STORE_PATH:-/.openhands-state}"
export OPENHANDS_WORKSPACE_HOST_PATH="${OPENHANDS_WORKSPACE_HOST_PATH:-$REPO_ROOT}"
export N8N_PORT="${N8N_PORT:-5678}"
export N8N_WEBHOOK_URL="${N8N_WEBHOOK_URL:-http://$CORE_RUNTIME_HOST:$N8N_PORT/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission}"
export N8N_WEBHOOK_INTERNAL_URL="${N8N_WEBHOOK_INTERNAL_URL:-http://n8n-godmode:5678/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission}"
export N8N_API_URL="${N8N_API_URL:-http://n8n-godmode:5678/api/v1}"
export N8N_MEMORY_PROBE_URL="${N8N_MEMORY_PROBE_URL:-http://n8n-godmode:5678/webhook/godmodeMemoryProbe01/memory-probe-webhook/godmode-memory-probe}"
export MEMORY_VAULT_PATH="${MEMORY_VAULT_PATH:-$RUNTIME_DIR/memory_vault_runtime.md}"
export LANGGRAPH_PORT="${LANGGRAPH_PORT:-8080}"
export LANGGRAPH_API_INTERNAL_URL="${LANGGRAPH_API_INTERNAL_URL:-http://langgraph-godmode-local:8080}"
export N8N_ENCRYPTION_KEY="${N8N_ENCRYPTION_KEY:-$(get_stable_n8n_key)}"

docker_cmd=(docker)
if [[ "$CORE_DOCKER_CONTEXT" != "default" ]]; then
  docker_cmd+=(--context "$CORE_DOCKER_CONTEXT")
fi

assert_required_env "OPENHANDS_LLM_MODEL" "OpenHands must start with a deterministic default model for one-click usage."
assert_required_env "OPENHANDS_LLM_BASE_URL" "OpenHands needs a preconfigured LLM base URL to avoid manual provider setup."
assert_required_env "OPENHANDS_LLM_API_KEY" "OpenHands needs a non-empty API key value for automatic provider bootstrapping."
if [[ "$OPENHANDS_LLM_BASE_URL" == *"litellm-godmode"* || "$OPENHANDS_LLM_BASE_URL" == *":4000"* ]]; then
  assert_required_env "LITELLM_API_KEY" "LiteLLM is the configured OpenHands backend, so LITELLM_API_KEY must be present."
fi
if [[ ! -d "$OPENHANDS_WORKSPACE_HOST_PATH" ]]; then
  echo "Preflight failed: OPENHANDS_WORKSPACE_HOST_PATH '$OPENHANDS_WORKSPACE_HOST_PATH' does not exist." >&2
  exit 1
fi

sanitize_openhands_state() {
  local sanitizer_script="$REPO_ROOT/ops/sanitize_openhands_state.py"
  local state_root="${OPENHANDS_STATE_HOST_PATH:-$HOME/.openhands-state}"
  local evidence_dir="$RUNTIME_DIR/evidence"
  local fallback_key="${OPENHANDS_LLM_API_KEY:-${LITELLM_API_KEY:-}}"

  if [[ ! -f "$sanitizer_script" ]]; then
    echo "WARN OpenHands state sanitizer script missing: $sanitizer_script"
    return 1
  fi

  local python_cmd=""
  if command -v python3 >/dev/null 2>&1; then
    python_cmd="python3"
  elif command -v python >/dev/null 2>&1; then
    python_cmd="python"
  fi

  if [[ -z "$python_cmd" ]]; then
    echo "WARN OpenHands state sanitizer skipped (python missing on host)"
    return 1
  fi

  if "$python_cmd" "$sanitizer_script" \
      --state-root "$state_root" \
      --evidence-dir "$evidence_dir" \
      --fallback-llm-api-key "$fallback_key"; then
    echo "OK  OpenHands state sanitizer completed ($state_root)"
    return 0
  fi

  echo "WARN OpenHands state sanitizer failed"
  return 1
}

sync_n8n_workflow() {
  local workflow_file="$REPO_ROOT/n8n_mission_workflow.json"
  local container_name="n8n-godmode"
  local health_host="${LOCAL_HEALTHCHECK_HOST:-127.0.0.1}"
  local webhook_candidates=(
    "http://$health_host:$N8N_PORT/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission"
    "http://$health_host:$N8N_PORT/webhook/godmode-mission"
  )
  local timestamp
  local payload
  local curl_auth=()

  if [[ ! -f "$workflow_file" ]]; then
    echo "WARN n8n workflow sync skipped (missing $workflow_file)"
    return 1
  fi

  if ! "${docker_cmd[@]}" ps --format '{{.Names}}' | grep -Fxq "$container_name"; then
    echo "WARN n8n workflow sync skipped ($container_name not running)"
    return 1
  fi

  "${docker_cmd[@]}" cp "$workflow_file" "$container_name:/tmp/n8n_mission_workflow.json"
  "${docker_cmd[@]}" exec "$container_name" n8n import:workflow --input=/tmp/n8n_mission_workflow.json >/dev/null
  "${docker_cmd[@]}" exec "$container_name" n8n publish:workflow --id=godmodeMissionTrigger01 >/dev/null
  "${docker_cmd[@]}" restart "$container_name" >/dev/null

  if [[ -n "${N8N_BASIC_AUTH_USER:-}" && -n "${N8N_BASIC_AUTH_PASSWORD:-}" ]]; then
    curl_auth=(-u "$N8N_BASIC_AUTH_USER:$N8N_BASIC_AUTH_PASSWORD")
  fi

  local health_url="http://$health_host:$N8N_PORT/healthz"
  local health_ok=0
  for attempt in $(seq 1 30); do
    if curl -fsS "${curl_auth[@]}" "$health_url" >/dev/null 2>&1; then
      health_ok=1
      break
    fi
    sleep 2
  done
  if [[ "$health_ok" -ne 1 ]]; then
    echo "WARN n8n health did not recover after publish/restart"
    return 1
  fi

  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  payload="$(printf '{"agent":"GODMODE-Init","task":"n8n webhook activation smoke","source":"start_godmode","repo":"%s","ref":"main","status":"triggered","timestamp":"%s"}' "${GITHUB_REPO_URL:-https://github.com/strazzusochr/CoronaProjektschonwieder}" "$timestamp")"

  local smoke_ok=0
  local attempt
  local webhook_url
  for webhook_url in "${webhook_candidates[@]}"; do
    for attempt in $(seq 1 10); do
      if curl -fsS "${curl_auth[@]}" -H "Content-Type: application/json" -d "$payload" "$webhook_url" >/dev/null 2>&1; then
        smoke_ok=1
        break
      fi
      sleep 2
    done
    if [[ "$smoke_ok" -eq 1 ]]; then
      break
    fi
  done
  if [[ "$smoke_ok" -ne 1 ]]; then
    echo "WARN n8n mission webhook smoke failed after activation"
    return 1
  fi
  echo "OK  n8n mission workflow synced + active + webhook smoke passed"
}

sync_n8n_memory_workflow() {
  local probe_workflow_file="$REPO_ROOT/n8n_memory_probe_workflow.json"
  local system_workflow_file="$REPO_ROOT/n8n_memory_workflow.json"
  local container_name="n8n-godmode"
  local compose_file="$REPO_ROOT/n8n/docker-compose.yml"

  if [[ ! -f "$probe_workflow_file" ]]; then
    echo "WARN n8n memory workflow sync skipped (missing $probe_workflow_file)"
    return 1
  fi
  if [[ ! -f "$system_workflow_file" ]]; then
    echo "WARN n8n memory workflow sync skipped (missing $system_workflow_file)"
    return 1
  fi

  if ! "${docker_cmd[@]}" ps --format '{{.Names}}' | grep -Fxq "$container_name"; then
    echo "WARN n8n memory workflow sync skipped ($container_name not running)"
    return 1
  fi

  "${docker_cmd[@]}" cp "$probe_workflow_file" "$container_name:/tmp/n8n_memory_probe_workflow.json"
  "${docker_cmd[@]}" cp "$system_workflow_file" "$container_name:/tmp/n8n_memory_workflow.json"
  "${docker_cmd[@]}" exec "$container_name" n8n import:workflow --input=/tmp/n8n_memory_probe_workflow.json >/dev/null
  "${docker_cmd[@]}" exec "$container_name" n8n import:workflow --input=/tmp/n8n_memory_workflow.json >/dev/null
  "${docker_cmd[@]}" exec "$container_name" n8n publish:workflow --id=godmodeMemoryProbe01 >/dev/null
  "${docker_cmd[@]}" exec "$container_name" n8n publish:workflow --id=godmodeMemorySystem01 >/dev/null

  local execution_output=""
  if ! execution_output="$("${docker_cmd[@]}" compose -f "$compose_file" run --rm n8n execute --id=godmodeMemoryProbe01 --rawOutput 2>&1)"; then
    echo "WARN n8n memory workflow execute failed"
    return 1
  fi

  if [[ "$execution_output" == *'"status": "saved"'* || "$execution_output" == *'"status":"saved"'* ]]; then
    echo "OK  n8n memory workflow synced + probe saved to memory vault"
    return 0
  fi

  echo "WARN n8n memory workflow ran but save marker was not detected"
  return 1
}

patch_openhands_frontend_bootstrap() {
  local container_name="openhands-godmode"
  if ! "${docker_cmd[@]}" ps --format '{{.Names}}' | grep -Fxq "$container_name"; then
    echo "WARN OpenHands frontend patch skipped ($container_name not running)"
    return 1
  fi

  cat <<'PY' | "${docker_cmd[@]}" exec -i "$container_name" python - >/dev/null
import pathlib
import sys

assets_dir = pathlib.Path("/app/frontend/build/assets")
candidates = sorted(assets_dir.glob("user-prefs-context-*.js"))
if not candidates:
    print("OpenHands frontend patch failed: no user-prefs-context bundle found", file=sys.stderr)
    sys.exit(2)

target = candidates[0]
text = target.read_text(encoding="utf-8", errors="ignore")
replacements = [
    ('LLM_MODEL:"anthropic/claude-3-5-sonnet-20241022"', 'LLM_MODEL:"smart-router"'),
    ('LLM_BASE_URL:""', 'LLM_BASE_URL:"http://litellm-godmode:4000"'),
    ("xu=()=>za()===Pa", "xu=()=>!0"),
]
updated = text
for old, new in replacements:
    updated = updated.replace(old, new)

if "xu=()=>!0" not in updated:
    print("OpenHands frontend patch failed: settingsAreUpToDate override not applied", file=sys.stderr)
    sys.exit(3)

target.write_text(updated, encoding="utf-8")
print(f"patched:{target}")
PY

  if [[ $? -ne 0 ]]; then
    echo "WARN OpenHands frontend patch failed"
    return 1
  fi

  echo "OK  OpenHands frontend bootstrap patch applied (settings gate + LiteLLM defaults)"
  return 0
}

sanitize_openhands_state || true
ensure_core_network

cd "$REPO_ROOT/openhands" && "${docker_cmd[@]}" compose up -d
echo "OK  OpenHands compose running on :$OPENHANDS_PORT"
patch_openhands_frontend_bootstrap || true

cd "$REPO_ROOT/n8n" && "${docker_cmd[@]}" compose up -d
echo "OK  n8n compose running on :$N8N_PORT"

cd "$REPO_ROOT/langgraph" && "${docker_cmd[@]}" compose up -d --build
echo "OK  LangGraph compose running on :$LANGGRAPH_PORT"

cd "$REPO_ROOT/litellm" && "${docker_cmd[@]}" compose up -d
echo "OK  LiteLLM compose running on :$LITELLM_PORT"

cd "$REPO_ROOT/bolt_facade" && "${docker_cmd[@]}" compose up -d --build --force-recreate
echo "OK  bolt-facade compose running on :$BOLTDIY_FACADE_PORT"

if [[ "$DEVTOOLS_BRIDGE_ENABLED" == "true" ]]; then
  DEVTOOLS_HEALTH_URL="http://$CORE_RUNTIME_HOST:$DEVTOOLS_BRIDGE_PORT/health"
  if ! curl -fsS "$DEVTOOLS_HEALTH_URL" >/dev/null 2>&1; then
    PYTHON_CMD=""
    if command -v python3 >/dev/null 2>&1; then
      PYTHON_CMD="python3"
    elif command -v python >/dev/null 2>&1; then
      PYTHON_CMD="python"
    fi
    if [[ -n "$PYTHON_CMD" ]]; then
      mkdir -p "$RUNTIME_DIR"
      export DEVTOOLS_FRONTEND_DIR="${DEVTOOLS_FRONTEND_DIR:-$REPO_ROOT/CoronaProjektschonwieder}"
      nohup "$PYTHON_CMD" "$REPO_ROOT/core_tools_bridge.py" > "$RUNTIME_DIR/devtools_bridge.log" 2>&1 &
      sleep 2
      echo "OK  Core tools bridge started on :$DEVTOOLS_BRIDGE_PORT"
    else
      echo "WARN Core tools bridge not started (python missing)"
    fi
  else
    echo "OK  Core tools bridge already reachable on :$DEVTOOLS_BRIDGE_PORT"
  fi
fi

LOCAL_HEALTHCHECK_HOST="${LOCAL_HEALTHCHECK_HOST:-127.0.0.1}"
LOCAL_LITELLM_URL="http://$LOCAL_HEALTHCHECK_HOST:$LITELLM_PORT/"
LOCAL_OPENHANDS_URL="http://$LOCAL_HEALTHCHECK_HOST:$OPENHANDS_PORT"
LOCAL_ADAPTER_URL="http://$LOCAL_HEALTHCHECK_HOST:$OPENHANDS_ADAPTER_PORT/health"
LOCAL_LANGGRAPH_URL="http://$LOCAL_HEALTHCHECK_HOST:$LANGGRAPH_PORT/health"
LOCAL_N8N_URL="http://$LOCAL_HEALTHCHECK_HOST:$N8N_PORT/healthz"
LOCAL_BOLT_FACADE_URL="http://$LOCAL_HEALTHCHECK_HOST:$BOLTDIY_FACADE_PORT/health"
LOCAL_DEVTOOLS_URL="http://$LOCAL_HEALTHCHECK_HOST:$DEVTOOLS_BRIDGE_PORT/health"

test_http_endpoint "$LOCAL_LITELLM_URL" "LiteLLM"
test_http_endpoint "$LOCAL_BOLT_FACADE_URL" "bolt-facade"
test_http_endpoint "$LOCAL_OPENHANDS_URL" "OpenHands"
test_http_endpoint "$LOCAL_ADAPTER_URL" "OpenHands Adapter"
test_http_endpoint "$LOCAL_LANGGRAPH_URL" "LangGraph"

N8N_AUTH_HEADER=""
if [[ -n "${N8N_BASIC_AUTH_USER:-}" && -n "${N8N_BASIC_AUTH_PASSWORD:-}" ]]; then
  if command -v python >/dev/null 2>&1; then
    N8N_AUTH_HEADER="$(python - <<PY
import base64
pair = "${N8N_BASIC_AUTH_USER}:${N8N_BASIC_AUTH_PASSWORD}".encode("ascii")
print("Authorization: Basic " + base64.b64encode(pair).decode("ascii"))
PY
)"
  fi
fi
test_http_endpoint "$LOCAL_N8N_URL" "n8n" "$N8N_AUTH_HEADER"
sync_n8n_workflow
sync_n8n_memory_workflow
if [[ "$DEVTOOLS_BRIDGE_ENABLED" == "true" ]]; then
  test_http_endpoint "$LOCAL_DEVTOOLS_URL" "Core Tools Bridge" || true
fi

echo ""
echo "======================================="
echo "  GODMODE STACK STATUS (CORE)"
echo "======================================="
echo "  Core provider:     $CORE_RUNTIME_PROVIDER"
echo "  Core mode:         $CORE_RUNTIME_MODE"
echo "  Core host:         $CORE_RUNTIME_HOST"
echo "  Deploy profile:    $CORE_DEPLOY_PROFILE"
echo "  Docker context:    $CORE_DOCKER_CONTEXT"
echo "  LiteLLM local:    http://$CORE_RUNTIME_HOST:$LITELLM_PORT"
echo "  bolt-facade:      http://$CORE_RUNTIME_HOST:$BOLTDIY_FACADE_PORT"
echo "  OpenHands local:  $LOCAL_OPENHANDS_URL"
echo "  Adapter local:    http://$CORE_RUNTIME_HOST:$OPENHANDS_ADAPTER_PORT"
echo "  OpenHands LLM:    model=${OPENHANDS_LLM_MODEL:-unset}; base=${OPENHANDS_LLM_BASE_URL:-unset}"
echo "  n8n local:        http://$CORE_RUNTIME_HOST:$N8N_PORT"
echo "  LangGraph local:  http://$CORE_RUNTIME_HOST:$LANGGRAPH_PORT"
echo "  DevTools bridge:  http://$CORE_RUNTIME_HOST:$DEVTOOLS_BRIDGE_PORT"
echo "  n8n hosted:       ${N8N_EDITOR_BASE_URL:-unset}"
echo "  Aider (HF):       ${HF_AIDER_SPACE_URL:-unset}"
echo "  smolagents (HF):  ${HF_SMOLAGENTS_SPACE_URL:-unset}"
echo "  OLLAMAHF base:    ${OLLAMAHF_BASE_URL:-unset}"
echo "  bolt.diy (HF):    ${BOLTDIY_SPACE_URL:-unset}"
echo "  Agent registry:   ${AGENT_REGISTRY_PATH:-unset}"
echo "  Zero compute:     $ZERO_COMPUTE_POLICY (allow_local_heavy=$GODMODE_ALLOW_LOCAL_HEAVY)"
echo "  HF verify strict: $HF_VERIFY_STRICT"
echo "  Oracle verify:    $ORACLE_VERIFY_ENABLED"
echo "  Oracle profile:   enabled=$ORACLE_ENABLED; placeholder=$ORACLE_PLACEHOLDER"
echo "======================================="
echo "  CANONICAL STACK ONLINE. GODMODE ACTIVE."
echo "======================================="
