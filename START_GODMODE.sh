#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$REPO_ROOT/.godmode_env"

echo "🚀 STARTING GODMODE ULTIMATE STACK..."

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

export ORACLE_IP="${ORACLE_IP:-127.0.0.1}"
export OPENHANDS_PORT="${OPENHANDS_PORT:-3000}"
export OPENHANDS_ADAPTER_PORT="${OPENHANDS_ADAPTER_PORT:-3001}"
export N8N_PORT="${N8N_PORT:-5678}"
export LANGGRAPH_PORT="${LANGGRAPH_PORT:-8080}"
export N8N_ENCRYPTION_KEY="${N8N_ENCRYPTION_KEY:-godmode-session-$(date +%s)}"

cd "$REPO_ROOT/openhands" && docker compose up -d
echo "✅ OpenHands runtime running on :$OPENHANDS_PORT"

cd "$REPO_ROOT/n8n" && docker compose up -d
echo "✅ n8n running on :$N8N_PORT"

cd "$REPO_ROOT/langgraph" && docker compose up -d
echo "✅ LangGraph running on :$LANGGRAPH_PORT"

sleep 3
echo ""
echo "═══════════════════════════════════════"
echo "  GODMODE STACK STATUS"
echo "═══════════════════════════════════════"
echo "  OpenHands:        ${OPENHANDS_PUBLIC_URL:-http://$ORACLE_IP:$OPENHANDS_PORT}"
echo "  OpenHands Adapter:${OPENHANDS_ADAPTER_URL:-http://$ORACLE_IP:$OPENHANDS_ADAPTER_PORT}"
echo "  n8n:              ${N8N_EDITOR_BASE_URL:-http://$ORACLE_IP:$N8N_PORT}"
echo "  LangGraph:        ${LANGGRAPH_API_URL:-http://$ORACLE_IP:$LANGGRAPH_PORT}"
echo "  Aider (HF):       ${HF_AIDER_SPACE_URL:-unset}"
echo "  bolt.diy (HF):    ${BOLTDIY_SPACE_URL:-unset}"
echo "═══════════════════════════════════════"
echo "  CANONICAL STACK ONLINE. GODMODE ACTIVE."
echo "═══════════════════════════════════════"
