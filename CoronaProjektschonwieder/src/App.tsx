import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { resolveSyncCursor, type SyncCursor } from './sync';

type WindowRole = 'commander' | 'glasshouse' | 'operations';
type HealthState = 'idle' | 'checking' | 'up' | 'down';
type OperationalState = 'Idle' | 'Queued' | 'Running' | 'Waiting' | 'Blocked' | 'Partial' | 'Failed' | 'Done' | 'Stale';
type MaturityState = 'Verified' | 'Implemented' | 'Partial' | 'Blocked' | 'Legacy' | 'Plan' | 'Unknown';
type EventSeverity = 'info' | 'warn' | 'error' | 'success';

type PromptTemplate = { id: string; title: string; recommendedAgent: string; task: string };
type AutonomyProfile = { id: string; label: string; description: string; agents: string[] };
type Platform7ContractRole = { id: string; name: string; lane: string; kind: 'worker' | 'supervisor'; namespace: string; note: string };
type Platform7Contract = {
  version: string;
  status_model: string[];
  maturity_model: string[];
  required_supervisor_namespaces: string[];
  roles: Platform7ContractRole[];
  autonomy_profiles: AutonomyProfile[];
};
type DispatchPayload = { agent: string; task: string; source: string; repo: string; ref: string; status: string; timestamp: string };
type ServiceHealth = { id: string; label: string; source: string; state: HealthState; detail: string; checkedAt: string; action: string };
type BootstrapRecord = { status: string; ready: boolean; summary?: string; started_at?: string; finished_at?: string; phases?: Record<string, unknown>[] };
type AgentRecord = Record<string, unknown>;
type ControlEventCorrelation = {
  sessionId: string;
  runId: string;
  traceId: string;
  spanId: string;
  taskId: string;
  stepId: string;
  agentId: string;
  role: string;
  runtimeTarget: string;
  source: string;
  eventFile: string;
  backendStatus: string;
  changed: 'yes' | 'no' | 'unknown';
};
type ControlEvent = {
  id: string;
  timestamp: string;
  windowRole: WindowRole;
  action: string;
  state: OperationalState;
  reason: string;
  nextAction: string;
  severity: EventSeverity;
  rawState?: string;
  correlation?: ControlEventCorrelation;
};
type RuntimeProbeSummary = {
  samples: number;
  errors: number;
  bridgeFlaps: number;
  readyTransitions: number;
  runStatusTransitions: number;
  bootstrapTransitions: number;
  lastCheckedAt: string;
  lastRunStatus: string;
  lastBootstrap: string;
  lastReady: boolean;
  lastBridgeHttp: number;
  pass: boolean;
  reason: string;
  nextAction: string;
};
type RuntimeProbeTracker = {
  samples: number;
  errors: number;
  bridgeFlaps: number;
  readyTransitions: number;
  runStatusTransitions: number;
  bootstrapTransitions: number;
  lastRunStatus: string | null;
  lastBootstrap: string | null;
  lastReady: boolean | null;
  lastBridgeHttp: number | null;
};

type AgentRunStep = {
  step: number;
  agent: string;
  role?: string;
  status: string;
  raw_status?: string;
  call_id?: string;
  trace_id?: string;
  task_id?: string;
  step_id?: string;
  runtime_target?: string;
  dispatch_artifact?: string;
  reason?: string;
  http_status?: number | null;
  fallback_used?: boolean;
  fallback_reason?: string;
  fallback_endpoint?: string;
  fallback_task_id?: string;
  recovery_used?: boolean;
  recovery_endpoint?: string;
  recovery_reason?: string;
  final_code_artifact?: string;
  final_code_url?: string;
  response_excerpt?: string;
  started_at?: string;
  finished_at?: string;
};

type AgentRunRecord = {
  run_id: string;
  trace_id?: string;
  task_id?: string;
  status: string;
  goal: string;
  profile_id: string;
  profile_label: string;
  current_step: number;
  current_agent: string;
  forwarded_steps: number;
  partial_steps: number;
  total_steps: number;
  started_at?: string;
  finished_at?: string;
  snapshot?: string;
  run_file?: string;
  evidence_status?: string;
  evidence_manifest?: string;
  evidence_manifest_latest?: string;
  steps: AgentRunStep[];
};

type GlasshouseRow = {
  key: string;
  run_id: string;
  trace_id: string;
  task_id: string;
  step_id: string;
  agent_id: string;
  role: string;
  runtime_target: string;
  current_state: OperationalState;
  previous_state: OperationalState;
  next_state: OperationalState;
  reason: string;
  evidence_ref: string;
  started_at: string;
  finished_at: string;
  fallback_or_recovery: string;
};

type OperatorRole = {
  id: string;
  name: string;
  lane: string;
  kind: 'worker' | 'supervisor';
  namespace: string;
  state: OperationalState;
  maturity: MaturityState;
  note: string;
};

type SyncState = {
  hubBaseUrl: string;
  hubBaseInput: string;
  openHandsBaseUrl: string;
  openHandsBaseInput: string;
  connectionRevision: number;
  dispatchPayload: DispatchPayload;
  selectedTemplateId: string;
  autonomyProfileId: string;
  autonomyGoal: string;
  promptCommand: string;
  selectedRoleId: string;
  selectedStepKey: string;
  revision: number;
  updatedAt: string;
  sourceWindow: WindowRole;
  sourceInstanceId: string;
};

type WindowPresence = Record<WindowRole, string>;

const LOCAL_HUB_BASE_URL = 'http://127.0.0.1:3901';
const LOCAL_OPENHANDS_BASE_URL = 'http://127.0.0.1:3000';
const HUB_STORAGE_KEY = 'godmode.hubBaseUrl';
const OPENHANDS_STORAGE_KEY = 'godmode.openHandsBaseUrl';
const SESSION_STORAGE_KEY = 'godmode.sync.session.v3';
const SHARED_STATE_PREFIX = 'godmode.shared.v3';
const WINDOW_HEARTBEAT_PREFIX = 'godmode.heartbeat.v3';
const SYNC_CHANNEL_PREFIX = 'godmode.sync.channel.v1';
const RUN_HEARTBEAT_STALE_MS = 22000;
const WINDOW_HEARTBEAT_STALE_MS = 15000;
const PROMPT_EXECUTION_TIMEOUT_MS = 180000;
const AUTONOMY_RUN_TIMEOUT_MS = 180000;

const SERVICE_CATALOG = [
  { id: 'bolt', label: 'Dispatch Hub', targetKey: null, source: '/health' },
  { id: 'openhands', label: 'OpenHands UI', targetKey: null, source: '/control-center/state' },
  { id: 'n8n', label: 'n8n', targetKey: null, source: '/control-center/state' },
  { id: 'litellm', label: 'LiteLLM', targetKey: null, source: '/control-center/state' },
  { id: 'devtools-bridge', label: 'DevTools Bridge', targetKey: null, source: '/control-center/state' },
  { id: 'langgraph', label: 'LangGraph', targetKey: 'langgraph-local', source: '/routing/status' },
  { id: 'smolagents', label: 'Smolagents', targetKey: 'smolagents', source: '/routing/status' },
  { id: 'openhands-adapter', label: 'OpenHands Adapter', targetKey: 'openhands-adapter', source: '/routing/status' },
  { id: 'hf-aider', label: 'HF Aider', targetKey: 'hf-aider', source: '/routing/status' },
  { id: 'ollamahf', label: 'Ollama HF Orchestrator', targetKey: 'ollama-hf-orchestrator', source: '/routing/status' },
] as const;

const OPERATIONAL_META: Record<OperationalState, { symbol: string; tone: 'neutral' | 'ok' | 'warn' | 'danger'; action: string }> = {
  Idle: { symbol: '[ ]', tone: 'neutral', action: 'Review queued work' },
  Queued: { symbol: '[Q]', tone: 'warn', action: 'Start execution' },
  Running: { symbol: '[>]', tone: 'ok', action: 'Monitor live evidence' },
  Waiting: { symbol: '[..]', tone: 'warn', action: 'Unblock dependency' },
  Blocked: { symbol: '[!]', tone: 'danger', action: 'Apply recovery path' },
  Partial: { symbol: '[~]', tone: 'warn', action: 'Retry failed fragments' },
  Failed: { symbol: '[X]', tone: 'danger', action: 'Rollback and inspect' },
  Done: { symbol: '[OK]', tone: 'ok', action: 'Open evidence and verify' },
  Stale: { symbol: '[STALE]', tone: 'danger', action: 'Refresh heartbeat now' },
};

const MATURITY_META: Record<MaturityState, { symbol: string; tone: 'neutral' | 'ok' | 'warn' | 'danger' }> = {
  Verified: { symbol: '[OK]', tone: 'ok' },
  Implemented: { symbol: '[IMP]', tone: 'ok' },
  Partial: { symbol: '[~]', tone: 'warn' },
  Blocked: { symbol: '[!]', tone: 'danger' },
  Legacy: { symbol: '[LEG]', tone: 'warn' },
  Plan: { symbol: '[PLAN]', tone: 'neutral' },
  Unknown: { symbol: '[?]', tone: 'neutral' },
};

const CONFIG_KEYS = [
  'ANTHROPIC_API_KEY',
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'HF_TOKEN',
  'HETZNER_API_TOKEN',
  'GITHUB_TOKEN',
  'LITELLM_API_KEY',
  'OPENHANDS_API_KEY',
  'OPENHANDS_LLM_API_KEY',
  'N8N_API_KEY',
  'N8N_BASIC_AUTH_PASSWORD',
  'N8N_ENCRYPTION_KEY',
  'OLLAMAHF_MASTER_KEY',
  'OLLAMAHF_BEARER_TOKEN',
] as const;

const PROMPT_TEMPLATES: PromptTemplate[] = [
  { id: 'transparent-swarm', title: 'Transparent Swarm Run', recommendedAgent: 'product_scope', task: 'Execute a transparent multi-agent run with live evidence and strict supervisor gates for each step.' },
  { id: 'bridge-recovery', title: 'Bridge Recovery', recommendedAgent: 'sentinel_runtime', task: 'Investigate and stabilize connection drops in DevTools Bridge and verify recovery in live browser traces.' },
  { id: 'truth-audit', title: 'Truth Audit', recommendedAgent: 'sentinel_truth', task: 'Audit claims, require verified evidence labels, and block unsupported conclusions.' },
];

const EMPTY_AUTONOMY_PROFILES: AutonomyProfile[] = [];
const EMPTY_PLATFORM7_CONTRACT: Platform7Contract = {
  version: 'unloaded',
  status_model: [...Object.keys(OPERATIONAL_META)],
  maturity_model: [...Object.keys(MATURITY_META)],
  required_supervisor_namespaces: ['sentinel_truth', 'sentinel_runtime'],
  roles: [],
  autonomy_profiles: [],
};
const EMPTY_RUNTIME_PROBE: RuntimeProbeSummary = {
  samples: 0,
  errors: 0,
  bridgeFlaps: 0,
  readyTransitions: 0,
  runStatusTransitions: 0,
  bootstrapTransitions: 0,
  lastCheckedAt: '-',
  lastRunStatus: 'unknown',
  lastBootstrap: 'unknown',
  lastReady: false,
  lastBridgeHttp: 0,
  pass: false,
  reason: 'No probe sample collected yet.',
  nextAction: 'Run refresh diagnostics.',
};

function createRuntimeProbeTracker(): RuntimeProbeTracker {
  return {
    samples: 0,
    errors: 0,
    bridgeFlaps: 0,
    readyTransitions: 0,
    runStatusTransitions: 0,
    bootstrapTransitions: 0,
    lastRunStatus: null,
    lastBootstrap: null,
    lastReady: null,
    lastBridgeHttp: null,
  };
}

function nowIso() { return new Date().toISOString(); }
function normalizeBaseUrl(value: string, fallback: string) { const normalized = value.trim().replace(/\/+$/, ''); return normalized || fallback; }
function getStoredValue(key: string) { try { return window.localStorage.getItem(key) ?? ''; } catch { return ''; } }
function setStoredValue(key: string, value: string) { try { window.localStorage.setItem(key, value); } catch { /* ignore */ } }
function parseErrorMessage(error: unknown) { return error instanceof Error && error.message.trim().length > 0 ? error.message : 'unknown error'; }
function defaultDispatchPayload(): DispatchPayload { return { agent: 'product_scope', task: 'Prepare transparent execution plan for 3-window platform run.', source: 'commander', repo: 'strazzusochr/CoronaProjektschonwieder', ref: 'main', status: 'queued', timestamp: nowIso() }; }

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); } finally { window.clearTimeout(timeout); }
}

async function parseResponseSafely(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try { return (await response.json()) as Record<string, unknown>; } catch { return {}; }
  }
  try { return { text: await response.text() }; } catch { return {}; }
}

function normalizeAutonomyProfiles(payload: Record<string, unknown>): AutonomyProfile[] {
  const input = payload.profiles;
  if (!Array.isArray(input)) return EMPTY_AUTONOMY_PROFILES;
  const mapped = input
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const candidate = entry as Record<string, unknown>;
      const agents = Array.isArray(candidate.agents) ? candidate.agents.map((agent) => String(agent)).filter((agent) => agent.length > 0) : [];
      return { id: String(candidate.id ?? ''), label: String(candidate.label ?? candidate.id ?? 'Unnamed profile'), description: String(candidate.description ?? ''), agents } as AutonomyProfile;
    })
    .filter((entry) => entry.id.length > 0);
  return mapped;
}

function normalizePlatform7Contract(value: unknown): Platform7Contract | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const roles = Array.isArray(candidate.roles)
    ? candidate.roles
        .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
        .map((entry) => {
          const role = entry as Record<string, unknown>;
          const kind = String(role.kind ?? 'worker') === 'supervisor' ? 'supervisor' : 'worker';
          return {
            id: String(role.id ?? ''),
            name: String(role.name ?? role.id ?? ''),
            lane: String(role.lane ?? 'General'),
            kind,
            namespace: String(role.namespace ?? ''),
            note: String(role.note ?? ''),
          } as Platform7ContractRole;
        })
        .filter((role) => role.id.length > 0 && role.namespace.length > 0)
    : [];
  const autonomyProfiles = Array.isArray(candidate.autonomy_profiles)
    ? candidate.autonomy_profiles
        .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
        .map((entry) => {
          const profile = entry as Record<string, unknown>;
          const agents = Array.isArray(profile.agents) ? profile.agents.map((agent) => String(agent)).filter((agent) => agent.length > 0) : [];
          return {
            id: String(profile.id ?? ''),
            label: String(profile.label ?? profile.id ?? ''),
            description: String(profile.description ?? ''),
            agents,
          } as AutonomyProfile;
        })
        .filter((profile) => profile.id.length > 0)
    : [];
  return {
    version: String(candidate.version ?? 'unknown'),
    status_model: Array.isArray(candidate.status_model) ? candidate.status_model.map((entry) => String(entry)) : EMPTY_PLATFORM7_CONTRACT.status_model,
    maturity_model: Array.isArray(candidate.maturity_model) ? candidate.maturity_model.map((entry) => String(entry)) : EMPTY_PLATFORM7_CONTRACT.maturity_model,
    required_supervisor_namespaces: Array.isArray(candidate.required_supervisor_namespaces) ? candidate.required_supervisor_namespaces.map((entry) => String(entry)) : EMPTY_PLATFORM7_CONTRACT.required_supervisor_namespaces,
    roles,
    autonomy_profiles: autonomyProfiles,
  };
}

function normalizeRunPayload(value: unknown): AgentRunRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const steps = Array.isArray(candidate.steps)
    ? candidate.steps
        .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
        .map((entry) => {
          const step = entry as Record<string, unknown>;
          return {
            step: Number(step.step ?? 0),
            agent: String(step.agent ?? ''),
            role: String(step.role ?? ''),
            status: String(step.status ?? 'UNKNOWN'),
            raw_status: String(step.raw_status ?? ''),
            call_id: String(step.call_id ?? ''),
            trace_id: String(step.trace_id ?? candidate.trace_id ?? ''),
            task_id: String(step.task_id ?? candidate.task_id ?? step.fallback_task_id ?? ''),
            step_id: String(step.step_id ?? step.call_id ?? step.step ?? ''),
            runtime_target: String(step.runtime_target ?? ''),
            dispatch_artifact: String(step.dispatch_artifact ?? ''),
            reason: String(step.reason ?? step.error ?? ''),
            http_status: typeof step.http_status === 'number' ? step.http_status : null,
            fallback_used: Boolean(step.fallback_used),
            fallback_reason: String(step.fallback_reason ?? ''),
            fallback_endpoint: String(step.fallback_endpoint ?? ''),
            fallback_task_id: String(step.fallback_task_id ?? ''),
            recovery_used: Boolean(step.recovery_used),
            recovery_endpoint: String(step.recovery_endpoint ?? ''),
            recovery_reason: String(step.recovery_reason ?? ''),
            final_code_artifact: String(step.final_code_artifact ?? ''),
            final_code_url: String(step.final_code_url ?? ''),
            response_excerpt: String(step.response_excerpt ?? ''),
            started_at: String(step.started_at ?? ''),
            finished_at: String(step.finished_at ?? ''),
          } as AgentRunStep;
        })
    : [];
  const runId = String(candidate.run_id ?? '');
  if (!runId) return null;
  return {
    run_id: runId,
    trace_id: String(candidate.trace_id ?? ''),
    task_id: String(candidate.task_id ?? ''),
    status: String(candidate.status ?? 'UNKNOWN'),
    goal: String(candidate.goal ?? ''),
    profile_id: String(candidate.profile_id ?? ''),
    profile_label: String(candidate.profile_label ?? candidate.profile_id ?? ''),
    current_step: Number(candidate.current_step ?? 0),
    current_agent: String(candidate.current_agent ?? ''),
    forwarded_steps: Number(candidate.forwarded_steps ?? 0),
    partial_steps: Number(candidate.partial_steps ?? 0),
    total_steps: Number(candidate.total_steps ?? steps.length),
    started_at: String(candidate.started_at ?? ''),
    finished_at: String(candidate.finished_at ?? ''),
    snapshot: String(candidate.snapshot ?? ''),
    run_file: String(candidate.run_file ?? ''),
    evidence_status: String(candidate.evidence_status ?? ''),
    evidence_manifest: String(candidate.evidence_manifest ?? ''),
    evidence_manifest_latest: String(candidate.evidence_manifest_latest ?? ''),
    steps,
  };
}

function normalizeTimelineRows(value: unknown): GlasshouseRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry, index) => {
      const row = entry as Record<string, unknown>;
      const runId = String(row.run_id ?? '').trim();
      const agentId = String(row.agent_id ?? row.agent ?? '').trim();
      const stepId = String(row.step_id ?? row.call_id ?? index + 1).trim();
      const fallbackUsed = Boolean(row.fallback_used);
      const recoveryUsed = Boolean(row.recovery_used);
      const fallbackOrRecovery = fallbackUsed
        ? `fallback: ${String(row.fallback_reason ?? row.fallback_endpoint ?? 'used').trim() || 'used'}`
        : recoveryUsed
          ? `recovery: ${String(row.recovery_reason ?? row.recovery_target ?? 'used').trim() || 'used'}`
          : 'none';
      const traceId = String(row.trace_id ?? '').trim() || 'unknown';
      const taskId = String(row.task_id ?? '').trim() || 'unknown';
      const rowKey = [runId || 'run-unknown', traceId, taskId, stepId || `step-${index + 1}`, agentId || `agent-${index + 1}`].join(':');
      return {
        key: rowKey,
        run_id: runId,
        trace_id: traceId,
        task_id: taskId,
        step_id: stepId,
        agent_id: agentId || 'unknown',
        role: String(row.role ?? '').trim(),
        runtime_target: String(row.runtime_target ?? '').trim() || 'unknown',
        current_state: runStatusToOperational(String(row.current_state ?? row.status ?? 'UNKNOWN')),
        previous_state: runStatusToOperational(String(row.previous_state ?? 'Idle')),
        next_state: runStatusToOperational(String(row.next_state ?? 'Idle')),
        reason: String(row.reason ?? '').trim() || 'no reason reported',
        evidence_ref: String(row.evidence_ref ?? '').trim() || 'not-reported',
        started_at: String(row.started_at ?? '').trim() || '-',
        finished_at: String(row.finished_at ?? '').trim() || '-',
        fallback_or_recovery: fallbackOrRecovery,
      } as GlasshouseRow;
    });
}

function runStatusToOperational(status: string): OperationalState {
  const normalized = status.trim().toUpperCase();
  if (['PASS', 'DONE', 'READY', 'SUCCESS', 'VERIFIED'].includes(normalized)) return 'Done';
  if (['RUNNING', 'BOOTING', 'CHECKING', 'IN_PROGRESS', 'FORWARDED', 'FORWARDING'].includes(normalized)) return 'Running';
  if (['QUEUED', 'PENDING'].includes(normalized)) return 'Queued';
  if (['WAITING', 'PAUSED'].includes(normalized)) return 'Waiting';
  if (['BLOCKED', 'NOT VERIFIED', 'UNVERIFIED'].includes(normalized)) return 'Blocked';
  if (['PARTIAL', 'DEGRADED', 'SKIPPED'].includes(normalized)) return 'Partial';
  if (['FAIL', 'FAILED', 'ERROR', 'FORWARD-FAILED', 'ROLLED_BACK', 'STOPPED'].includes(normalized)) return 'Failed';
  return 'Idle';
}

function healthToOperational(state: HealthState): OperationalState {
  if (state === 'up') return 'Done';
  if (state === 'checking') return 'Running';
  if (state === 'down') return 'Blocked';
  return 'Idle';
}

function severityFromOperationalState(state: OperationalState, changed: 'yes' | 'no' | 'unknown' = 'unknown'): EventSeverity {
  if (state === 'Failed' || state === 'Blocked' || state === 'Stale') return 'error';
  if (changed === 'no') return 'warn';
  if (state === 'Partial' || state === 'Waiting' || state === 'Queued') return 'warn';
  if (changed === 'yes' || state === 'Done') return 'success';
  return 'info';
}

function sourceToWindowRole(source: string): WindowRole | null {
  const normalized = source.trim().toLowerCase();
  if (normalized === 'window:commander') return 'commander';
  if (normalized === 'window:glasshouse') return 'glasshouse';
  if (normalized === 'window:operations') return 'operations';
  return null;
}

function operationalChipClass(state: OperationalState) { return `chip chip--${OPERATIONAL_META[state].tone}`; }
function maturityChipClass(state: MaturityState) { return `chip chip--${MATURITY_META[state].tone}`; }

function resolveWindowRole(): WindowRole {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('window');
  if (value === 'commander' || value === 'glasshouse' || value === 'operations') return value;
  return 'commander';
}

function resolveSessionId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('session');
  if (fromUrl) return fromUrl;
  const stored = getStoredValue(SESSION_STORAGE_KEY);
  if (stored.length > 0) return stored;
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `session-${Date.now()}`;
}

function roleNameForAgent(agentId: string, roles: Array<{ id: string; namespace: string; name: string }>) {
  const normalized = agentId.toLowerCase();
  const hit = roles.find((role) => role.namespace.toLowerCase() === normalized || role.id.toLowerCase() === normalized);
  return hit?.name ?? agentId;
}

function asStringArray(value: unknown): string[] { return Array.isArray(value) ? value.map((entry) => String(entry)) : []; }

function inferMissingKeysFromBootstrap(bootstrap: BootstrapRecord): Set<string> {
  const missing = new Set<string>();
  if (!Array.isArray(bootstrap.phases)) return missing;
  const preflight = bootstrap.phases.find((phase) => String(phase.phase ?? '') === 'preflight');
  if (!preflight || typeof preflight !== 'object') return missing;
  const result = (preflight as Record<string, unknown>).result;
  if (!result || typeof result !== 'object') return missing;
  const errors = (result as Record<string, unknown>).errors;
  if (!Array.isArray(errors)) return missing;
  for (const error of errors) {
    const matches = String(error).match(/[A-Z][A-Z0-9_]{2,}/g) ?? [];
    for (const candidate of matches) {
      if ((CONFIG_KEYS as readonly string[]).includes(candidate)) missing.add(candidate);
    }
  }
  return missing;
}

function inferExplicitConfigPresence(rawState: Record<string, unknown> | null): Map<string, 'Present' | 'Missing'> {
  const mapped = new Map<string, 'Present' | 'Missing'>();
  if (!rawState || typeof rawState !== 'object') return mapped;
  const bootstrap = rawState.bootstrap && typeof rawState.bootstrap === 'object'
    ? (rawState.bootstrap as Record<string, unknown>)
    : null;
  const tokens = bootstrap?.tokens && typeof bootstrap.tokens === 'object'
    ? (bootstrap.tokens as Record<string, unknown>)
    : null;
  if (!tokens) return mapped;

  const apply = (key: string, value: unknown) => {
    if (typeof value !== 'boolean') return;
    mapped.set(key, value ? 'Present' : 'Missing');
  };

  apply('HF_TOKEN', tokens.hf_token_present);
  apply('OLLAMAHF_BEARER_TOKEN', tokens.ollamahf_bearer_present);
  apply('OLLAMAHF_MASTER_KEY', tokens.ollamahf_master_present);

  return mapped;
}

function heartbeatAge(seen: string): { ageMs: number | null; isClockSkew: boolean; isInvalid: boolean } {
  if (!seen || seen === '-') return { ageMs: null, isClockSkew: false, isInvalid: true };
  const epoch = Date.parse(seen);
  if (!Number.isFinite(epoch)) return { ageMs: null, isClockSkew: false, isInvalid: true };
  const ageMs = Date.now() - epoch;
  if (ageMs < -2000) return { ageMs, isClockSkew: true, isInvalid: false };
  return { ageMs, isClockSkew: false, isInvalid: false };
}

function heartbeatIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '-';
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.iso === 'string' && candidate.iso.trim()) return candidate.iso.trim();
  const epoch = Number(candidate.epoch_ms ?? candidate.epochMs ?? Number.NaN);
  if (Number.isFinite(epoch)) return new Date(epoch).toISOString();
  return '-';
}

function normalizeWindowPresencePayload(payload: unknown): WindowPresence {
  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  return {
    commander: heartbeatIso(source.commander),
    glasshouse: heartbeatIso(source.glasshouse),
    operations: heartbeatIso(source.operations),
  };
}

export default function App() {
  const windowRole = useMemo(() => resolveWindowRole(), []);
  const sessionId = useMemo(() => resolveSessionId(), []);
  const windowInstanceId = useMemo(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${windowRole}-${Date.now()}`), [windowRole]);
  const eventCounter = useRef(0);
  const runHeartbeatRef = useRef(0);
  const connectionRevisionRef = useRef(0);
  const seenControlEventKeysRef = useRef<Set<string>>(new Set());
  const runtimeProbeTrackerRef = useRef<RuntimeProbeTracker>(createRuntimeProbeTracker());
  const syncCursorRef = useRef<SyncCursor>({
    revision: 0,
    updatedAt: '',
    sourceWindow: '',
    sourceInstanceId: '',
  });
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  const [hubBaseUrl, setHubBaseUrl] = useState(normalizeBaseUrl(getStoredValue(HUB_STORAGE_KEY), LOCAL_HUB_BASE_URL));
  const [hubBaseInput, setHubBaseInput] = useState(normalizeBaseUrl(getStoredValue(HUB_STORAGE_KEY), LOCAL_HUB_BASE_URL));
  const [openHandsBaseUrl, setOpenHandsBaseUrl] = useState(normalizeBaseUrl(getStoredValue(OPENHANDS_STORAGE_KEY), LOCAL_OPENHANDS_BASE_URL));
  const [openHandsBaseInput, setOpenHandsBaseInput] = useState(normalizeBaseUrl(getStoredValue(OPENHANDS_STORAGE_KEY), LOCAL_OPENHANDS_BASE_URL));

  const [connectionMessage, setConnectionMessage] = useState('Connection not tested yet. Save or test the Hub API URL before running prompts.');
  const [platformStatus, setPlatformStatus] = useState('System idle. Run health checks to start live visibility.');
  const [platformBusy, setPlatformBusy] = useState(false);
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [autonomyBusy, setAutonomyBusy] = useState(false);
  const [readyForPromptExecution, setReadyForPromptExecution] = useState(false);

  const [bootstrapState, setBootstrapState] = useState<BootstrapRecord>({ status: 'DOWN', ready: false, summary: 'Bootstrap not started.' });

  const [dispatchPayload, setDispatchPayload] = useState<DispatchPayload>(defaultDispatchPayload());
  const [selectedTemplateId, setSelectedTemplateId] = useState(PROMPT_TEMPLATES[0].id);
  const [autonomyProfiles, setAutonomyProfiles] = useState<AutonomyProfile[]>(EMPTY_AUTONOMY_PROFILES);
  const [autonomyProfileId, setAutonomyProfileId] = useState('');
  const [platformContract, setPlatformContract] = useState<Platform7Contract>(EMPTY_PLATFORM7_CONTRACT);
  const [platformContractValidation, setPlatformContractValidation] = useState<Record<string, unknown> | null>(null);
  const [autonomyGoal, setAutonomyGoal] = useState(PROMPT_TEMPLATES[0].task);
  const [promptCommand, setPromptCommand] = useState(PROMPT_TEMPLATES[0].task);

  const [dispatchMessage, setDispatchMessage] = useState('No dispatch sent yet.');
  const [promptMessage, setPromptMessage] = useState('No prompt command executed yet.');
  const [autonomyMessage, setAutonomyMessage] = useState('No autonomous run started yet.');

  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>(SERVICE_CATALOG.map((service) => ({ id: service.id, label: service.label, source: service.source, state: 'idle', detail: 'Not checked yet.', checkedAt: '-', action: 'Run refresh checks' })));

  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentCounts, setAgentCounts] = useState({ active: 0, legacy: 0 });
  const [routingStatus, setRoutingStatus] = useState<Record<string, unknown> | null>(null);
  const [capabilitiesStatus, setCapabilitiesStatus] = useState<Record<string, unknown> | null>(null);
  const [currentRun, setCurrentRun] = useState<AgentRunRecord | null>(null);
  const [backendTimelineRows, setBackendTimelineRows] = useState<GlasshouseRow[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedStepKey, setSelectedStepKey] = useState('');
  const [events, setEvents] = useState<ControlEvent[]>([]);
  const [presence, setPresence] = useState<WindowPresence>({ commander: '-', glasshouse: '-', operations: '-' });
  const [rawControlCenterState, setRawControlCenterState] = useState<Record<string, unknown> | null>(null);
  const [runtimeProbe, setRuntimeProbe] = useState<RuntimeProbeSummary>(EMPTY_RUNTIME_PROBE);
  const [probeSweepBusy, setProbeSweepBusy] = useState(false);
  const [probeSweepProgress, setProbeSweepProgress] = useState({ current: 0, total: 0, lastSampleAt: '' });

  const selectedTemplate = PROMPT_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? PROMPT_TEMPLATES[0];
  const effectiveAutonomyProfiles = platformContract.autonomy_profiles.length > 0
    ? platformContract.autonomy_profiles
    : autonomyProfiles;
  const autonomyProfileSource = platformContract.autonomy_profiles.length > 0
    ? '/platform7/contract'
    : autonomyProfiles.length > 0
      ? '/autonomy/profiles'
      : 'none';
  const selectedAutonomyProfile = effectiveAutonomyProfiles.find((profile) => profile.id === autonomyProfileId) ?? effectiveAutonomyProfiles[0] ?? null;
  const selectedAutonomyProfileId = selectedAutonomyProfile?.id ?? 'three_d_web_game_swarm';
  const selectedAutonomyProfileLabel = selectedAutonomyProfile?.label ?? 'No profile loaded';
  const profileMissingFromContract = platformContract.autonomy_profiles.length > 0
    && !platformContract.autonomy_profiles.some((profile) => profile.id === selectedAutonomyProfileId);
  const profileSelectionReason = profileMissingFromContract
    ? `Profile ${selectedAutonomyProfileId} is not part of Platform7 contract ${platformContract.version}.`
    : '';

  const currentRunOperational = useMemo(() => {
    if (!currentRun) return 'Idle' as OperationalState;
    const mapped = runStatusToOperational(currentRun.status);
    if ((mapped === 'Running' || mapped === 'Waiting') && runHeartbeatRef.current > 0 && Date.now() - runHeartbeatRef.current > RUN_HEARTBEAT_STALE_MS) {
      return 'Stale';
    }
    return mapped;
  }, [currentRun]);

  const missingConfigKeys = useMemo(() => inferMissingKeysFromBootstrap(bootstrapState), [bootstrapState]);
  const explicitConfigPresence = useMemo(() => inferExplicitConfigPresence(rawControlCenterState), [rawControlCenterState]);

  const selectedTimelineRow = useMemo(() => {
    if (backendTimelineRows.length === 0) return null;
    if (selectedStepKey.length > 0) {
      const selected = backendTimelineRows.find((row) => row.key === selectedStepKey);
      if (selected) return selected;
    }
    return backendTimelineRows[backendTimelineRows.length - 1];
  }, [backendTimelineRows, selectedStepKey]);

  const activeStep = useMemo(() => {
    if (!currentRun || currentRun.steps.length === 0) return null;
    if (selectedTimelineRow) {
      const selectedStepId = String(selectedTimelineRow.step_id).trim();
      const selectedAgentId = String(selectedTimelineRow.agent_id).trim();
      const found = currentRun.steps.find((step) => {
        const stepId = String(step.step_id ?? step.call_id ?? step.step ?? '').trim();
        const agentId = String(step.agent ?? '').trim();
        return stepId === selectedStepId && agentId === selectedAgentId;
      });
      if (found) return found;
    }
    return currentRun.steps[currentRun.steps.length - 1];
  }, [currentRun, selectedTimelineRow]);

  const selectedEvidenceRef = useMemo(() => {
    if (!selectedTimelineRow) return '';
    const value = String(selectedTimelineRow.evidence_ref ?? '').trim();
    return value && value !== 'not-reported' ? value : '';
  }, [selectedTimelineRow]);

  const evidenceItems = useMemo(() => {
    const items = new Set<string>();
    if (currentRun?.run_file) items.add(currentRun.run_file);
    if (currentRun?.snapshot) items.add(currentRun.snapshot);
    if (currentRun?.evidence_manifest) items.add(currentRun.evidence_manifest);
    if (currentRun?.evidence_manifest_latest) items.add(currentRun.evidence_manifest_latest);
    if (selectedEvidenceRef) items.add(selectedEvidenceRef);
    if (activeStep?.dispatch_artifact) items.add(activeStep.dispatch_artifact);
    if (activeStep?.final_code_artifact) items.add(activeStep.final_code_artifact);
    if (activeStep?.final_code_url) items.add(activeStep.final_code_url);
    return [...items];
  }, [activeStep, currentRun, selectedEvidenceRef]);

  const glasshouseRows = useMemo(() => {
    if (backendTimelineRows.length > 0) return backendTimelineRows;
    if (!currentRun) return [] as GlasshouseRow[];
    return currentRun.steps.map((step, index) => ({
      key: `${step.step}-${step.agent}`,
      run_id: currentRun.run_id,
      trace_id: step.trace_id || currentRun.trace_id || 'unknown',
      task_id: step.task_id || currentRun.task_id || step.fallback_task_id || 'unknown',
      step_id: step.step_id || step.call_id || String(step.step),
      agent_id: step.agent || 'unknown',
      role: step.role || roleNameForAgent(step.agent, platformContract.roles),
      runtime_target: step.runtime_target || 'unknown',
      current_state: runStatusToOperational(step.status),
      previous_state: index === 0 ? 'Idle' : runStatusToOperational(currentRun.steps[index - 1].status),
      next_state: index === currentRun.steps.length - 1 ? runStatusToOperational(currentRun.status) : runStatusToOperational(currentRun.steps[index + 1].status),
      reason: step.reason || step.response_excerpt || 'no reason reported',
      evidence_ref: step.dispatch_artifact || step.final_code_artifact || step.final_code_url || currentRun.run_file || currentRun.snapshot || 'not-reported',
      started_at: step.started_at || currentRun.started_at || '-',
      finished_at: step.finished_at || '-',
      fallback_or_recovery: step.fallback_used ? `fallback: ${step.fallback_reason || step.fallback_endpoint || 'used'}` : step.recovery_used ? `recovery: ${step.recovery_reason || step.recovery_endpoint || 'used'}` : 'none',
    }));
  }, [backendTimelineRows, currentRun, platformContract.roles]);

  const roleCards = useMemo(() => {
    const baseRoles: OperatorRole[] = platformContract.roles.map((role) => ({
      id: role.id,
      name: role.name,
      lane: role.lane,
      kind: role.kind,
      namespace: role.namespace,
      state: role.kind === 'supervisor' ? 'Running' : 'Queued',
      maturity: role.kind === 'supervisor' ? 'Verified' : 'Plan',
      note: role.note,
    }));
    const map = new Map<string, { state: OperationalState; maturity: MaturityState; note: string }>();
    for (const role of baseRoles) {
      map.set(role.id, { state: role.state, maturity: role.maturity, note: role.note });
      map.set(role.namespace, { state: role.state, maturity: role.maturity, note: role.note });
    }
    for (const agent of agents) {
      const namespace = String(agent.agent_id ?? agent.id ?? agent.name ?? '');
      if (!namespace) continue;
      const statusClass = String(agent.status_class ?? agent.status ?? 'unknown');
      const operational = runStatusToOperational(statusClass);
      const maturity: MaturityState =
        operational === 'Done'
          ? 'Verified'
          : operational === 'Running'
            ? 'Implemented'
            : operational === 'Partial'
              ? 'Partial'
              : operational === 'Blocked' || operational === 'Failed'
                ? 'Blocked'
                : 'Unknown';
      map.set(namespace, { state: operational, maturity, note: `Registry status: ${statusClass}` });
    }
    if (currentRun?.steps?.length) {
      for (const step of currentRun.steps) {
        const namespace = String(step.agent ?? '').trim();
        if (!namespace) continue;
        const operational = runStatusToOperational(step.status);
        const maturity: MaturityState =
          operational === 'Done'
            ? 'Verified'
            : operational === 'Running'
              ? 'Implemented'
              : operational === 'Partial'
                ? 'Partial'
                : operational === 'Blocked' || operational === 'Failed'
                  ? 'Blocked'
                  : 'Unknown';
        map.set(namespace, { state: operational, maturity, note: step.reason || 'Live run step update' });
      }
    }
    return baseRoles.map((role) => {
      const override = map.get(role.id) ?? map.get(role.namespace);
      return { ...role, state: override?.state ?? role.state, maturity: override?.maturity ?? role.maturity, note: override?.note ?? role.note };
    });
  }, [agents, currentRun, platformContract.roles]);

  const selectedRole = roleCards.find((role) => role.id === selectedRoleId) ?? roleCards[0] ?? null;
  const workerRoleCount = roleCards.filter((role) => role.kind === 'worker').length;
  const supervisorRoleCount = roleCards.filter((role) => role.kind === 'supervisor').length;

  useEffect(() => {
    if (!roleCards.length) return;
    if (!selectedRoleId || !roleCards.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(roleCards[0].id);
    }
  }, [roleCards, selectedRoleId]);

  const syncStateKey = `${SHARED_STATE_PREFIX}.${sessionId}`;
  const heartbeatKey = `${WINDOW_HEARTBEAT_PREFIX}.${sessionId}`;

  const pushEventEntry = (entry: ControlEvent) => {
    setEvents((current) => [entry, ...current].slice(0, 300));
  };

  const pushEvent = (action: string, state: OperationalState, reason: string, nextAction: string, severity: EventSeverity = 'info') => {
    const entry: ControlEvent = { id: `${Date.now()}-${eventCounter.current}`, timestamp: nowIso(), windowRole, action, state, reason, nextAction, severity };
    eventCounter.current += 1;
    pushEventEntry(entry);
  };

  const pushBackendControlEvent = (
    candidate: unknown,
    fallback: { action: string; state: OperationalState; reason: string; nextAction: string; backendStatus?: string; changed?: 'yes' | 'no' | 'unknown' },
  ): boolean => {
    if (!candidate || typeof candidate !== 'object') return false;
    const record = candidate as Record<string, unknown>;
    const correlationSource = String(record.source ?? '').trim();
    const eventKeyRaw = String(record.event_id ?? record.id ?? record.event_file ?? '').trim();
    const eventKey = eventKeyRaw.length > 0 ? eventKeyRaw : `${String(record.timestamp ?? '').trim()}::${String(record.action ?? fallback.action).trim()}`;
    if (eventKey.length > 0 && seenControlEventKeysRef.current.has(eventKey)) {
      return true;
    }
    if (eventKey.length > 0) {
      seenControlEventKeysRef.current.add(eventKey);
      if (seenControlEventKeysRef.current.size > 600) {
        const oldest = seenControlEventKeysRef.current.values().next();
        if (!oldest.done) seenControlEventKeysRef.current.delete(oldest.value);
      }
    }

    const rawState = String(record.state ?? '').trim();
    const mappedState = rawState ? runStatusToOperational(rawState) : fallback.state;
    const changed: 'yes' | 'no' | 'unknown' =
      record.extra && typeof record.extra === 'object' && typeof (record.extra as Record<string, unknown>).changed === 'boolean'
        ? (record.extra as Record<string, unknown>).changed
          ? 'yes'
          : 'no'
        : fallback.changed ?? 'unknown';
    const backendStatus = String(fallback.backendStatus ?? '').trim();
    const entry: ControlEvent = {
      id: eventKey.length > 0 ? eventKey : `${Date.now()}-${eventCounter.current}`,
      timestamp: String(record.timestamp ?? '').trim() || nowIso(),
      windowRole: sourceToWindowRole(correlationSource) ?? windowRole,
      action: String(record.action ?? '').trim() || fallback.action,
      state: mappedState,
      reason: String(record.reason ?? '').trim() || fallback.reason,
      nextAction: String(record.next_action ?? '').trim() || fallback.nextAction,
      severity: severityFromOperationalState(mappedState, changed),
      rawState: rawState || undefined,
      correlation: {
        sessionId: String(record.session_id ?? '').trim(),
        runId: String(record.run_id ?? '').trim(),
        traceId: String(record.trace_id ?? '').trim(),
        spanId: String(record.span_id ?? '').trim(),
        taskId: String(record.task_id ?? '').trim(),
        stepId: String(record.step_id ?? '').trim(),
        agentId: String(record.agent_id ?? '').trim(),
        role: String(record.role ?? '').trim(),
        runtimeTarget: String(record.runtime_target ?? '').trim(),
        source: correlationSource,
        eventFile: String(record.event_file ?? '').trim(),
        backendStatus,
        changed,
      },
    };
    eventCounter.current += 1;
    pushEventEntry(entry);
    return true;
  };

  const recordRuntimeProbe = (sample: { ok: boolean; runStatus: string; bootstrap: string; ready: boolean; bridgeHttp: number; error: string }) => {
    const tracker = runtimeProbeTrackerRef.current;
    tracker.samples += 1;
    if (!sample.ok) tracker.errors += 1;
    if (tracker.lastBridgeHttp !== null && tracker.lastBridgeHttp !== sample.bridgeHttp) tracker.bridgeFlaps += 1;
    if (tracker.lastReady !== null && tracker.lastReady !== sample.ready) tracker.readyTransitions += 1;
    if (tracker.lastRunStatus !== null && tracker.lastRunStatus !== sample.runStatus) tracker.runStatusTransitions += 1;
    if (tracker.lastBootstrap !== null && tracker.lastBootstrap !== sample.bootstrap) tracker.bootstrapTransitions += 1;
    tracker.lastRunStatus = sample.runStatus;
    tracker.lastBootstrap = sample.bootstrap;
    tracker.lastReady = sample.ready;
    tracker.lastBridgeHttp = sample.bridgeHttp;
    const pass = tracker.errors === 0 && tracker.bridgeFlaps === 0 && sample.bridgeHttp === 200;
    setRuntimeProbe({
      samples: tracker.samples,
      errors: tracker.errors,
      bridgeFlaps: tracker.bridgeFlaps,
      readyTransitions: tracker.readyTransitions,
      runStatusTransitions: tracker.runStatusTransitions,
      bootstrapTransitions: tracker.bootstrapTransitions,
      lastCheckedAt: nowIso(),
      lastRunStatus: sample.runStatus,
      lastBootstrap: sample.bootstrap,
      lastReady: sample.ready,
      lastBridgeHttp: sample.bridgeHttp,
      pass,
      reason: !sample.ok
        ? `Control-center poll failed: ${sample.error || 'unknown error'}`
        : pass
          ? 'Probe stable: no errors, no bridge flaps, bridge HTTP 200.'
          : `Probe unstable: errors=${tracker.errors}, bridge_flaps=${tracker.bridgeFlaps}, bridge_http=${sample.bridgeHttp}.`,
      nextAction: pass ? 'Continue monitoring with Refresh diagnostics.' : 'Inspect DevTools Bridge and apply reroute/recovery.',
    });
  };

  const resetRuntimeProbeCounters = () => {
    runtimeProbeTrackerRef.current = createRuntimeProbeTracker();
    setRuntimeProbe(EMPTY_RUNTIME_PROBE);
    setProbeSweepProgress({ current: 0, total: 0, lastSampleAt: '' });
    pushEvent('Reset state probe', 'Done', 'Runtime probe counters reset.', 'Run probe sweep for new baseline', 'info');
  };

  const applyIncomingSyncState = (payload: Partial<SyncState>) => {
    const cursorDecision = resolveSyncCursor(syncCursorRef.current, payload, windowInstanceId);
    if (!cursorDecision.accept) {
      return;
    }
    syncCursorRef.current = cursorDecision.cursor;
    const incomingRevision = Number(payload.revision ?? 0);
    if (!Number.isFinite(incomingRevision) || incomingRevision <= 0) {
      const incomingWindow = String(payload.sourceWindow ?? '');
      if (incomingWindow === windowRole && String(payload.sourceInstanceId ?? '') === windowInstanceId) {
        return;
      }
    }
    const incomingConnectionRevision = Number(payload.connectionRevision ?? 0);
    if (Number.isFinite(incomingConnectionRevision) && incomingConnectionRevision > connectionRevisionRef.current) {
      connectionRevisionRef.current = incomingConnectionRevision;
      if (payload.hubBaseUrl) setHubBaseUrl(payload.hubBaseUrl);
      if (payload.hubBaseInput) setHubBaseInput(payload.hubBaseInput);
      if (payload.openHandsBaseUrl) setOpenHandsBaseUrl(payload.openHandsBaseUrl);
      if (payload.openHandsBaseInput) setOpenHandsBaseInput(payload.openHandsBaseInput);
    }
    if (payload.dispatchPayload) setDispatchPayload(payload.dispatchPayload);
    if (payload.selectedTemplateId) setSelectedTemplateId(payload.selectedTemplateId);
    if (payload.autonomyProfileId) setAutonomyProfileId(payload.autonomyProfileId);
    if (payload.autonomyGoal) setAutonomyGoal(payload.autonomyGoal);
    if (payload.promptCommand) setPromptCommand(payload.promptCommand);
    if (payload.selectedRoleId) setSelectedRoleId(payload.selectedRoleId);
    if (payload.selectedStepKey !== undefined) setSelectedStepKey(payload.selectedStepKey);
  };

  const persistSyncState = () => {
    const revision = syncCursorRef.current.revision + 1;
    const updatedAt = nowIso();
    const payload: SyncState = {
      hubBaseUrl,
      hubBaseInput,
      openHandsBaseUrl,
      openHandsBaseInput,
      connectionRevision: connectionRevisionRef.current,
      dispatchPayload,
      selectedTemplateId,
      autonomyProfileId,
      autonomyGoal,
      promptCommand,
      selectedRoleId,
      selectedStepKey,
      revision,
      updatedAt,
      sourceWindow: windowRole,
      sourceInstanceId: windowInstanceId,
    };
    syncCursorRef.current = {
      revision,
      updatedAt,
      sourceWindow: windowRole,
      sourceInstanceId: windowInstanceId,
    };
    try { window.localStorage.setItem(syncStateKey, JSON.stringify(payload)); } catch { /* ignore */ }
    try { syncChannelRef.current?.postMessage(payload); } catch { /* ignore */ }
  };

  const hydrateSyncState = () => {
    try {
      const raw = window.localStorage.getItem(syncStateKey);
      if (!raw) return null;
      const payload = JSON.parse(raw) as Partial<SyncState>;
      applyIncomingSyncState(payload);
      return payload;
    } catch { /* ignore */ }
    return null;
  };

  const writeHeartbeat = () => {
    const nowEpoch = Date.now();
    const now = new Date(nowEpoch).toISOString();
    try {
      const raw = window.localStorage.getItem(heartbeatKey);
      const current = raw ? normalizeWindowPresencePayload(JSON.parse(raw)) : { commander: '-', glasshouse: '-', operations: '-' };
      const next = { ...current, [windowRole]: now };
      const stored = {
        commander: { iso: next.commander, epoch_ms: Date.parse(next.commander) || nowEpoch },
        glasshouse: { iso: next.glasshouse, epoch_ms: Date.parse(next.glasshouse) || nowEpoch },
        operations: { iso: next.operations, epoch_ms: Date.parse(next.operations) || nowEpoch },
      };
      window.localStorage.setItem(heartbeatKey, JSON.stringify(stored));
      setPresence(next);
    } catch {
      setPresence((current) => ({ ...current, [windowRole]: now }));
    }
  };

  const readHeartbeat = () => {
    try {
      const raw = window.localStorage.getItem(heartbeatKey);
      if (!raw) return;
      const payload = normalizeWindowPresencePayload(JSON.parse(raw));
      setPresence(payload);
    } catch { /* ignore */ }
  };

  const refreshBootstrapStatus = async () => {
    try {
      const response = await fetchWithTimeout(`${hubBaseUrl}/bootstrap/status`, { method: 'GET' }, 12000);
      const payload = await parseResponseSafely(response);
      const bootstrap = (payload.bootstrap && typeof payload.bootstrap === 'object' ? payload.bootstrap : {}) as Record<string, unknown>;
      const status = String(bootstrap.status ?? 'DOWN');
      const ready = bootstrap.ready === true && status === 'READY';
      setBootstrapState({ status, ready, summary: String(bootstrap.summary ?? ''), started_at: String(bootstrap.started_at ?? ''), finished_at: String(bootstrap.finished_at ?? ''), phases: Array.isArray(bootstrap.phases) ? (bootstrap.phases as Record<string, unknown>[]) : [] });
      setReadyForPromptExecution(Boolean(payload.ready_for_prompt_execute ?? ready));
      return status;
    } catch (error) {
      setBootstrapState({ status: 'DOWN', ready: false, summary: `Bootstrap status unreachable: ${parseErrorMessage(error)}`, phases: [] });
      setReadyForPromptExecution(false);
      return 'DOWN';
    }
  };

  const refreshPlatformChecks = async (targetHubBaseUrl?: string) => {
    if (typeof fetch !== 'function') {
      setPlatformStatus('Fetch API unavailable.');
      pushEvent('Refresh checks', 'Blocked', 'Fetch API unavailable in this runtime.', 'Run in browser runtime', 'error');
      return;
    }
    const effectiveHubBaseUrl = normalizeBaseUrl(targetHubBaseUrl ?? hubBaseUrl, LOCAL_HUB_BASE_URL);

    setPlatformBusy(true);
    setPlatformStatus('Running live checks for services, routing, registry, and run heartbeat...');

    let hubState: HealthState = 'down';
    let hubDetail = 'No response from /health';
    let routingTargets: Record<string, Record<string, unknown>> = {};
    let directServiceProbes: Record<string, Record<string, unknown>> = {};
    let bootstrapStatusLocal = 'DOWN';
    let promptReadyLocal = false;
    let controlCenterOk = false;
    let controlCenterError = '';
    let observedRunStatus = 'unknown';
    let observedBootstrapStatus = 'unknown';
    let observedReady = false;

    try {
      const stateResponse = await fetchWithTimeout(`${effectiveHubBaseUrl}/control-center/state?fresh=1`, { method: 'GET' }, 12000);
      const statePayload = await parseResponseSafely(stateResponse);
      controlCenterOk = stateResponse.ok;
      if (!stateResponse.ok) controlCenterError = `HTTP ${stateResponse.status}`;
      setRawControlCenterState(statePayload);
      const bootstrap = (statePayload.bootstrap && typeof statePayload.bootstrap === 'object' ? statePayload.bootstrap : {}) as Record<string, unknown>;
      const bootstrapStatus = String(bootstrap.status ?? 'DOWN');
      const bootstrapReady = bootstrap.ready === true && bootstrapStatus === 'READY';
      bootstrapStatusLocal = bootstrapStatus;
      promptReadyLocal = Boolean(statePayload.ready_for_prompt_execute ?? bootstrapReady);
      observedBootstrapStatus = bootstrapStatus;
      observedReady = promptReadyLocal;
      setBootstrapState({ status: bootstrapStatus, ready: bootstrapReady, summary: String(bootstrap.summary ?? ''), started_at: String(bootstrap.started_at ?? ''), finished_at: String(bootstrap.finished_at ?? ''), phases: Array.isArray(bootstrap.phases) ? (bootstrap.phases as Record<string, unknown>[]) : [] });
      setReadyForPromptExecution(promptReadyLocal);
      const runPayload = normalizeRunPayload(statePayload.latest_run);
      const latestRunRecord = statePayload.latest_run && typeof statePayload.latest_run === 'object'
        ? (statePayload.latest_run as Record<string, unknown>)
        : null;
      setCurrentRun(runPayload);
      if (runPayload) runHeartbeatRef.current = Date.now();
      setBackendTimelineRows(normalizeTimelineRows(statePayload.timeline));
      observedRunStatus = String(runPayload?.status ?? latestRunRecord?.status ?? 'unknown').trim().toUpperCase() || 'UNKNOWN';
      pushBackendControlEvent(statePayload.latest_control_event, {
        action: 'Control event',
        state: runPayload ? runStatusToOperational(runPayload.status) : 'Idle',
        reason: 'Live control event from control-center state.',
        nextAction: 'Review correlation fields in Glasshouse.',
      });
      if (statePayload.platform7_contract && typeof statePayload.platform7_contract === 'object') {
        const contractInfo = statePayload.platform7_contract as Record<string, unknown>;
        if (contractInfo.validation && typeof contractInfo.validation === 'object') {
          setPlatformContractValidation(contractInfo.validation as Record<string, unknown>);
        }
      }
      if (statePayload.service_probes && typeof statePayload.service_probes === 'object' && !Array.isArray(statePayload.service_probes)) {
        directServiceProbes = statePayload.service_probes as Record<string, Record<string, unknown>>;
      }
    } catch (error) {
      setReadyForPromptExecution(false);
      setBackendTimelineRows([]);
      controlCenterOk = false;
      controlCenterError = parseErrorMessage(error);
      pushEvent('Control-center poll', 'Blocked', `Failed to load /control-center/state: ${parseErrorMessage(error)}`, 'Check Dispatch Hub runtime', 'error');
    }

    try {
      const healthResponse = await fetchWithTimeout(`${effectiveHubBaseUrl}/health`, { method: 'GET' }, 8000);
      const healthPayload = await parseResponseSafely(healthResponse);
      hubState = healthResponse.ok ? 'up' : 'down';
      hubDetail = `HTTP ${healthResponse.status}`;
      setConnectionMessage(`Hub auto-check: ${effectiveHubBaseUrl}/health -> HTTP ${healthResponse.status}`);
      if (healthPayload.routing_status && typeof healthPayload.routing_status === 'object' && !Array.isArray(healthPayload.routing_status)) {
        routingTargets = healthPayload.routing_status as Record<string, Record<string, unknown>>;
      }
    } catch (error) {
      hubState = 'down';
      hubDetail = parseErrorMessage(error);
      setConnectionMessage(`Hub auto-check failed at ${effectiveHubBaseUrl}: ${parseErrorMessage(error)}`);
    }

    try {
      const agentsResponse = await fetchWithTimeout(`${effectiveHubBaseUrl}/agents`, { method: 'GET' }, 8000);
      const agentsPayload = await parseResponseSafely(agentsResponse);
      const normalizedAgents = Array.isArray(agentsPayload.active_agents) ? (agentsPayload.active_agents as AgentRecord[]) : Array.isArray(agentsPayload.agents) ? (agentsPayload.agents as AgentRecord[]) : [];
      setAgents(normalizedAgents);
      setAgentCounts({ active: Number(agentsPayload.active_count ?? 0), legacy: Number(agentsPayload.legacy_count ?? 0) });
    } catch {
      setAgents([]);
      setAgentCounts({ active: 0, legacy: 0 });
    }

    try {
      const routingResponse = await fetchWithTimeout(`${effectiveHubBaseUrl}/routing/status`, { method: 'GET' }, 8000);
      const routingPayload = await parseResponseSafely(routingResponse);
      setRoutingStatus(routingPayload);
      if (routingPayload.targets && typeof routingPayload.targets === 'object' && !Array.isArray(routingPayload.targets)) {
        routingTargets = routingPayload.targets as Record<string, Record<string, unknown>>;
      }
    } catch {
      setRoutingStatus({ status: 'unreachable', detail: 'Could not fetch /routing/status from dispatch hub.' });
    }

    try {
      const contractResponse = await fetchWithTimeout(`${effectiveHubBaseUrl}/platform7/contract`, { method: 'GET' }, 8000);
      const contractPayload = await parseResponseSafely(contractResponse);
      const normalizedContract = normalizePlatform7Contract(contractPayload.contract);
      if (normalizedContract) {
        setPlatformContract(normalizedContract);
        setPlatformContractValidation(
          contractPayload.validation && typeof contractPayload.validation === 'object'
            ? (contractPayload.validation as Record<string, unknown>)
            : null
        );
        if (!autonomyProfiles.length && normalizedContract.autonomy_profiles.length > 0) {
          setAutonomyProfiles(normalizedContract.autonomy_profiles);
          if (!autonomyProfileId && normalizedContract.autonomy_profiles[0]) {
            setAutonomyProfileId(normalizedContract.autonomy_profiles[0].id);
          }
        }
      }
    } catch {
      setPlatformContract(EMPTY_PLATFORM7_CONTRACT);
      setPlatformContractValidation({ ok: false, errors: ['Platform7 contract endpoint unreachable.'] });
    }

    try {
      const profilesResponse = await fetchWithTimeout(`${effectiveHubBaseUrl}/autonomy/profiles`, { method: 'GET' }, 8000);
      const profilesPayload = await parseResponseSafely(profilesResponse);
      const profiles = normalizeAutonomyProfiles(profilesPayload);
      if (profiles.length > 0) {
        setAutonomyProfiles(profiles);
        if (!profiles.some((profile) => profile.id === autonomyProfileId)) setAutonomyProfileId(profiles[0]?.id ?? '');
      }
    } catch {
      setAutonomyProfiles(platformContract.autonomy_profiles.length > 0 ? platformContract.autonomy_profiles : EMPTY_AUTONOMY_PROFILES);
    }

    try {
      const capabilitiesResponse = await fetchWithTimeout(`${effectiveHubBaseUrl}/autonomy/capabilities`, { method: 'GET' }, 8000);
      const capabilitiesPayload = await parseResponseSafely(capabilitiesResponse);
      setCapabilitiesStatus(capabilitiesPayload);
    } catch {
      setCapabilitiesStatus({ status: 'unreachable', limitations: ['Capabilities endpoint unreachable'] });
    }

    const checkedAt = nowIso();
    const resolveProbeStatusCode = (probe: Record<string, unknown> | undefined): number | null => {
      const effective = typeof probe?.effective_http_status === 'number' ? Number(probe.effective_http_status) : null;
      if (effective !== null && Number.isFinite(effective)) return effective;
      const raw = typeof probe?.http_status === 'number' ? Number(probe.http_status) : null;
      return raw !== null && Number.isFinite(raw) ? raw : null;
    };
    const serviceResults: ServiceHealth[] = SERVICE_CATALOG.map((service) => {
      if (!service.targetKey) {
        if (service.id === 'bolt') {
          return { id: service.id, label: service.label, source: service.source, state: hubState, detail: hubDetail, checkedAt, action: hubState === 'up' ? 'Service healthy' : 'Retry check or reroute endpoint' };
        }
        const probe = directServiceProbes[service.id];
        const statusCode = resolveProbeStatusCode(probe);
        const probeError = probe?.error ? String(probe.error) : '';
        const missingUrl = probeError.toLowerCase().includes('missing url');
        const recoveryReady = probe?.recovery_ready === true;
        const recoveryTarget = probe?.recovery_target ? String(probe.recovery_target) : '';
        const effectiveReason = probe?.effective_reason ? String(probe.effective_reason) : '';
        const isUp = statusCode === 200 || recoveryReady;
        return {
          id: service.id,
          label: service.label,
          source: service.source,
          state: isUp ? 'up' : missingUrl ? 'idle' : 'down',
          detail: isUp && recoveryReady
            ? `Recovery ready via ${recoveryTarget || 'alternate target'}. ${effectiveReason || probeError || 'Primary target degraded.'}`
            : statusCode === null ? probeError || 'No probe result' : `HTTP ${statusCode}${probeError ? ` (${probeError})` : ''}`,
          checkedAt,
          action: isUp ? (recoveryReady ? 'Recovery active, monitor timeline' : 'Monitor live heartbeat') : missingUrl ? 'Configure endpoint or reroute target' : 'Inspect bridge/runtime logs',
        };
      }
      const probe = routingTargets[service.targetKey];
      const statusCode = resolveProbeStatusCode(probe);
      const probeError = probe?.error ? String(probe.error) : '';
      const missingUrl = probeError.toLowerCase().includes('missing url');
      const recoveryReady = probe?.recovery_ready === true;
      const recoveryTarget = probe?.recovery_target ? String(probe.recovery_target) : '';
      const effectiveReason = probe?.effective_reason ? String(probe.effective_reason) : '';
      const isUp = statusCode === 200 || recoveryReady;
      return {
        id: service.id,
        label: service.label,
        source: service.source,
        state: isUp ? 'up' : missingUrl ? 'idle' : 'down',
        detail: isUp && recoveryReady
          ? `Recovery ready via ${recoveryTarget || 'alternate target'}. ${effectiveReason || probeError || 'Primary target degraded.'}`
          : statusCode === null ? probeError || 'No probe result' : `HTTP ${statusCode}${probeError ? ` (${probeError})` : ''}`,
        checkedAt,
        action: isUp ? (recoveryReady ? 'Recovery active; continue run and monitor' : 'Target healthy') : missingUrl ? 'Configure routing target URL' : 'Retry or reroute target',
      };
    });
    const bridgeProbeStatus = typeof directServiceProbes['devtools-bridge']?.http_status === 'number'
      ? Number(directServiceProbes['devtools-bridge'].http_status)
      : (serviceResults.find((entry) => entry.id === 'devtools-bridge')?.state === 'up' ? 200 : 0);
    recordRuntimeProbe({
      ok: controlCenterOk,
      runStatus: observedRunStatus || 'UNKNOWN',
      bootstrap: observedBootstrapStatus || 'UNKNOWN',
      ready: observedReady,
      bridgeHttp: bridgeProbeStatus,
      error: controlCenterError,
    });

    setServiceHealth(serviceResults);
    const upCount = serviceResults.filter((entry) => entry.state === 'up').length;
    setPlatformStatus(`Checks complete: ${upCount}/${serviceResults.length} services responding. Bootstrap: ${bootstrapStatusLocal}. Prompt Ready: ${promptReadyLocal ? 'yes' : 'no'}.`);
    setPlatformBusy(false);
    pushEvent('Refresh checks', upCount === serviceResults.length ? 'Done' : upCount === 0 ? 'Blocked' : 'Partial', `Service checks ${upCount}/${serviceResults.length}. Bootstrap ${bootstrapStatusLocal}. Prompt ready ${promptReadyLocal ? 'yes' : 'no'}.`, upCount === serviceResults.length ? 'Continue with dispatch' : 'Open Operations and apply recovery', upCount === serviceResults.length ? 'success' : upCount === 0 ? 'error' : 'warn');
  };

  const runProbeSweep = async (sampleCount = 10) => {
    if (probeSweepBusy) {
      pushEvent('Runtime probe sweep', 'Waiting', 'Probe sweep is already running.', 'Wait for current sweep to finish', 'warn');
      return;
    }
    const total = Number.isFinite(sampleCount) ? Math.max(1, Math.floor(sampleCount)) : 10;
    runtimeProbeTrackerRef.current = createRuntimeProbeTracker();
    setRuntimeProbe(EMPTY_RUNTIME_PROBE);
    setProbeSweepBusy(true);
    setProbeSweepProgress({ current: 0, total, lastSampleAt: '' });
    pushEvent('Runtime probe sweep', 'Running', `Starting ${total}-sample live probe sweep.`, 'Wait for completion summary', 'info');
    try {
      for (let index = 1; index <= total; index += 1) {
        await refreshPlatformChecks();
        setProbeSweepProgress({ current: index, total, lastSampleAt: nowIso() });
        if (index < total) {
          await new Promise((resolve) => window.setTimeout(resolve, 700));
        }
      }
      const tracker = runtimeProbeTrackerRef.current;
      const finalBridge = tracker.lastBridgeHttp ?? 0;
      const pass = tracker.errors === 0 && tracker.bridgeFlaps === 0 && finalBridge === 200;
      pushEvent(
        'Runtime probe sweep',
        pass ? 'Done' : 'Blocked',
        pass
          ? `Sweep passed: samples=${tracker.samples}, errors=${tracker.errors}, bridge_flaps=${tracker.bridgeFlaps}.`
          : `Sweep failed: samples=${tracker.samples}, errors=${tracker.errors}, bridge_flaps=${tracker.bridgeFlaps}, bridge_http=${finalBridge}.`,
        pass ? 'Continue autonomous run' : 'Inspect DevTools Bridge, reroute, or assign to human',
        pass ? 'success' : 'error',
      );
    } catch (error) {
      pushEvent('Runtime probe sweep', 'Failed', `Probe sweep aborted: ${parseErrorMessage(error)}`, 'Retry sweep after runtime recovery', 'error');
    } finally {
      setProbeSweepBusy(false);
    }
  };

  const saveConnectionSettings = () => {
    const nextHub = normalizeBaseUrl(hubBaseInput, LOCAL_HUB_BASE_URL);
    const nextOpenHands = normalizeBaseUrl(openHandsBaseInput, LOCAL_OPENHANDS_BASE_URL);
    setHubBaseUrl(nextHub);
    setHubBaseInput(nextHub);
    setOpenHandsBaseUrl(nextOpenHands);
    setOpenHandsBaseInput(nextOpenHands);
    setStoredValue(HUB_STORAGE_KEY, nextHub);
    setStoredValue(OPENHANDS_STORAGE_KEY, nextOpenHands);
    connectionRevisionRef.current += 1;
    setConnectionMessage(`Saved connection targets. Hub API: ${nextHub} | OpenHands: ${nextOpenHands}`);
    pushEvent('Save connection', 'Done', 'Connection targets saved.', 'Run refresh checks', 'success');
    persistSyncState();
    void refreshPlatformChecks(nextHub);
  };

  const resetConnectionSettings = () => {
    setHubBaseUrl(LOCAL_HUB_BASE_URL);
    setHubBaseInput(LOCAL_HUB_BASE_URL);
    setOpenHandsBaseUrl(LOCAL_OPENHANDS_BASE_URL);
    setOpenHandsBaseInput(LOCAL_OPENHANDS_BASE_URL);
    setStoredValue(HUB_STORAGE_KEY, LOCAL_HUB_BASE_URL);
    setStoredValue(OPENHANDS_STORAGE_KEY, LOCAL_OPENHANDS_BASE_URL);
    connectionRevisionRef.current += 1;
    setConnectionMessage('Reset to local defaults. Start local stack or set reachable remote hub URL.');
    pushEvent('Reset connection', 'Done', 'Connection reset to localhost defaults.', 'Run refresh checks', 'warn');
    persistSyncState();
    void refreshPlatformChecks(LOCAL_HUB_BASE_URL);
  };

  const testConnectionSettings = async () => {
    const testHub = normalizeBaseUrl(hubBaseInput, LOCAL_HUB_BASE_URL);
    setConnectionMessage(`Testing Hub API at ${testHub}/health ...`);
    pushEvent('Test connection', 'Running', `Calling ${testHub}/health.`, 'Wait for HTTP response', 'info');
    try {
      const response = await fetchWithTimeout(`${testHub}/health`, { method: 'GET' }, 8000);
      const payload = await parseResponseSafely(response);
      setConnectionMessage(`Hub connection test HTTP ${response.status}. ${JSON.stringify(payload).slice(0, 220)}`);
      pushEvent('Test connection', response.ok ? 'Done' : 'Blocked', `Connection test returned HTTP ${response.status}.`, response.ok ? 'Save and refresh checks' : 'Inspect hub health', response.ok ? 'success' : 'warn');
    } catch (error) {
      setConnectionMessage(`Hub connection blocked: ${parseErrorMessage(error)}.`);
      pushEvent('Test connection', 'Blocked', `Connection test failed: ${parseErrorMessage(error)}`, 'Inspect network and hub runtime', 'error');
    }
  };

  const applyTemplateToDispatch = () => {
    setDispatchPayload((current) => ({ ...current, agent: selectedTemplate.recommendedAgent, task: selectedTemplate.task, source: 'platform-template', status: 'queued', timestamp: nowIso() }));
    setAutonomyGoal(selectedTemplate.task);
    setPromptCommand(selectedTemplate.task);
    pushEvent('Apply template', 'Done', `Template ${selectedTemplate.title} applied to dispatch and prompts.`, 'Dispatch or run autonomy', 'success');
    persistSyncState();
  };

  const dispatchMission = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    if (typeof fetch !== 'function') {
      setDispatchMessage('Dispatch failed: fetch API unavailable.');
      pushEvent('Dispatch mission', 'Blocked', 'Fetch API unavailable.', 'Run in browser runtime', 'error');
      return;
    }
    const required: (keyof DispatchPayload)[] = ['agent', 'task', 'source', 'repo', 'ref', 'status', 'timestamp'];
    const missing = required.filter((field) => dispatchPayload[field].trim().length === 0);
    if (missing.length > 0) {
      const detail = `Dispatch rejected. Missing fields: ${missing.join(', ')}`;
      setDispatchMessage(detail);
      pushEvent('Dispatch mission', 'Blocked', detail, 'Fill required fields', 'warn');
      return;
    }

    setDispatchBusy(true);
    setDispatchMessage('Dispatch in progress...');
    pushEvent('Dispatch mission', 'Running', `Dispatching ${dispatchPayload.agent} on ${dispatchPayload.repo}@${dispatchPayload.ref}.`, 'Wait for response', 'info');
    try {
      const response = await fetchWithTimeout(`${hubBaseUrl}/dispatch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dispatchPayload) }, 9000);
      const payload = await parseResponseSafely(response);
      setDispatchMessage(`Dispatch response HTTP ${response.status}. ${JSON.stringify(payload).slice(0, 260)}`);
      setDispatchPayload((current) => ({ ...current, timestamp: nowIso() }));
      pushEvent('Dispatch mission', response.ok ? 'Done' : 'Partial', `Dispatch endpoint returned HTTP ${response.status}.`, response.ok ? 'Monitor run in Glasshouse' : 'Retry dispatch or reroute target', response.ok ? 'success' : 'warn');
      persistSyncState();
    } catch (error) {
      setDispatchMessage(`Dispatch failed: ${parseErrorMessage(error)}`);
      pushEvent('Dispatch mission', 'Failed', `Dispatch failed: ${parseErrorMessage(error)}`, 'Retry or inspect Operations', 'error');
    } finally {
      setDispatchBusy(false);
    }
  };

  const executePromptCommand = async () => {
    if (typeof fetch !== 'function') {
      setPromptMessage('Prompt execution failed: fetch API unavailable.');
      pushEvent('Prompt execute', 'Blocked', 'Fetch API unavailable.', 'Run in browser runtime', 'error');
      return;
    }
    if (!promptCommand.trim()) {
      setPromptMessage('Prompt execution rejected: prompt is empty.');
      pushEvent('Prompt execute', 'Blocked', 'Prompt command is empty.', 'Provide prompt text', 'warn');
      return;
    }

    const promptPayload = { prompt: promptCommand.trim(), source: `window:${windowRole}`, repo: dispatchPayload.repo, ref: dispatchPayload.ref, status: 'queued', profile_id: selectedAutonomyProfileId, halt_on_fail: false };
    setPromptBusy(true);
    setPromptMessage('Executing prompt command...');
    pushEvent('Prompt execute', 'Running', `Submitting prompt with profile ${selectedAutonomyProfileId}.`, 'Wait for run response', 'info');

    try {
      const response = await fetchWithTimeout(`${hubBaseUrl}/prompt/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(promptPayload) }, PROMPT_EXECUTION_TIMEOUT_MS);
      const payload = await parseResponseSafely(response);
      if (response.status === 409) {
        const fallbackResponse = await fetchWithTimeout(`${hubBaseUrl}/autonomy/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal: promptPayload.prompt, profile_id: promptPayload.profile_id, source: promptPayload.source, repo: promptPayload.repo, ref: promptPayload.ref, status: promptPayload.status, halt_on_fail: promptPayload.halt_on_fail }) }, PROMPT_EXECUTION_TIMEOUT_MS);
        const fallbackPayload = await parseResponseSafely(fallbackResponse);
        const fallbackRun = normalizeRunPayload(fallbackPayload);
        if (fallbackRun) {
          setCurrentRun(fallbackRun);
          runHeartbeatRef.current = Date.now();
          setPromptMessage(`Prompt fallback active. HTTP ${fallbackResponse.status}. Run ${fallbackRun.run_id} is ${fallbackRun.status}.`);
          pushEvent('Prompt execute', 'Partial', `Primary endpoint blocked; fallback run ${fallbackRun.run_id} started.`, 'Track run in Glasshouse', 'warn');
        } else {
          setPromptMessage(`Prompt fallback HTTP ${fallbackResponse.status}. ${JSON.stringify(fallbackPayload).slice(0, 220)}`);
          pushEvent('Prompt execute', 'Failed', 'Fallback returned no run payload.', 'Retry once readiness is recovered', 'error');
        }
      } else {
        const runPayload = normalizeRunPayload(payload.run);
        if (runPayload) {
          setCurrentRun(runPayload);
          runHeartbeatRef.current = Date.now();
          setPromptMessage(`Prompt response HTTP ${response.status}. Run ${runPayload.run_id} is ${runPayload.status}.`);
          pushEvent('Prompt execute', runStatusToOperational(runPayload.status), `Run ${runPayload.run_id} started.`, 'Monitor run timeline in Glasshouse', response.ok ? 'success' : 'warn');
        } else {
          setPromptMessage(`Prompt response HTTP ${response.status}. ${JSON.stringify(payload).slice(0, 220)}`);
          pushEvent('Prompt execute', response.ok ? 'Partial' : 'Failed', `Prompt endpoint returned HTTP ${response.status} without run object.`, 'Inspect Operations raw JSON', response.ok ? 'warn' : 'error');
        }
      }
      persistSyncState();
      void refreshPlatformChecks();
    } catch (error) {
      setPromptMessage(`Prompt execution failed: ${parseErrorMessage(error)}`);
      pushEvent('Prompt execute', 'Failed', `Prompt execution failed: ${parseErrorMessage(error)}`, 'Retry or reroute runtime target', 'error');
    } finally {
      setPromptBusy(false);
    }
  };

  const runAutonomyPipeline = async () => {
    if (typeof fetch !== 'function') {
      setAutonomyMessage('Autonomy run failed: fetch API unavailable.');
      pushEvent('Autonomy run', 'Blocked', 'Fetch API unavailable.', 'Run in browser runtime', 'error');
      return;
    }
    if (!autonomyGoal.trim()) {
      setAutonomyMessage('Autonomy run rejected: goal prompt is empty.');
      pushEvent('Autonomy run', 'Blocked', 'Goal prompt is empty.', 'Provide goal prompt', 'warn');
      return;
    }

    const requestPayload = { goal: autonomyGoal.trim(), profile_id: selectedAutonomyProfileId, source: `window:${windowRole}`, repo: dispatchPayload.repo, ref: dispatchPayload.ref, status: 'queued', halt_on_fail: false };
    setAutonomyBusy(true);
    setAutonomyMessage('Autonomous run in progress...');
    pushEvent('Autonomy run', 'Running', `Submitting autonomy goal with profile ${selectedAutonomyProfileId}.`, 'Wait for run response', 'info');

    try {
      const response = await fetchWithTimeout(`${hubBaseUrl}/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload) }, AUTONOMY_RUN_TIMEOUT_MS);
      const payload = await parseResponseSafely(response);
      if (response.status === 409) {
        const fallbackResponse = await fetchWithTimeout(`${hubBaseUrl}/autonomy/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload) }, AUTONOMY_RUN_TIMEOUT_MS);
        const fallbackPayload = await parseResponseSafely(fallbackResponse);
        const fallbackRun = normalizeRunPayload(fallbackPayload);
        if (fallbackRun) {
          setCurrentRun(fallbackRun);
          runHeartbeatRef.current = Date.now();
          setAutonomyMessage(`Autonomy fallback active. HTTP ${fallbackResponse.status}. Run ${fallbackRun.run_id} is ${fallbackRun.status}.`);
          pushEvent('Autonomy run', 'Partial', `Primary endpoint blocked; fallback run ${fallbackRun.run_id} started.`, 'Track fallback run', 'warn');
        } else {
          setAutonomyMessage(`Autonomy fallback HTTP ${fallbackResponse.status}. ${JSON.stringify(fallbackPayload).slice(0, 220)}`);
          pushEvent('Autonomy run', 'Failed', 'Fallback returned no run payload.', 'Retry after readiness recovery', 'error');
        }
      } else {
        const runPayload = normalizeRunPayload(payload);
        if (runPayload) {
          setCurrentRun(runPayload);
          runHeartbeatRef.current = Date.now();
          setAutonomyMessage(`Autonomy response HTTP ${response.status}. Run ${runPayload.run_id} is ${runPayload.status}.`);
          pushEvent('Autonomy run', runStatusToOperational(runPayload.status), `Run ${runPayload.run_id} created.`, 'Track run in Glasshouse', response.ok ? 'success' : 'warn');
        } else {
          setAutonomyMessage(`Autonomy response HTTP ${response.status}. ${JSON.stringify(payload).slice(0, 220)}`);
          pushEvent('Autonomy run', response.ok ? 'Partial' : 'Failed', `Autonomy endpoint returned HTTP ${response.status} without run payload.`, 'Inspect Operations raw JSON', response.ok ? 'warn' : 'error');
        }
      }
      persistSyncState();
      void refreshPlatformChecks();
    } catch (error) {
      setAutonomyMessage(`Autonomy run failed: ${parseErrorMessage(error)}`);
      pushEvent('Autonomy run', 'Failed', `Autonomy run failed: ${parseErrorMessage(error)}`, 'Retry or inspect service health', 'error');
    } finally {
      setAutonomyBusy(false);
    }
  };

  const runControlAction = async (actionName: 'stop' | 'pause' | 'resume' | 'retry-last-step' | 'rollback', label: string) => {
    if (!currentRun?.run_id) {
      pushEvent(label, 'Blocked', 'No active run id available.', 'Start or load a run first', 'warn');
      return;
    }
    const endpoint = `${hubBaseUrl}/runs/${currentRun.run_id}/${actionName}`;
    const payload = {
      source: `window:${windowRole}`,
      reason: label,
      session_id: sessionId,
      trace_id: activeStep?.trace_id || currentRun.trace_id || '',
      span_id: activeStep?.call_id || activeStep?.step_id || '',
      task_id: activeStep?.task_id || currentRun.task_id || '',
      step_id: activeStep?.step_id || activeStep?.call_id || '',
      agent_id: activeStep?.agent || currentRun.current_agent || '',
      role: activeStep?.role || '',
      runtime_target: activeStep?.runtime_target || '',
    };
    pushEvent(label, 'Running', `Trying ${actionName} for run ${currentRun.run_id}.`, 'Wait for endpoint response', 'info');
    try {
      const response = await fetchWithTimeout(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, 9000);
      const body = await parseResponseSafely(response);
      if (!response.ok) {
        pushEvent(label, 'Blocked', `${label} failed via ${endpoint} (HTTP ${response.status}).`, 'Inspect Operations and retry with reason', 'error');
        return;
      }
      const runStatus = runStatusToOperational(String(body.run_status ?? currentRun.status ?? 'UNKNOWN'));
      const reason = String(body.reason ?? `${label} executed.`);
      const nextAction = String(body.next_action ?? 'Refresh checks and validate run state');
      const changed: 'yes' | 'no' | 'unknown' = typeof body.changed === 'boolean' ? (body.changed ? 'yes' : 'no') : 'unknown';
      const backendStatus = String(body.status ?? '').trim();
      const updatedRun = normalizeRunPayload(body.run);
      if (updatedRun) {
        setCurrentRun(updatedRun);
        runHeartbeatRef.current = Date.now();
      }
      const emitted = pushBackendControlEvent(body.event, {
        action: label,
        state: runStatus,
        reason,
        nextAction,
        backendStatus,
        changed,
      });
      if (!emitted) pushEvent(label, runStatus, reason, nextAction, severityFromOperationalState(runStatus, changed));
      await refreshPlatformChecks();
    } catch (error) {
      pushEvent(label, 'Blocked', `${label} failed: ${parseErrorMessage(error)}`, 'Use reroute/assign-to-human intervention', 'error');
    }
  };

  const rerouteTarget = async (mode: 'remote' | 'local') => {
    const attempts = currentRun?.run_id
      ? [`${hubBaseUrl}/runs/${currentRun.run_id}/reroute/${mode}`, `${hubBaseUrl}/routing/override`, `${hubBaseUrl}/routing/set`]
      : [`${hubBaseUrl}/routing/override`, `${hubBaseUrl}/routing/set`];
    pushEvent(`Reroute ${mode}`, 'Running', `Attempting reroute to ${mode}.`, 'Wait for routing response', 'info');
    const failures: string[] = [];
    for (const endpoint of attempts) {
      try {
        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            run_id: currentRun?.run_id ?? '',
            source: `window:${windowRole}`,
            reason: `Operator reroute to ${mode}`,
            session_id: sessionId,
            trace_id: activeStep?.trace_id || currentRun?.trace_id || '',
            span_id: activeStep?.call_id || activeStep?.step_id || '',
            task_id: activeStep?.task_id || currentRun?.task_id || '',
            step_id: activeStep?.step_id || activeStep?.call_id || '',
            agent_id: activeStep?.agent || currentRun?.current_agent || '',
            role: activeStep?.role || '',
            runtime_target: activeStep?.runtime_target || '',
          }),
        }, 8000);
        if (response.ok) {
          const body = await parseResponseSafely(response);
          const emitted = pushBackendControlEvent(body.event, {
            action: `Reroute ${mode}`,
            state: 'Done',
            reason: `Routing switched to ${mode} via ${endpoint}.`,
            nextAction: 'Retry blocked step',
            backendStatus: String(body.status ?? 'ok'),
            changed: 'yes',
          });
          if (!emitted) {
            pushEvent(`Reroute ${mode}`, 'Done', `Routing switched to ${mode} via ${endpoint}.`, 'Retry blocked step', 'success');
          }
          await refreshPlatformChecks();
          return;
        }
        failures.push(`${endpoint} -> HTTP ${response.status}`);
      } catch (error) {
        failures.push(`${endpoint} -> ${parseErrorMessage(error)}`);
      }
    }
    pushEvent(`Reroute ${mode}`, 'Blocked', `Reroute failed: ${failures.join(' | ')}`, 'Assign to human or inspect routing service', 'error');
  };

  const quarantineArtifact = async () => {
    const artifact = activeStep?.final_code_artifact || activeStep?.dispatch_artifact || currentRun?.run_file;
    if (!artifact) {
      pushEvent('Quarantine artifact', 'Blocked', 'No artifact reference available.', 'Select a step with evidence', 'warn');
      return;
    }
    const attempts = currentRun?.run_id
      ? [`${hubBaseUrl}/runs/${currentRun.run_id}/quarantine`, `${hubBaseUrl}/evidence/quarantine`, `${hubBaseUrl}/artifacts/quarantine`]
      : [`${hubBaseUrl}/evidence/quarantine`, `${hubBaseUrl}/artifacts/quarantine`];
    const failures: string[] = [];
    for (const endpoint of attempts) {
      try {
        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifact,
            run_id: currentRun?.run_id ?? '',
            source: `window:${windowRole}`,
            reason: 'Operator quarantine request',
            session_id: sessionId,
            trace_id: activeStep?.trace_id || currentRun?.trace_id || '',
            span_id: activeStep?.call_id || activeStep?.step_id || '',
            task_id: activeStep?.task_id || currentRun?.task_id || '',
            step_id: activeStep?.step_id || activeStep?.call_id || '',
            agent_id: activeStep?.agent || currentRun?.current_agent || '',
            role: activeStep?.role || '',
            runtime_target: activeStep?.runtime_target || '',
          }),
        }, 8000);
        if (response.ok) {
          const body = await parseResponseSafely(response);
          const emitted = pushBackendControlEvent(body.event, {
            action: 'Quarantine artifact',
            state: 'Done',
            reason: `Artifact quarantined via ${endpoint}.`,
            nextAction: 'Review evidence browser',
            backendStatus: String(body.status ?? 'ok'),
            changed: 'yes',
          });
          if (!emitted) {
            pushEvent('Quarantine artifact', 'Done', `Artifact quarantined via ${endpoint}.`, 'Review evidence browser', 'success');
          }
          return;
        }
        failures.push(`${endpoint} -> HTTP ${response.status}`);
      } catch (error) {
        failures.push(`${endpoint} -> ${parseErrorMessage(error)}`);
      }
    }
    pushEvent('Quarantine artifact', 'Failed', `Quarantine failed: ${failures.join(' | ')}`, 'Assign manual quarantine task', 'error');
  };

  const assignToHuman = async () => {
    if (!currentRun?.run_id) {
      pushEvent('Assign to human', 'Blocked', 'No active run id available.', 'Start or load a run first', 'warn');
      return;
    }
    const attempts = [`${hubBaseUrl}/runs/${currentRun.run_id}/assign-human`];
    pushEvent('Assign to human', 'Running', `Assigning run ${currentRun.run_id} to human operator.`, 'Wait for control response', 'info');
    const failures: string[] = [];
    for (const endpoint of attempts) {
      try {
        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: `window:${windowRole}`,
            reason: 'Operator takeover requested from Glasshouse',
            session_id: sessionId,
            trace_id: activeStep?.trace_id || currentRun.trace_id || '',
            span_id: activeStep?.call_id || activeStep?.step_id || '',
            task_id: activeStep?.task_id || currentRun.task_id || '',
            step_id: activeStep?.step_id || activeStep?.call_id || '',
            agent_id: activeStep?.agent || currentRun.current_agent || '',
            role: activeStep?.role || '',
            runtime_target: activeStep?.runtime_target || '',
          }),
        }, 8000);
        if (!response.ok) {
          failures.push(`${endpoint} -> HTTP ${response.status}`);
          continue;
        }
        const body = await parseResponseSafely(response);
        const emitted = pushBackendControlEvent(body.event, {
          action: 'Assign to human',
          state: 'Waiting',
          reason: String(body.reason ?? 'Run assigned to human operator.'),
          nextAction: String(body.next_action ?? 'Operator resolves blocker and resumes'),
          backendStatus: String(body.status ?? 'ok'),
          changed:
            typeof body.changed === 'boolean'
              ? (body.changed ? 'yes' : 'no')
              : 'unknown',
        });
        if (!emitted) {
          pushEvent('Assign to human', 'Waiting', 'Run ownership moved to human operator.', 'Operator resolves blocker and resumes', 'warn');
        }
        await refreshPlatformChecks();
        return;
      } catch (error) {
        failures.push(`${endpoint} -> ${parseErrorMessage(error)}`);
      }
    }
    pushEvent('Assign to human', 'Blocked', `Assign failed: ${failures.join(' | ')}`, 'Retry assign or use manual takeover', 'error');
  };

  const openEvidence = (preferredOverride?: string) => {
    const preferred = preferredOverride || activeStep?.final_code_url || activeStep?.final_code_artifact || currentRun?.evidence_manifest_latest || currentRun?.evidence_manifest || currentRun?.run_file || currentRun?.snapshot;
    if (!preferred) {
      pushEvent('Open evidence', 'Blocked', 'No evidence path available.', 'Run a task to generate evidence', 'warn');
      return;
    }
    if (preferred.startsWith('/')) {
      window.open(`${hubBaseUrl}${preferred}`, '_blank', 'noopener,noreferrer');
      pushEvent('Open evidence', 'Done', `Opened evidence at ${hubBaseUrl}${preferred}.`, 'Verify artifact contents', 'success');
      return;
    }
    if (/^https?:\/\//i.test(preferred)) {
      window.open(preferred, '_blank', 'noopener,noreferrer');
      pushEvent('Open evidence', 'Done', `Opened external evidence ${preferred}.`, 'Verify artifact contents', 'success');
      return;
    }
    navigator.clipboard.writeText(preferred).catch(() => undefined);
    pushEvent('Open evidence', 'Partial', 'Local path copied to clipboard.', 'Open path manually from runtime workspace', 'warn');
  };

  const startBootstrap = async () => {
    if (typeof fetch !== 'function') {
      setPlatformStatus('Bootstrap unavailable: fetch API missing.');
      pushEvent('Start bootstrap', 'Blocked', 'Fetch API unavailable.', 'Run in browser runtime', 'error');
      return;
    }
    setBootstrapBusy(true);
    setPlatformStatus('Starting container-safe bootstrap...');
    pushEvent('Start bootstrap', 'Running', 'POST /bootstrap/start requested.', 'Wait for bootstrap status', 'info');
    try {
      const response = await fetchWithTimeout(`${hubBaseUrl}/bootstrap/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ include_script_start: false, source: `window:${windowRole}` }) }, 10000);
      const payload = await parseResponseSafely(response);
      setPlatformStatus(`Bootstrap request HTTP ${response.status}. ${JSON.stringify(payload).slice(0, 240)}`);
      let terminal = '';
      for (let attempt = 1; attempt <= 20; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        terminal = await refreshBootstrapStatus();
        if (terminal !== 'BOOTING') break;
      }
      if (terminal === 'READY') {
        setPlatformStatus('Bootstrap ready. Prompt command layer unlocked.');
        pushEvent('Start bootstrap', 'Done', 'Bootstrap reached READY state.', 'Proceed with prompt or dispatch', 'success');
      } else if (terminal === 'BOOTING') {
        setPlatformStatus('Bootstrap still running. Refresh checks to update status.');
        pushEvent('Start bootstrap', 'Waiting', 'Bootstrap still running after polling window.', 'Refresh checks', 'warn');
      } else {
        pushEvent('Start bootstrap', 'Partial', `Bootstrap terminal state ${terminal || 'unknown'}.`, 'Inspect preflight errors in Operations', 'warn');
      }
      await refreshPlatformChecks();
    } catch (error) {
      setPlatformStatus(`Bootstrap failed: ${parseErrorMessage(error)}`);
      pushEvent('Start bootstrap', 'Failed', `Bootstrap failed: ${parseErrorMessage(error)}`, 'Retry bootstrap or inspect runtime services', 'error');
    } finally {
      setBootstrapBusy(false);
    }
  };

  const openOpenHands = () => {
    window.open(openHandsBaseUrl, '_blank', 'noopener,noreferrer');
    pushEvent('Open OpenHands', 'Done', `Opened OpenHands at ${openHandsBaseUrl}.`, 'Continue with task execution', 'info');
  };

  const openSynchronizedWindows = () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const specs = 'width=1480,height=980,noopener,noreferrer';
    const c = window.open(`${baseUrl}?window=commander&session=${sessionId}`, 'godmode-commander', specs);
    const g = window.open(`${baseUrl}?window=glasshouse&session=${sessionId}`, 'godmode-glasshouse', specs);
    const o = window.open(`${baseUrl}?window=operations&session=${sessionId}`, 'godmode-operations', specs);
    const blocked = [c, g, o].filter((entry) => !entry).length;
    if (blocked > 0) pushEvent('Open synchronized windows', 'Partial', `${blocked}/3 windows blocked by popup policy.`, 'Allow popups and retry', 'warn');
    else pushEvent('Open synchronized windows', 'Done', 'Commander, Glasshouse, and Operations opened for same session.', 'Verify heartbeat badges are Running', 'success');
  };

  useEffect(() => {
    setStoredValue(SESSION_STORAGE_KEY, sessionId);
    const hydratedState = hydrateSyncState();
    const savedHub = normalizeBaseUrl(getStoredValue(HUB_STORAGE_KEY), hubBaseUrl);
    const savedOpenHands = normalizeBaseUrl(getStoredValue(OPENHANDS_STORAGE_KEY), openHandsBaseUrl);
    setHubBaseUrl(savedHub);
    setHubBaseInput(savedHub);
    setOpenHandsBaseUrl(savedOpenHands);
    setOpenHandsBaseInput(savedOpenHands);
    if (hydratedState?.connectionRevision && Number.isFinite(Number(hydratedState.connectionRevision))) {
      connectionRevisionRef.current = Math.max(connectionRevisionRef.current, Number(hydratedState.connectionRevision));
    }
    const hydratedHub = savedHub;
    void refreshPlatformChecks(hydratedHub);
    writeHeartbeat();
    readHeartbeat();
    if ('BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel(`${SYNC_CHANNEL_PREFIX}.${sessionId}`);
        syncChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (!event?.data || typeof event.data !== 'object') return;
          applyIncomingSyncState(event.data as Partial<SyncState>);
        };
      } catch {
        syncChannelRef.current = null;
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === syncStateKey && event.newValue) {
        try {
          const payload = JSON.parse(event.newValue) as Partial<SyncState>;
          applyIncomingSyncState(payload);
        } catch {
          /* ignore malformed sync payload */
        }
      }
      if (event.key === heartbeatKey) readHeartbeat();
    };
    window.addEventListener('storage', onStorage);
    const heartbeatTimer = window.setInterval(() => {
      writeHeartbeat();
      readHeartbeat();
    }, 2500);
    const refreshTimer = window.setInterval(() => {
      void refreshPlatformChecks();
    }, currentRunOperational === 'Running' || currentRunOperational === 'Waiting' ? 4000 : 30000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(heartbeatTimer);
      window.clearInterval(refreshTimer);
      try { syncChannelRef.current?.close(); } catch { /* ignore */ }
      syncChannelRef.current = null;
    };
  }, [sessionId, syncStateKey, heartbeatKey, hubBaseUrl, currentRunOperational]);

  useEffect(() => {
    persistSyncState();
  }, [hubBaseUrl, hubBaseInput, openHandsBaseUrl, openHandsBaseInput, dispatchPayload, selectedTemplateId, autonomyProfileId, autonomyGoal, promptCommand, selectedRoleId, selectedStepKey]);

  const quickSummary = { selectedAgent: dispatchPayload.agent, selectedProfile: selectedAutonomyProfileLabel, repo: dispatchPayload.repo, branch: dispatchPayload.ref, currentRun: currentRun?.run_id ?? '-', activeAI: currentRun?.current_agent || activeStep?.agent || '-' };

  const presenceState = (role: WindowRole): OperationalState => {
    const seen = presence[role];
    if (!seen || seen === '-') return 'Idle';
    const heartbeat = heartbeatAge(seen);
    if (heartbeat.isInvalid || heartbeat.isClockSkew) return 'Blocked';
    if ((heartbeat.ageMs ?? 0) > WINDOW_HEARTBEAT_STALE_MS) return 'Stale';
    return 'Running';
  };

  const renderStatusChip = (state: OperationalState) => <span className={operationalChipClass(state)}><span aria-hidden="true">{OPERATIONAL_META[state].symbol}</span> {state}</span>;
  const renderMaturityChip = (state: MaturityState) => <span className={maturityChipClass(state)}><span aria-hidden="true">{MATURITY_META[state].symbol}</span> {state}</span>;
  const renderEventEntry = (entry: ControlEvent) => {
    const c = entry.correlation;
    return (
      <li key={entry.id} className={`event event--${entry.severity}`}>
        <p><strong>{entry.action}</strong> {renderStatusChip(entry.state)}</p>
        <p>{entry.reason}</p>
        {c ? <p>run_id: {c.runId || '-'} | trace_id: {c.traceId || '-'} | task_id: {c.taskId || '-'}</p> : null}
        {c ? <p>step_id: {c.stepId || '-'} | agent_id: {c.agentId || '-'} | role: {c.role || '-'}</p> : null}
        {c ? <p>runtime_target: {c.runtimeTarget || '-'} | session_id: {c.sessionId || '-'} | span_id: {c.spanId || '-'}</p> : null}
        {c ? <p>source: {c.source || '-'} | backend: {c.backendStatus || '-'} | changed: {c.changed}</p> : null}
        <p>Next: {entry.nextAction} | {entry.timestamp}</p>
      </li>
    );
  };

  const renderCommander = () => (
    <section className="window-body window-body--commander" aria-label="Commander window">
      <article className="panel panel--summary">
        <h2>Commander</h2>
        <p className="muted">Main controls stay here: role selection, prompt input, dispatch controls, and run quick actions.</p>
        <div className="summary-grid">
          <p>Selected agent<strong>{quickSummary.selectedAgent}</strong></p>
          <p>Profile<strong>{quickSummary.selectedProfile}</strong></p>
          <p>Repo<strong>{quickSummary.repo}</strong></p>
          <p>Branch<strong>{quickSummary.branch}</strong></p>
          <p>Current run<strong>{quickSummary.currentRun}</strong></p>
          <p>Active AI<strong>{quickSummary.activeAI}</strong></p>
        </div>
        <div className="button-row">
          <button type="button" className="button button--primary" onClick={() => void dispatchMission()}>Dispatch starten</button>
          <button type="button" className="button button--primary" onClick={() => void runAutonomyPipeline()} disabled={autonomyBusy || !selectedAutonomyProfileId || profileMissingFromContract}>Autonomous Run starten</button>
          <button type="button" className="button" onClick={() => void runControlAction('stop', 'Stop run')}>Stop</button>
          <button type="button" className="button" onClick={() => void runControlAction('pause', 'Pause run')}>Pause</button>
          <button type="button" className="button" onClick={() => void runControlAction('resume', 'Resume run')}>Resume</button>
          <button type="button" className="button" onClick={() => void runControlAction('retry-last-step', 'Retry letzter Schritt')}>Retry letzter Schritt</button>
          <button type="button" className="button" onClick={() => openEvidence()}>Open Evidence</button>
        </div>
      </article>

      <article className="panel">
        <h3>Connections</h3>
        <p className="status-banner">{connectionMessage}</p>
        <div className="field-grid">
          <label htmlFor="dispatch-hub-url">Dispatch Hub API URL
            <input id="dispatch-hub-url" name="dispatch_hub_url" value={hubBaseInput} onChange={(event) => setHubBaseInput(event.target.value)} />
          </label>
          <label htmlFor="openhands-ui-url">OpenHands UI URL
            <input id="openhands-ui-url" name="openhands_ui_url" value={openHandsBaseInput} onChange={(event) => setOpenHandsBaseInput(event.target.value)} />
          </label>
        </div>
        <div className="button-row">
          <button type="button" className="button" onClick={saveConnectionSettings}>Save connection</button>
          <button type="button" className="button" onClick={() => void testConnectionSettings()}>Test Hub connection</button>
          <button type="button" className="button" onClick={resetConnectionSettings}>Reset local defaults</button>
          <button type="button" className="button" onClick={() => void refreshPlatformChecks()} disabled={platformBusy}>{platformBusy ? 'Checking...' : 'Refresh checks'}</button>
          <button type="button" className="button" onClick={openOpenHands}>Open OpenHands</button>
          <button type="button" className="button" onClick={() => void startBootstrap()} disabled={bootstrapBusy}>{bootstrapBusy ? 'Bootstrapping...' : 'Start bootstrap'}</button>
        </div>
      </article>

      <article className="panel">
        <h3>Prompt + Dispatch</h3>
        <label htmlFor="prompt-template">Template
          <select id="prompt-template" name="prompt_template" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
            {PROMPT_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
          </select>
        </label>
        <p className="muted">Recommended: <code>{selectedTemplate.recommendedAgent}</code></p>
        <div className="button-row"><button type="button" className="button" onClick={applyTemplateToDispatch}>Apply template</button></div>

        <form className="dispatch-form" onSubmit={dispatchMission}>
          <label htmlFor="dispatch-agent">Agent
            <input id="dispatch-agent" name="dispatch_agent" value={dispatchPayload.agent} onChange={(event) => setDispatchPayload((current) => ({ ...current, agent: event.target.value }))} />
          </label>
          <label htmlFor="dispatch-task">Task
            <textarea id="dispatch-task" name="dispatch_task" rows={4} value={dispatchPayload.task} onChange={(event) => setDispatchPayload((current) => ({ ...current, task: event.target.value }))} />
          </label>
          <div className="field-grid">
            <label htmlFor="dispatch-repo">Repo
              <input id="dispatch-repo" name="dispatch_repo" value={dispatchPayload.repo} onChange={(event) => setDispatchPayload((current) => ({ ...current, repo: event.target.value }))} />
            </label>
            <label htmlFor="dispatch-branch">Branch
              <input id="dispatch-branch" name="dispatch_branch" value={dispatchPayload.ref} onChange={(event) => setDispatchPayload((current) => ({ ...current, ref: event.target.value }))} />
            </label>
          </div>
          <label htmlFor="autonomy-profile">Profile
            <select id="autonomy-profile" name="autonomy_profile" value={selectedAutonomyProfileId} onChange={(event) => setAutonomyProfileId(event.target.value)}>
              {effectiveAutonomyProfiles.length === 0 ? <option value="">No profile loaded</option> : null}
              {effectiveAutonomyProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
            </select>
          </label>
          <p className="muted">Profile source: <code>{autonomyProfileSource}</code> | Contract version: <code>{platformContract.version}</code></p>
          <label htmlFor="prompt-command">Prompt command
            <textarea id="prompt-command" name="prompt_command" rows={6} value={promptCommand} onChange={(event) => setPromptCommand(event.target.value)} />
          </label>
          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={dispatchBusy}>{dispatchBusy ? 'Dispatching...' : 'Dispatch starten'}</button>
            <button type="button" className="button button--primary" onClick={() => void executePromptCommand()} disabled={promptBusy || !readyForPromptExecution || !selectedAutonomyProfileId || profileMissingFromContract}>{promptBusy ? 'Executing...' : 'Prompt ausfuehren'}</button>
          </div>
        </form>
        <p className="status-banner">{dispatchMessage}</p>
        <p className="status-banner">{promptMessage}</p>
        <p className="status-banner">{autonomyMessage}</p>
        <p className="status-banner">Bootstrap status: <strong>{bootstrapState.status}</strong> | Prompt Ready: <strong>{readyForPromptExecution ? 'YES' : 'NO'}</strong></p>
        {profileSelectionReason ? <p className="status-banner">Profile gate: <strong>{profileSelectionReason}</strong></p> : null}
      </article>

      <article className="panel">
        <h3>Visible Roles ({roleCards.length})</h3>
        <p className="muted">{workerRoleCount} worker roles plus {supervisorRoleCount} permanent supervisors. Namespace IDs are shown only in drilldown.</p>
        {!roleCards.length ? <p className="status-banner">Contract not loaded. Operations will show why the truth source is unavailable.</p> : null}
        <div className="role-grid" role="list" aria-label="Visible operator roles">
          {roleCards.map((role) => (
            <button key={role.id} type="button" className={`role-card ${selectedRoleId === role.id ? 'role-card--selected' : ''}`} onClick={() => setSelectedRoleId(role.id)}>
              <span className="role-card__title">{role.name}</span>
              <span className="role-card__lane">{role.lane}</span>
              <span>{renderStatusChip(role.state)}</span>
              <span>{renderMaturityChip(role.maturity)}</span>
              {role.kind === 'supervisor' ? <span className="lock-badge">LOCKED ON</span> : null}
            </button>
          ))}
        </div>
        <div className="drilldown">
          <h4>Role drilldown</h4>
          <p>Role: <strong>{selectedRole?.name ?? '-'}</strong></p>
          <p>Namespace: <code>{selectedRole?.namespace ?? '-'}</code></p>
          <p>Reason: {selectedRole?.note ?? 'No role selected'}</p>
          <p>Action: {selectedRole ? OPERATIONAL_META[selectedRole.state].action : 'Select role to view action'}</p>
        </div>
      </article>

      <article className="panel">
        <h3>Live Event Feed</h3>
        <p className="status-banner">{platformStatus}</p>
        <ul className="event-list">{events.slice(0, 18).map((entry) => renderEventEntry(entry))}</ul>
      </article>
    </section>
  );

  const renderGlasshouse = () => (
    <section className="window-body window-body--glasshouse" aria-label="Glasshouse window">
      <article className="panel panel--summary">
        <h2>Glasshouse</h2>
        <p className="muted">Live transparency stream: timeline, lanes, evidence, and intervention controls.</p>
        <div className="summary-grid">
          <p>run_id<strong>{currentRun?.run_id ?? '-'}</strong></p>
          <p>trace_id<strong>{activeStep?.trace_id || currentRun?.trace_id || 'unknown'}</strong></p>
          <p>task_id<strong>{activeStep?.task_id || currentRun?.task_id || 'unknown'}</strong></p>
          <p>step_id<strong>{activeStep?.step_id || activeStep?.call_id || '-'}</strong></p>
          <p>active agent<strong>{currentRun?.current_agent || activeStep?.agent || '-'}</strong></p>
          <p>heartbeat<strong>{currentRunOperational === 'Stale' ? 'STALE' : 'LIVE'}</strong></p>
        </div>
        <p className="status-banner">Active KI: <strong>{currentRun?.current_agent || activeStep?.agent || '-'}</strong> | Status: <strong>{currentRun?.status || 'IDLE'}</strong> | Reason: <strong>{activeStep?.reason || 'not reported'}</strong></p>
      </article>

      <article className="panel">
        <h3>Interventions</h3>
        <div className="button-row">
          <button type="button" className="button" onClick={() => void runControlAction('retry-last-step', 'Retry same target')}>retry same target</button>
          <button type="button" className="button" onClick={() => void rerouteTarget('remote')}>reroute remote</button>
          <button type="button" className="button" onClick={() => void rerouteTarget('local')}>reroute local</button>
          <button type="button" className="button" onClick={() => void runControlAction('rollback', 'Rollback run')}>rollback</button>
          <button type="button" className="button" onClick={() => void quarantineArtifact()}>quarantine artifact</button>
          <button type="button" className="button" onClick={() => void runControlAction('stop', 'Kill run')}>kill run</button>
          <button type="button" className="button" onClick={assignToHuman}>assign to human</button>
        </div>
      </article>

      <article className="panel">
        <h3>Control Event Stream</h3>
        {events.length === 0 ? <p className="status-banner">No control event observed yet.</p> : null}
        <ul className="event-list">{events.slice(0, 10).map((entry) => renderEventEntry(entry))}</ul>
      </article>

      <article className="panel">
        <h3>Timeline</h3>
        {glasshouseRows.length === 0 ? (
          <p className="status-banner">No run loaded. Start dispatch/autonomy from Commander.</p>
        ) : (
          <div className="timeline" role="list" aria-label="Run timeline">
            {glasshouseRows.map((row) => (
              <button key={row.key} type="button" className={`timeline-item ${selectedStepKey === row.key ? 'timeline-item--selected' : ''}`} onClick={() => setSelectedStepKey(row.key)}>
                <p><strong>{row.role}</strong> (<code>{row.agent_id}</code>)</p>
                <p>run_id: {row.run_id} | trace_id: {row.trace_id} | task_id: {row.task_id}</p>
                <p>step_id: {row.step_id} | runtime_target: {row.runtime_target}</p>
                <p>state: {renderStatusChip(row.current_state)} prev: {renderStatusChip(row.previous_state)} next: {renderStatusChip(row.next_state)}</p>
                <p>reason: {row.reason}</p>
                <p>evidence ref: <code>{row.evidence_ref}</code></p>
                <p>started_at: {row.started_at} | finished_at: {row.finished_at}</p>
                <p>fallback/recovery: {row.fallback_or_recovery}</p>
              </button>
            ))}
          </div>
        )}
      </article>

      <article className="panel">
        <h3>Agent Lanes</h3>
        <div className="lane-grid">
          {roleCards.map((role) => (
            <div key={role.id} className="lane-card">
              <p><strong>{role.name}</strong></p>
              <p>{renderStatusChip(role.state)}</p>
              <p>{renderMaturityChip(role.maturity)}</p>
              <p>{role.note}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>Evidence Panel</h3>
        {selectedTimelineRow ? <p>Selected step: <code>{selectedTimelineRow.step_id}</code> | agent: <code>{selectedTimelineRow.agent_id}</code></p> : <p className="status-banner">No timeline step selected.</p>}
        <p>Selected evidence ref: <code>{selectedEvidenceRef || 'not-reported'}</code></p>
        {evidenceItems.length === 0 ? <p className="status-banner">No evidence artifact reported yet.</p> : null}
        <ul className="evidence-list">{evidenceItems.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
        <div className="button-row"><button type="button" className="button" onClick={() => openEvidence(selectedEvidenceRef)} disabled={!selectedEvidenceRef}>Open selected evidence</button></div>
      </article>
    </section>
  );

  const renderOperations = () => (
    <section className="window-body window-body--operations" aria-label="Operations window">
      <article className="panel panel--summary">
        <h2>Operations</h2>
        <p className="muted">Service health, routing, bootstrap, config presence, evidence browser, and raw JSON diagnostics.</p>
        <div className="summary-grid">
          <p>Registry active<strong>{agentCounts.active}</strong></p>
          <p>Registry legacy<strong>{agentCounts.legacy}</strong></p>
          <p>Bootstrap<strong>{bootstrapState.status}</strong></p>
          <p>Prompt ready<strong>{readyForPromptExecution ? 'YES' : 'NO'}</strong></p>
          <p>Current run<strong>{currentRun?.run_id ?? '-'}</strong></p>
          <p>Session<strong>{sessionId}</strong></p>
          <p>Contract<strong>{platformContract.version}</strong></p>
        </div>
        <p className="status-banner">{platformStatus}</p>
        {platformContractValidation ? <p className="status-banner">Contract validation: <strong>{String(platformContractValidation.ok ?? 'unknown')}</strong></p> : null}
      </article>

      <article className="panel">
        <h3>Service Health Grid</h3>
        <div className="service-grid">
          {serviceHealth.map((service) => (
            <div key={service.id} className="service-card">
              <p><strong>{service.label}</strong></p>
              <p>{renderStatusChip(healthToOperational(service.state))}</p>
              <p>{service.detail}</p>
              <p>Source: <code>{service.source}</code></p>
              <p>Action: {service.action}</p>
            </div>
          ))}
        </div>
        <div className="button-row">
          <button type="button" className="button" onClick={() => void refreshPlatformChecks()}>Refresh diagnostics</button>
          <button type="button" className="button" onClick={() => void refreshBootstrapStatus()}>Refresh bootstrap</button>
        </div>
      </article>

      <article className="panel">
        <h3>Live State Probe</h3>
        <p>Status: {renderStatusChip(runtimeProbe.samples === 0 ? 'Idle' : runtimeProbe.pass ? 'Done' : 'Blocked')}</p>
        <p>Last checked: <code>{runtimeProbe.lastCheckedAt}</code></p>
        <p>Bridge HTTP: <strong>{runtimeProbe.lastBridgeHttp || 0}</strong> | Ready: <strong>{runtimeProbe.lastReady ? 'YES' : 'NO'}</strong></p>
        <p>Run status: <strong>{runtimeProbe.lastRunStatus}</strong> | Bootstrap: <strong>{runtimeProbe.lastBootstrap}</strong></p>
        <p>Samples: {runtimeProbe.samples} | Errors: {runtimeProbe.errors} | Bridge flaps: {runtimeProbe.bridgeFlaps}</p>
        <p>Transitions: ready={runtimeProbe.readyTransitions} | run={runtimeProbe.runStatusTransitions} | bootstrap={runtimeProbe.bootstrapTransitions}</p>
        {probeSweepProgress.total > 0 ? <p>Probe sweep progress: <strong>{probeSweepProgress.current}/{probeSweepProgress.total}</strong> {probeSweepProgress.lastSampleAt ? `| last sample ${probeSweepProgress.lastSampleAt}` : ''}</p> : null}
        <p>Reason: {runtimeProbe.reason}</p>
        <p>Action: {runtimeProbe.nextAction}</p>
        <div className="button-row">
          <button type="button" className="button" onClick={() => void runProbeSweep(10)} disabled={probeSweepBusy}>{probeSweepBusy ? 'Probe running...' : 'Run 10-sample probe'}</button>
          <button type="button" className="button" onClick={resetRuntimeProbeCounters} disabled={probeSweepBusy}>Reset probe counters</button>
        </div>
      </article>

      <article className="panel">
        <h3>Routing + Bootstrap + Config Presence</h3>
        <p>Bootstrap summary: <strong>{bootstrapState.summary || 'none'}</strong></p>
        <p>Started at: <code>{bootstrapState.started_at || '-'}</code></p>
        <p>Finished at: <code>{bootstrapState.finished_at || '-'}</code></p>
        <div className="table-scroll">
          <table className="presence-table" aria-label="Token and config presence">
            <thead><tr><th>Key</th><th>Presence</th><th>Evidence</th><th>Action</th></tr></thead>
            <tbody>
              {CONFIG_KEYS.map((key) => {
                const explicit = explicitConfigPresence.get(key);
                const missing = missingConfigKeys.has(key) || explicit === 'Missing';
                const presenceValue = explicit ?? (missing ? 'Missing' : 'Unknown');
                const maturity: MaturityState = presenceValue === 'Present' ? 'Implemented' : missing ? 'Blocked' : 'Unknown';
                return (
                  <tr key={key}>
                    <td><code>{key}</code></td>
                    <td>{presenceValue}</td>
                    <td>{renderMaturityChip(maturity)}</td>
                    <td>{missing ? 'Set in .godmode_env and rerun bootstrap' : presenceValue === 'Present' ? 'Backend reported token presence' : 'No explicit backend signal'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <h3>Evidence Browser + Runbooks</h3>
        <ul className="evidence-list">{evidenceItems.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
        <div className="button-row">
          <button type="button" className="button" onClick={() => openEvidence()}>Open evidence</button>
          <button type="button" className="button" onClick={openOpenHands}>Open OpenHands</button>
        </div>
        <ul className="runbook-list">
          <li><code>AGENT_SUPERBRAIN_KONTROLLPROTOKOLL.md</code></li>
          <li><code>KONTROLLPROTOKOLL_00_07.md</code></li>
          <li><code>STACK_OPERATIONS.md</code></li>
          <li><code>GODMODE_FORENSIC_HANDBUCH.html</code></li>
        </ul>
      </article>

      <article className="panel">
        <h3>Raw JSON Diagnostics</h3>
        <p className="muted">Raw JSON is intentionally shown only in Operations.</p>
        <h4>/control-center/state</h4>
        <pre className="json-panel">{JSON.stringify(rawControlCenterState ?? { status: 'not-loaded' }, null, 2)}</pre>
        <h4>/routing/status</h4>
        <pre className="json-panel">{JSON.stringify(routingStatus ?? { status: 'not-loaded' }, null, 2)}</pre>
        <h4>/autonomy/capabilities</h4>
        <pre className="json-panel">{JSON.stringify(capabilitiesStatus ?? { status: 'not-loaded' }, null, 2)}</pre>
        <h4>/platform7/contract</h4>
        <pre className="json-panel">{JSON.stringify({ contract: platformContract, validation: platformContractValidation }, null, 2)}</pre>
        <h4>Current run payload</h4>
        <pre className="json-panel">{JSON.stringify(currentRun ?? { run: 'none' }, null, 2)}</pre>
      </article>
    </section>
  );

  const capabilityLimitations = asStringArray(capabilitiesStatus?.limitations);
  const claimState: MaturityState = (() => {
    const evidence = String(currentRun?.evidence_status ?? '').toLowerCase();
    if (evidence === 'verified') return 'Verified';
    if (evidence === 'implemented') return 'Implemented';
    if (evidence === 'partial') return 'Partial';
    if (evidence === 'blocked') return 'Blocked';
    if (evidence === 'legacy') return 'Legacy';
    if (evidence === 'plan') return 'Plan';
    if (currentRunOperational === 'Partial') return 'Partial';
    if (currentRunOperational === 'Blocked' || currentRunOperational === 'Failed') return 'Blocked';
    if (currentRun) return 'Implemented';
    return 'Unknown';
  })();

  return (
    <main className="app-shell" data-window-role={windowRole}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Godmode/Superbrain Three-Window Platform</p>
          <h1>Transparent Multi-Agent Developer Platform</h1>
          <p className="muted">Session <code>{sessionId}</code> | Active window <strong>{windowRole}</strong></p>
        </div>
        <div className="button-row">
          <button type="button" className="button button--primary" onClick={openSynchronizedWindows}>Open synchronized Commander + Glasshouse + Operations</button>
          <button type="button" className="button" onClick={() => void refreshPlatformChecks()} disabled={platformBusy}>{platformBusy ? 'Syncing...' : 'Sync now'}</button>
        </div>
      </header>

      <section className="window-presence" aria-label="Window heartbeat monitor">
        {(['commander', 'glasshouse', 'operations'] as WindowRole[]).map((role) => (
          <article key={role} className="window-presence-card">
            <h2>{role}</h2>
            <p>{renderStatusChip((() => {
              const seen = presence[role];
              if (!seen || seen === '-') return 'Idle';
              const heartbeat = heartbeatAge(seen);
              if (heartbeat.isInvalid || heartbeat.isClockSkew) return 'Blocked';
              if ((heartbeat.ageMs ?? 0) > WINDOW_HEARTBEAT_STALE_MS) return 'Stale';
              return 'Running';
            })())}</p>
            <p>{presence[role] === '-' ? 'No heartbeat yet' : `Last heartbeat ${presence[role]}`}</p>
            <p>Action: {(() => {
              const seen = presence[role];
              if (!seen || seen === '-') return 'Open this window';
              const heartbeat = heartbeatAge(seen);
              if (heartbeat.isClockSkew) return 'Clock skew detected';
              if (heartbeat.isInvalid || (heartbeat.ageMs ?? 0) > WINDOW_HEARTBEAT_STALE_MS) return 'Refresh window';
              return 'Continue monitoring';
            })()}</p>
          </article>
        ))}
      </section>

      {windowRole === 'commander' ? renderCommander() : null}
      {windowRole === 'glasshouse' ? renderGlasshouse() : null}
      {windowRole === 'operations' ? renderOperations() : null}

      <footer className="app-footer">
        <p>Supervisors always active: <strong>SentinelTruthAgent</strong> and <strong>SentinelRuntimeAgent</strong>.</p>
        <p>Claim state: <strong>{claimState}</strong> | Evidence status: <strong>{currentRun?.evidence_status || 'Unknown'}</strong> | Capability limitations: {capabilityLimitations.length || 0}</p>
      </footer>
    </main>
  );
}
