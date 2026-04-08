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
    existing_key="$(docker run --rm -v n8n_n8n_data:/data alpine sh -lc "sed -n 's/.*\"encryptionKey\": \"\\([^\"]*\\)\".*/\\1/p' /data/config 2>/dev/null" 2>/dev/null || true)"
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

export ORACLE_IP="${ORACLE_IP:-127.0.0.1}"
export OPENHANDS_PORT="${OPENHANDS_PORT:-3000}"
export OPENHANDS_ADAPTER_PORT="${OPENHANDS_ADAPTER_PORT:-3001}"
export N8N_PORT="${N8N_PORT:-5678}"
export LANGGRAPH_PORT="${LANGGRAPH_PORT:-8080}"
export N8N_ENCRYPTION_KEY="${N8N_ENCRYPTION_KEY:-$(get_stable_n8n_key)}"

cd "$REPO_ROOT/openhands" && docker compose up -d
echo "OK  OpenHands compose running on :$OPENHANDS_PORT"

cd "$REPO_ROOT/n8n" && docker compose up -d
echo "OK  n8n compose running on :$N8N_PORT"

cd "$REPO_ROOT/langgraph" && docker compose up -d --build
echo "OK  LangGraph compose running on :$LANGGRAPH_PORT"

LOCAL_OPENHANDS_URL="http://127.0.0.1:$OPENHANDS_PORT"
LOCAL_ADAPTER_URL="http://127.0.0.1:$OPENHANDS_ADAPTER_PORT/health"
LOCAL_LANGGRAPH_URL="http://127.0.0.1:$LANGGRAPH_PORT/health"
LOCAL_N8N_URL="http://127.0.0.1:$N8N_PORT/healthz"

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

echo ""
echo "======================================="
echo "  GODMODE STACK STATUS"
echo "======================================="
echo "  OpenHands local:  $LOCAL_OPENHANDS_URL"
echo "  Adapter local:    http://127.0.0.1:$OPENHANDS_ADAPTER_PORT"
echo "  n8n local:        http://127.0.0.1:$N8N_PORT"
echo "  LangGraph local:  http://127.0.0.1:$LANGGRAPH_PORT"
echo "  n8n hosted:       ${N8N_EDITOR_BASE_URL:-unset}"
echo "  Aider (HF):       ${HF_AIDER_SPACE_URL:-unset}"
echo "  bolt.diy (HF):    ${BOLTDIY_SPACE_URL:-unset}"
echo "======================================="
echo "  CANONICAL STACK ONLINE. GODMODE ACTIVE."
echo "======================================="
