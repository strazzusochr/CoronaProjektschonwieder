import {
  type FormEvent,
  lazy,
  startTransition,
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import {
  LEVEL_LIBRARY,
  type GameSpeed,
  type QualityPreset,
  type SimulationSnapshot,
  type SkillId,
  LemmingsEngine,
  runSimulationMathValidation,
} from './game/sim';

const loadSceneCanvas = () => import('./SceneCanvas');
const SceneCanvas = lazy(loadSceneCanvas);

const SKILL_BUTTONS: SkillId[] = ['blocker', 'builder', 'digger', 'basher', 'miner', 'floater', 'sprinter'];
const QUALITY_PRESETS: QualityPreset[] = ['low', 'medium', 'ultra'];
const SPEED_PRESETS: GameSpeed[] = [1, 2, 4];
const HUB_BASE_URL = 'http://127.0.0.1:3901';
const SERVICE_CATALOG = [
  { id: 'bolt', label: 'Dispatch Hub (bolt)', targetKey: null, source: '/health' },
  { id: 'openhands', label: 'OpenHands UI', targetKey: null, source: '/control-center/state' },
  { id: 'n8n', label: 'n8n', targetKey: null, source: '/control-center/state' },
  { id: 'litellm', label: 'LiteLLM', targetKey: null, source: '/control-center/state' },
  { id: 'devtools-bridge', label: 'DevTools Bridge', targetKey: null, source: '/control-center/state' },
  { id: 'langgraph', label: 'LangGraph', targetKey: 'langgraph-local', source: '/routing/status' },
  { id: 'smolagents', label: 'Smolagents', targetKey: 'smolagents', source: '/routing/status' },
  { id: 'openhands-adapter', label: 'OpenHands Adapter', targetKey: 'openhands-adapter', source: '/routing/status' },
  { id: 'hf-aider', label: 'HF Aider', targetKey: 'hf-aider', source: '/routing/status' },
  { id: 'ollamahf', label: 'Ollama HF Orchestrator', targetKey: 'ollama-hf-orchestrator', source: '/routing/status' },
];

type ViewMode = 'platform' | 'game';
type HealthState = 'idle' | 'checking' | 'up' | 'down';
type PromptTemplate = {
  id: string;
  title: string;
  recommendedAgent: string;
  task: string;
};
type AutonomyProfile = {
  id: string;
  label: string;
  description: string;
  agents: string[];
};
type DispatchPayload = {
  agent: string;
  task: string;
  source: string;
  repo: string;
  ref: string;
  status: string;
  timestamp: string;
};
type ServiceHealth = {
  id: string;
  label: string;
  source: string;
  state: HealthState;
  detail: string;
  checkedAt: string;
};
type AgentRecord = Record<string, unknown>;
type RoutingRecord = Record<string, unknown> | null;
type CapabilitiesRecord = Record<string, unknown> | null;
type AgentCounts = {
  active: number;
  legacy: number;
};
type BootstrapRecord = {
  status: string;
  ready: boolean;
  summary?: string;
  started_at?: string;
  finished_at?: string;
  phases?: Record<string, unknown>[];
};
type AgentRunStep = {
  step: number;
  agent: string;
  status: string;
  raw_status?: string;
  call_id?: string;
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
  primary_orchestrate_status?: string;
  primary_orchestrate_http_status?: number | null;
  final_code_artifact?: string;
  final_code_url?: string;
  final_code_bytes?: number;
  response_excerpt?: string;
  started_at?: string;
  finished_at?: string;
};
type AgentRunRecord = {
  run_id: string;
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
  steps: AgentRunStep[];
};

const ONE_CLICK_WINDOWS = '.\\START_GODMODE.ps1';
const ONE_CLICK_LINUX = './START_GODMODE.sh';
const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'apps-mvp',
    title: 'Business App MVP',
    recommendedAgent: 'local.langgraph.planner',
    task:
      'Build a production-ready web app MVP with auth, dashboard, CRUD API, tests, build artifacts, and deployment checklist. Include full QA and evidence output.',
  },
  {
    id: 'webgame-3d',
    title: '3D Web Game',
    recommendedAgent: 'external.ollamahf.lead_coder',
    task:
      'Create a browser-based 3D web game with scene setup, camera controls, gameplay loop, HUD, input mapping, test coverage, and final playable build proof.',
  },
  {
    id: 'automation-flow',
    title: 'Automation + n8n Flow',
    recommendedAgent: 'local.openhands.openhands',
    task:
      'Design and implement an n8n-driven multi-agent automation flow: mission intake, memory write, dispatch chaining, retry logic, and runtime health checks.',
  },
  {
    id: 'debug-hardening',
    title: 'Debug + Hardening',
    recommendedAgent: 'local.langgraph.reviewer',
    task:
      'Run deep diagnostics, identify root-cause bugs, patch reliability gaps, harden startup and runtime checks, and deliver verified pass/fail evidence summary.',
  },
];
const AUTONOMY_PROFILE_FALLBACK: AutonomyProfile[] = [
  {
    id: 'app_builder',
    label: 'App Builder',
    description: 'Planner -> Research -> Reviewer -> Finalize',
    agents: [
      'local.langgraph.planner',
      'local.langgraph.research',
      'local.langgraph.reviewer',
      'local.langgraph.finalize',
    ],
  },
  {
    id: 'game_builder',
    label: '3D Game Builder',
    description: 'External Vision -> Research -> Lead Coder -> QA -> Release (cloud-only)',
    agents: [
      'external.ollamahf.vision',
      'external.ollamahf.research',
      'external.ollamahf.lead_coder',
      'external.ollamahf.qa',
      'external.ollamahf.release',
    ],
  },
  {
    id: 'game_artifact_single',
    label: '3D Artifact Builder (Fast Proof)',
    description: 'Single external solo_builder run for one concrete cloud-generated HTML/3D artifact.',
    agents: ['external.ollamahf.solo_builder'],
  },
  {
    id: 'ops_hardening',
    label: 'Ops Hardening',
    description: 'Reviewer -> OpenHands -> Aider Review -> Finalize',
    agents: [
      'local.langgraph.reviewer',
      'local.openhands.openhands',
      'local.hf_aider.aider_review',
      'local.langgraph.finalize',
    ],
  },
];

function humanize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function webglAvailable() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}

function nowIso() {
  return new Date().toISOString();
}

function defaultDispatchPayload(): DispatchPayload {
  return {
    agent: 'local.langgraph.planner',
    task: 'Run mission sanity check',
    source: 'homepage-control-center',
    repo: 'strazzusochr/CoronaProjektschonwieder',
    ref: 'main',
    status: 'queued',
    timestamp: nowIso(),
  };
}

function parseErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'unknown error';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item));
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function parseResponseSafely(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  try {
    const text = await response.text();
    return { text };
  } catch {
    return {};
  }
}

function SceneFallback({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: 'loading' | 'standby' | 'error';
}) {
  return (
    <div className={`scene-fallback scene-fallback--${tone}`} role="status">
      <span className="scene-fallback__eyebrow">
        {tone === 'loading' ? 'Loading' : tone === 'standby' ? 'Standby' : 'Recovery'}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function engineSnapshot(engine: LemmingsEngine) {
  return engine.getSnapshot();
}

function safeAudioTone(enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !('AudioContext' in window)) {
    return;
  }
  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = 440;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.07);
  void context.close();
}

function normalizeAgentsPayload(payload: Record<string, unknown>): AgentRecord[] {
  if (Array.isArray(payload.active_agents)) {
    return payload.active_agents.filter((entry) => entry && typeof entry === 'object') as AgentRecord[];
  }
  if (Array.isArray(payload.agents)) {
    return payload.agents.filter((entry) => entry && typeof entry === 'object') as AgentRecord[];
  }
  if (Array.isArray(payload.registry)) {
    return payload.registry.filter((entry) => entry && typeof entry === 'object') as AgentRecord[];
  }
  return [];
}

function normalizeAutonomyProfiles(payload: Record<string, unknown>): AutonomyProfile[] {
  const input = payload.profiles;
  if (!Array.isArray(input)) {
    return AUTONOMY_PROFILE_FALLBACK;
  }
  const mapped = input
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const candidate = entry as Record<string, unknown>;
      const agents = Array.isArray(candidate.agents)
        ? candidate.agents.map((agent) => String(agent)).filter((agent) => agent.length > 0)
        : [];
      return {
        id: String(candidate.id ?? ''),
        label: String(candidate.label ?? candidate.id ?? 'Unnamed profile'),
        description: String(candidate.description ?? ''),
        agents,
      } satisfies AutonomyProfile;
    })
    .filter((entry) => entry.id.length > 0);
  if (mapped.length === 0) {
    return AUTONOMY_PROFILE_FALLBACK;
  }
  return mapped;
}

function normalizeRunPayload(value: unknown): AgentRunRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const steps = Array.isArray(candidate.steps)
    ? candidate.steps
        .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
        .map((entry) => {
          const step = entry as Record<string, unknown>;
          return {
            step: Number(step.step ?? 0),
            agent: String(step.agent ?? ''),
            status: String(step.status ?? 'UNKNOWN'),
            raw_status: String(step.raw_status ?? ''),
            call_id: String(step.call_id ?? ''),
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
            primary_orchestrate_status: String(step.primary_orchestrate_status ?? ''),
            primary_orchestrate_http_status:
              typeof step.primary_orchestrate_http_status === 'number'
                ? step.primary_orchestrate_http_status
                : null,
            final_code_artifact: String(step.final_code_artifact ?? ''),
            final_code_url: String(step.final_code_url ?? ''),
            final_code_bytes: Number(step.final_code_bytes ?? 0),
            response_excerpt: String(step.response_excerpt ?? ''),
            started_at: String(step.started_at ?? ''),
            finished_at: String(step.finished_at ?? ''),
          } satisfies AgentRunStep;
        })
    : [];

  const runId = String(candidate.run_id ?? '');
  if (!runId) {
    return null;
  }

  return {
    run_id: runId,
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
    steps,
  };
}

function runChipState(status: string): HealthState {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'PASS' || normalized === 'FORWARDED' || normalized === 'READY' || normalized === 'VERIFIED') {
    return 'up';
  }
  if (normalized === 'RUNNING' || normalized === 'BOOTING' || normalized === 'CHECKING') {
    return 'checking';
  }
  return 'down';
}

function extractBootstrapErrors(bootstrap: BootstrapRecord): string[] {
  if (!Array.isArray(bootstrap.phases)) {
    return [];
  }
  const preflight = bootstrap.phases.find((phase) => String(phase.phase ?? '') === 'preflight');
  if (!preflight || typeof preflight !== 'object') {
    return [];
  }
  const result = (preflight as Record<string, unknown>).result;
  if (!result || typeof result !== 'object') {
    return [];
  }
  const errors = (result as Record<string, unknown>).errors;
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.map((entry) => String(entry)).filter((entry) => entry.length > 0);
}

export default function App() {
  const engineRef = useRef(new LemmingsEngine(0));
  const [activeView, setActiveView] = useState<ViewMode>('platform');
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() => engineSnapshot(engineRef.current));
  const [sceneRequested, setSceneRequested] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showAgents, setShowAgents] = useState(true);
  const [showHud, setShowHud] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready. Start the mission to begin the simulation.');
  const [mathValidationLabel, setMathValidationLabel] = useState('not-run');
  const [platformStatus, setPlatformStatus] = useState('Platform checks not run yet.');
  const [platformBusy, setPlatformBusy] = useState(false);
  const [bootstrapState, setBootstrapState] = useState<BootstrapRecord>({
    status: 'DOWN',
    ready: false,
    summary: 'Bootstrap not started.',
  });
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const [readyForPromptExecution, setReadyForPromptExecution] = useState(false);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState('No mission dispatched yet.');
  const [dispatchPayload, setDispatchPayload] = useState<DispatchPayload>(() => defaultDispatchPayload());
  const [selectedTemplateId, setSelectedTemplateId] = useState(PROMPT_TEMPLATES[0].id);
  const [autonomyProfiles, setAutonomyProfiles] = useState<AutonomyProfile[]>(AUTONOMY_PROFILE_FALLBACK);
  const [autonomyProfileId, setAutonomyProfileId] = useState(AUTONOMY_PROFILE_FALLBACK[0].id);
  const [autonomyGoal, setAutonomyGoal] = useState(PROMPT_TEMPLATES[0].task);
  const [autonomyBusy, setAutonomyBusy] = useState(false);
  const [autonomyMessage, setAutonomyMessage] = useState('No autonomous run started yet.');
  const [promptCommand, setPromptCommand] = useState(PROMPT_TEMPLATES[0].task);
  const [promptBusy, setPromptBusy] = useState(false);
  const [promptMessage, setPromptMessage] = useState('No prompt command executed yet.');
  const [showAdvancedPanels, setShowAdvancedPanels] = useState(false);
  const [quickActionStatus, setQuickActionStatus] = useState('No quick action executed yet.');
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentCounts, setAgentCounts] = useState<AgentCounts>({ active: 0, legacy: 0 });
  const [routingStatus, setRoutingStatus] = useState<RoutingRecord>(null);
  const [capabilitiesStatus, setCapabilitiesStatus] = useState<CapabilitiesRecord>(null);
  const [currentRun, setCurrentRun] = useState<AgentRunRecord | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>(
    SERVICE_CATALOG.map((service) => ({
      id: service.id,
      label: service.label,
      source: service.source,
      state: 'idle',
      detail: 'Not checked yet.',
      checkedAt: '-',
    }))
  );

  const deferredSnapshot = useDeferredValue(snapshot);
  const level = LEVEL_LIBRARY[deferredSnapshot.levelIndex];
  const missionState = deferredSnapshot.state;
  const selectedAgent = deferredSnapshot.agents.find((agent) => agent.id === deferredSnapshot.selectedAgentId) ?? null;
  const webglReady = useMemo(() => webglAvailable(), []);
  const refreshRequestIdRef = useRef(0);
  const lastPromptReadyAtRef = useRef(0);
  const currentRunStatus = currentRun?.status ?? '';

  const applyPromptReadiness = (candidateReady: boolean) => {
    const stickyWindowMs = 60000;
    if (candidateReady) {
      lastPromptReadyAtRef.current = Date.now();
      setReadyForPromptExecution(true);
      return;
    }
    if (Date.now() - lastPromptReadyAtRef.current > stickyWindowMs) {
      setReadyForPromptExecution(false);
    }
  };

  const refreshSnapshot = () => {
    startTransition(() => {
      setSnapshot(engineSnapshot(engineRef.current));
    });
  };

  const updateStatus = (message: string) => {
    setStatusMessage(message);
  };

  const setSkill = (skill: SkillId) => {
    engineRef.current.setSelectedSkill(skill);
    updateStatus(`Selected skill: ${humanize(skill)}.`);
    refreshSnapshot();
  };

  const startMission = () => {
    setSceneRequested(true);
    engineRef.current.start();
    updateStatus('Mission running. Use mouse clicks or next-selection controls to command lemmings.');
    safeAudioTone(audioEnabled);
    refreshSnapshot();
  };

  const pauseMission = () => {
    engineRef.current.pause();
    updateStatus('Mission paused.');
    refreshSnapshot();
  };

  const resumeMission = () => {
    engineRef.current.start();
    updateStatus('Mission resumed.');
    refreshSnapshot();
  };

  const restartLevel = () => {
    engineRef.current.restartLevel();
    updateStatus('Current level restarted.');
    refreshSnapshot();
  };

  const resetCampaign = () => {
    engineRef.current.resetCampaign();
    setSceneRequested(false);
    updateStatus('Campaign reset to tutorial level.');
    refreshSnapshot();
  };

  const setSpeed = (speed: GameSpeed) => {
    engineRef.current.setSpeed(speed);
    updateStatus(`Simulation speed set to ${speed}x.`);
    refreshSnapshot();
  };

  const setQuality = (quality: QualityPreset) => {
    engineRef.current.setQuality(quality);
    updateStatus(`Renderer quality set to ${quality}.`);
    refreshSnapshot();
  };

  const setLevelByIndex = (index: number) => {
    engineRef.current.setLevel(index);
    updateStatus(`Loaded level: ${LEVEL_LIBRARY[index].title}.`);
    refreshSnapshot();
  };

  const selectNextAgent = () => {
    const selectedId = engineRef.current.selectNextAgent();
    if (selectedId === null) {
      updateStatus('No active lemmings available for selection.');
    } else {
      updateStatus(`Selected lemming #${selectedId}.`);
    }
    refreshSnapshot();
  };

  const assignSelectedSkill = () => {
    const result = engineRef.current.assignSelectedSkill();
    updateStatus(result.reason);
    if (result.ok) {
      safeAudioTone(audioEnabled);
    }
    refreshSnapshot();
  };

  const runMathValidationProbe = () => {
    const validation = runSimulationMathValidation();
    const passed =
      validation.deterministicReplayOk &&
      validation.kinematicsOk &&
      validation.voxelConservationOk &&
      validation.resourceBalanceOk;
    setMathValidationLabel(passed ? 'pass' : 'fail');
    updateStatus(
      passed
        ? 'Math/simulation validation PASS: deterministic replay + kinematics + voxel/resource checks.'
        : 'Math/simulation validation FAIL. Check diagnostics in test pipeline.'
    );
  };

  const refreshBootstrapStatus = async () => {
    try {
      const response = await fetchWithTimeout(`${HUB_BASE_URL}/bootstrap/status`, { method: 'GET' }, 12000);
      const payload = await parseResponseSafely(response);
      const bootstrap = (payload.bootstrap && typeof payload.bootstrap === 'object'
        ? (payload.bootstrap as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      const status = String(bootstrap.status ?? 'DOWN');
      const ready = bootstrap.ready === true && status === 'READY';
      setBootstrapState({
        status,
        ready,
        summary: String(bootstrap.summary ?? ''),
        started_at: String(bootstrap.started_at ?? ''),
        finished_at: String(bootstrap.finished_at ?? ''),
        phases: Array.isArray(bootstrap.phases)
          ? (bootstrap.phases as Record<string, unknown>[])
          : [],
      });
      applyPromptReadiness(Boolean(payload.ready_for_prompt_execute ?? ready));
      return status;
    } catch (error) {
      setBootstrapState({
        status: 'DOWN',
        ready: false,
        summary: `Bootstrap status unreachable: ${parseErrorMessage(error)}`,
        phases: [],
      });
      applyPromptReadiness(false);
      return 'DOWN';
    }
  };

  const startBootstrap = async () => {
    if (typeof fetch !== 'function') {
      setPlatformStatus('Bootstrap unavailable: fetch API not present.');
      return;
    }
    setBootstrapBusy(true);
    setPlatformStatus('Starting one-click bootstrap...');
    try {
      const response = await fetchWithTimeout(
        `${HUB_BASE_URL}/bootstrap/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            include_script_start: true,
            source: 'homepage-control-center',
          }),
        },
        10000
      );
      const payload = await parseResponseSafely(response);
      const summary = JSON.stringify(payload).slice(0, 240);
      setPlatformStatus(`Bootstrap request HTTP ${response.status}. ${summary}`);

      let terminal = '';
      for (let attempt = 1; attempt <= 30; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        terminal = await refreshBootstrapStatus();
        if (terminal !== 'BOOTING') {
          break;
        }
      }
      if (terminal === 'READY') {
        setPlatformStatus('Bootstrap READY. Prompt command layer unlocked.');
      } else if (terminal === 'BOOTING') {
        setPlatformStatus('Bootstrap still running. Refresh checks to update status.');
      }
      void refreshPlatformChecks();
    } catch (error) {
      setPlatformStatus(`Bootstrap failed: ${parseErrorMessage(error)}`);
    } finally {
      setBootstrapBusy(false);
    }
  };

  const executePromptCommand = async () => {
    if (typeof fetch !== 'function') {
      setPromptMessage('Prompt execution failed: fetch API unavailable.');
      return;
    }
    if (!promptCommand.trim()) {
      setPromptMessage('Prompt execution rejected: prompt is empty.');
      return;
    }
    setPromptBusy(true);
    setPromptMessage('Executing prompt command...');
    setCurrentRun(null);
    try {
      const response = await fetchWithTimeout(
        `${HUB_BASE_URL}/prompt/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptCommand.trim(),
            source: 'homepage-control-center',
            repo: dispatchPayload.repo,
            ref: dispatchPayload.ref,
            status: 'queued',
            profile_id: selectedAutonomyProfile.id,
            halt_on_fail: false,
          }),
        },
        35000
      );
      const payload = await parseResponseSafely(response);
      const summary = JSON.stringify(payload).slice(0, 420);
      const runPayload = normalizeRunPayload(payload.run);
      if (runPayload) {
        setCurrentRun(runPayload);
          setPromptMessage(
            `Prompt response HTTP ${response.status}. Run ${runPayload.run_id} is ${runPayload.status} with ${runPayload.forwarded_steps}/${runPayload.total_steps} forwarded steps and ${runPayload.partial_steps} partial/fallback steps.`
          );
      } else {
        setPromptMessage(`Prompt response HTTP ${response.status}. ${summary}`);
      }
      void refreshPlatformChecks();
    } catch (error) {
      setPromptMessage(`Prompt execution failed: ${parseErrorMessage(error)}`);
    } finally {
      setPromptBusy(false);
    }
  };

  const refreshPlatformChecks = async () => {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      setPlatformStatus('Fetch API unavailable in this runtime.');
      return;
    }
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    const isCurrentRequest = () => requestId === refreshRequestIdRef.current;

    setPlatformBusy(true);
    setPlatformStatus('Running live checks for services, routing, and agent registry...');
    setServiceHealth((current) =>
      current.map((service) => ({ ...service, state: 'checking', detail: 'Checking...', checkedAt: nowIso() }))
    );

    const shouldBypassStateCache =
      promptBusy ||
      autonomyBusy ||
      (currentRunStatus.length > 0 && runChipState(currentRunStatus) === 'checking');

    let hubState: HealthState = 'down';
    let hubDetail = 'No response from /health';
    let routingTargets: Record<string, Record<string, unknown>> = {};
    let directServiceProbes: Record<string, Record<string, unknown>> = {};
    let bootstrapStatusLocal = 'DOWN';
    let promptReadyLocal = false;

    try {
      const stateResponse = await fetchWithTimeout(
        `${HUB_BASE_URL}/control-center/state${shouldBypassStateCache ? '?fresh=1' : ''}`,
        { method: 'GET' },
        12000
      );
      const statePayload = await parseResponseSafely(stateResponse);
      const bootstrap =
        statePayload.bootstrap && typeof statePayload.bootstrap === 'object' && !Array.isArray(statePayload.bootstrap)
          ? (statePayload.bootstrap as Record<string, unknown>)
          : {};
      const bootstrapStatus = String(bootstrap.status ?? 'DOWN');
      const bootstrapReady = bootstrap.ready === true && bootstrapStatus === 'READY';
      bootstrapStatusLocal = bootstrapStatus;
      promptReadyLocal = Boolean(statePayload.ready_for_prompt_execute ?? bootstrapReady);
      if (isCurrentRequest()) {
        setBootstrapState({
          status: bootstrapStatus,
          ready: bootstrapReady,
          summary: String(bootstrap.summary ?? ''),
          started_at: String(bootstrap.started_at ?? ''),
          finished_at: String(bootstrap.finished_at ?? ''),
          phases: Array.isArray(bootstrap.phases)
            ? (bootstrap.phases as Record<string, unknown>[])
            : [],
        });
        applyPromptReadiness(promptReadyLocal);
        setCurrentRun(normalizeRunPayload(statePayload.latest_run));
      }
      if (
        statePayload.service_probes &&
        typeof statePayload.service_probes === 'object' &&
        !Array.isArray(statePayload.service_probes)
      ) {
        directServiceProbes = statePayload.service_probes as Record<string, Record<string, unknown>>;
      }
    } catch {
      if (isCurrentRequest()) {
        applyPromptReadiness(false);
      }
    }

    try {
      const healthResponse = await fetchWithTimeout(`${HUB_BASE_URL}/health`, { method: 'GET' }, 8000);
      const healthPayload = await parseResponseSafely(healthResponse);
      hubState = healthResponse.ok ? 'up' : 'down';
      hubDetail = `HTTP ${healthResponse.status}`;
      if (
        healthPayload.routing_status &&
        typeof healthPayload.routing_status === 'object' &&
        !Array.isArray(healthPayload.routing_status)
      ) {
        routingTargets = healthPayload.routing_status as Record<string, Record<string, unknown>>;
      }
    } catch (error) {
      hubState = 'down';
      hubDetail = parseErrorMessage(error);
    }

    try {
      const agentsResponse = await fetchWithTimeout(`${HUB_BASE_URL}/agents`, { method: 'GET' }, 8000);
      const agentsPayload = await parseResponseSafely(agentsResponse);
      if (isCurrentRequest()) {
        setAgents(normalizeAgentsPayload(agentsPayload));
        setAgentCounts({
          active: Number(agentsPayload.active_count ?? 0),
          legacy: Number(agentsPayload.legacy_count ?? 0),
        });
      }
    } catch {
      if (isCurrentRequest()) {
        setAgents([]);
        setAgentCounts({ active: 0, legacy: 0 });
      }
    }

    try {
      const routingResponse = await fetchWithTimeout(`${HUB_BASE_URL}/routing/status`, { method: 'GET' }, 8000);
      const routingPayload = await parseResponseSafely(routingResponse);
      if (isCurrentRequest()) {
        setRoutingStatus(routingPayload);
      }
      if (
        routingPayload.targets &&
        typeof routingPayload.targets === 'object' &&
        !Array.isArray(routingPayload.targets)
      ) {
        routingTargets = routingPayload.targets as Record<string, Record<string, unknown>>;
      }
    } catch {
      if (isCurrentRequest()) {
        setRoutingStatus({ status: 'unreachable', detail: 'Could not fetch /routing/status from dispatch hub.' });
      }
    }

    try {
      const profilesResponse = await fetchWithTimeout(`${HUB_BASE_URL}/autonomy/profiles`, { method: 'GET' }, 8000);
      const profilesPayload = await parseResponseSafely(profilesResponse);
      const profiles = normalizeAutonomyProfiles(profilesPayload);
      if (isCurrentRequest()) {
        setAutonomyProfiles(profiles);
        if (!profiles.some((profile) => profile.id === autonomyProfileId)) {
          setAutonomyProfileId(profiles[0]?.id ?? AUTONOMY_PROFILE_FALLBACK[0].id);
        }
      }
    } catch {
      if (isCurrentRequest()) {
        setAutonomyProfiles(AUTONOMY_PROFILE_FALLBACK);
        if (!AUTONOMY_PROFILE_FALLBACK.some((profile) => profile.id === autonomyProfileId)) {
          setAutonomyProfileId(AUTONOMY_PROFILE_FALLBACK[0].id);
        }
      }
    }

    try {
      const capabilitiesResponse = await fetchWithTimeout(`${HUB_BASE_URL}/autonomy/capabilities`, { method: 'GET' }, 8000);
      const capabilitiesPayload = await parseResponseSafely(capabilitiesResponse);
      if (isCurrentRequest()) {
        setCapabilitiesStatus(capabilitiesPayload);
      }
    } catch {
      if (isCurrentRequest()) {
        setCapabilitiesStatus({ status: 'unreachable', limitations: ['Capabilities endpoint unreachable'] });
      }
    }

    if (!isCurrentRequest()) {
      return;
    }

    const checkedAt = nowIso();
    const serviceResults: ServiceHealth[] = SERVICE_CATALOG.map((service) => {
      if (!service.targetKey) {
        if (service.id === 'bolt') {
          return {
            id: service.id,
            label: service.label,
            source: service.source,
            state: hubState,
            detail: hubDetail,
            checkedAt,
          };
        }
        const probe = directServiceProbes[service.id];
        const statusCode = typeof probe?.http_status === 'number' ? (probe.http_status as number) : null;
        const probeError = probe?.error ? String(probe.error) : '';
        return {
          id: service.id,
          label: service.label,
          source: service.source,
          state: statusCode === 200 ? 'up' : 'down',
          detail: statusCode === null ? probeError || 'No probe result' : `HTTP ${statusCode}${probeError ? ` (${probeError})` : ''}`,
          checkedAt,
        };
      }

      const probe = routingTargets[service.targetKey];
      const statusCode = typeof probe?.http_status === 'number' ? (probe.http_status as number) : null;
      const probeError = probe?.error ? String(probe.error) : '';
      return {
        id: service.id,
        label: service.label,
        source: service.source,
        state: statusCode === 200 ? 'up' : 'down',
        detail: statusCode === null ? probeError || 'No probe result' : `HTTP ${statusCode}${probeError ? ` (${probeError})` : ''}`,
        checkedAt,
      };
    });
    setServiceHealth(serviceResults);
    applyPromptReadiness(promptReadyLocal);

    const upCount = serviceResults.filter((service) => service.state === 'up').length;
    setPlatformStatus(
      `Checks complete: ${upCount}/${serviceResults.length} services responding. Bootstrap: ${bootstrapStatusLocal}. Prompt Ready: ${
        promptReadyLocal ? 'yes' : 'no'
      }.`
    );
    setPlatformBusy(false);
  };

  const openOpenHandsConversation = async () => {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      setPlatformStatus('Cannot create OpenHands conversation in this runtime.');
      return;
    }
    try {
      const response = await fetchWithTimeout(
        'http://127.0.0.1:3000/api/conversations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Godmode Session ${new Date().toLocaleString()}`,
          }),
        },
        7000
      );
      setPlatformStatus(`OpenHands conversation request: HTTP ${response.status}.`);
      window.open('http://127.0.0.1:3000', '_blank', 'noopener,noreferrer');
    } catch (error) {
      setPlatformStatus(`OpenHands conversation failed: ${parseErrorMessage(error)}.`);
    }
  };

  const handleDispatchFieldChange = (field: keyof DispatchPayload, value: string) => {
    setDispatchPayload((current) => ({ ...current, [field]: value }));
  };

  const selectedTemplate =
    PROMPT_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? PROMPT_TEMPLATES[0];
  const selectedAutonomyProfile =
    autonomyProfiles.find((profile) => profile.id === autonomyProfileId) ?? autonomyProfiles[0] ?? AUTONOMY_PROFILE_FALLBACK[0];
  const capabilityLimitations = asStringArray(capabilitiesStatus?.limitations);
  const noLimitsClaim = capabilitiesStatus?.no_limits_claim === true;
  const bootstrapErrors = useMemo(() => extractBootstrapErrors(bootstrapState), [bootstrapState]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setQuickActionStatus(`Copied ${label} to clipboard.`);
    } catch (error) {
      setQuickActionStatus(`Copy failed (${label}): ${parseErrorMessage(error)}`);
    }
  };

  const applyTemplateToDispatch = () => {
    setDispatchPayload((current) => ({
      ...current,
      agent: selectedTemplate.recommendedAgent,
      task: selectedTemplate.task,
      source: 'platform-template',
      status: 'queued',
      timestamp: nowIso(),
    }));
    setAutonomyGoal(selectedTemplate.task);
    setPromptCommand(selectedTemplate.task);
    setQuickActionStatus(`Template "${selectedTemplate.title}" applied to mission payload.`);
  };

  const dispatchMission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (typeof fetch !== 'function') {
      setDispatchMessage('Dispatch failed: fetch API unavailable.');
      return;
    }
    const requiredFields: (keyof DispatchPayload)[] = ['agent', 'task', 'source', 'repo', 'ref', 'status', 'timestamp'];
    const missing = requiredFields.filter((field) => dispatchPayload[field].trim().length === 0);
    if (missing.length > 0) {
      setDispatchMessage(`Dispatch rejected locally. Missing fields: ${missing.join(', ')}`);
      return;
    }

    setDispatchBusy(true);
    setDispatchMessage('Dispatch in progress...');
    try {
      const response = await fetchWithTimeout(
        `${HUB_BASE_URL}/dispatch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dispatchPayload),
        },
        7000
      );
      const payload = await parseResponseSafely(response);
      const summary = JSON.stringify(payload).slice(0, 260);
      setDispatchMessage(`Dispatch response HTTP ${response.status}. ${summary}`);
      setDispatchPayload((current) => ({ ...current, timestamp: nowIso() }));
    } catch (error) {
      setDispatchMessage(`Dispatch failed: ${parseErrorMessage(error)}`);
    } finally {
      setDispatchBusy(false);
    }
  };

  const runAutonomyPipeline = async () => {
    if (typeof fetch !== 'function') {
      setAutonomyMessage('Autonomy run failed: fetch API unavailable.');
      return;
    }
    if (!readyForPromptExecution) {
      setAutonomyMessage('Autonomy run blocked: bootstrap is not READY.');
      return;
    }
    if (!autonomyGoal.trim()) {
      setAutonomyMessage('Autonomy run rejected: goal prompt is empty.');
      return;
    }

    setAutonomyBusy(true);
    setAutonomyMessage('Autonomous multi-agent run in progress...');
    try {
      const response = await fetchWithTimeout(
        `${HUB_BASE_URL}/runs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: autonomyGoal.trim(),
            profile_id: selectedAutonomyProfile.id,
            source: 'platform-autonomy',
            repo: dispatchPayload.repo,
            ref: dispatchPayload.ref,
            status: 'queued',
            halt_on_fail: false,
          }),
        },
        30000
      );
      const payload = await parseResponseSafely(response);
      const summary = JSON.stringify(payload).slice(0, 400);
      const runPayload = normalizeRunPayload(payload);
      if (runPayload) {
        setCurrentRun(runPayload);
          setAutonomyMessage(
            `Autonomy response HTTP ${response.status}. Run ${runPayload.run_id} is ${runPayload.status} with ${runPayload.forwarded_steps}/${runPayload.total_steps} forwarded steps and ${runPayload.partial_steps} partial/fallback steps.`
          );
      } else {
        setAutonomyMessage(`Autonomy response HTTP ${response.status}. ${summary}`);
      }
      setDispatchPayload((current) => ({ ...current, timestamp: nowIso() }));
      void refreshPlatformChecks();
    } catch (error) {
      setAutonomyMessage(`Autonomy run failed: ${parseErrorMessage(error)}`);
    } finally {
      setAutonomyBusy(false);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = engineRef.current.getSnapshot();
      if (current.state === 'running') {
        engineRef.current.tick(current.speed);
        const updated = engineRef.current.getSnapshot();
        if (updated.state === 'won') {
          updateStatus('Level completed. Required rescue quota reached.');
        } else if (updated.state === 'lost') {
          updateStatus('Mission failed. Restart level and adjust skills.');
        }
        startTransition(() => {
          setSnapshot(updated);
        });
      }
    }, 70);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeView !== 'platform') {
      return;
    }
    void refreshPlatformChecks();
    const refreshIntervalMs =
      promptBusy || autonomyBusy || (currentRunStatus.length > 0 && runChipState(currentRunStatus) === 'checking') ? 4000 : 30000;
    const timer = window.setInterval(() => {
      void refreshPlatformChecks();
    }, refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [activeView, autonomyBusy, currentRunStatus, promptBusy]);

  return (
    <main className={`app-shell ${highContrast ? 'app-shell--contrast' : ''}`}>
      <header className="app-toolbar">
        <div>
          <p className="control-panel__eyebrow">All-in-One Operator Homepage</p>
          <h1>Godmode Superbrain Control Center</h1>
          <p className="control-panel__lede">
            Eine Plattform für 26 Agenten, One-Click-Start, Prompt-basierte App/3D-Generierung und Live-Dispatch.
          </p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button"
            aria-pressed={activeView === 'platform'}
            onClick={() => setActiveView('platform')}
          >
            Open platform dashboard
          </button>
          <button
            type="button"
            className="button button--primary"
            aria-pressed={activeView === 'game'}
            onClick={() => setActiveView('game')}
          >
            Open creator sandbox
          </button>
        </div>
      </header>

      {activeView === 'platform' ? (
        <section className="platform-grid">
          <article className="platform-card">
            <h2>Runtime Health</h2>
            <p className="status-banner">{platformStatus}</p>
            <div className="button-row">
              <button type="button" className="button" onClick={() => void refreshPlatformChecks()} disabled={platformBusy}>
                {platformBusy ? 'Checking...' : 'Refresh checks'}
              </button>
              <button type="button" className="button" onClick={() => window.open('http://127.0.0.1:3000', '_blank', 'noopener,noreferrer')}>
                Open OpenHands UI
              </button>
              <button type="button" className="button" onClick={() => void openOpenHandsConversation()}>
                New OpenHands conversation
              </button>
            </div>
            <ul className="health-list" aria-label="Service health list">
              {serviceHealth.map((service) => (
                <li key={service.id} className={`health-chip health-chip--${service.state}`}>
                  <strong>{service.label}</strong>
                  <span>{service.detail}</span>
                  <code>{service.source}</code>
                </li>
              ))}
            </ul>
          </article>

          <article className="platform-card">
            <h2>One-Click Bootstrap</h2>
            <p className="status-banner">
              Bootstrap status: <strong>{bootstrapState.status}</strong> | Prompt Ready:{' '}
              <strong>{readyForPromptExecution ? 'YES' : 'NO'}</strong>
            </p>
            <p>{bootstrapState.summary ?? 'No bootstrap summary yet.'}</p>
            {bootstrapErrors.length > 0 ? (
              <>
                <p className="hud-muted">Blocking preflight errors:</p>
                <ul className="health-list">
                  {bootstrapErrors.map((entry) => (
                    <li key={entry} className="health-chip health-chip--down">
                      <strong>BLOCKED</strong>
                      <span>{entry}</span>
                    </li>
                  ))}
                </ul>
                <p className="hud-muted">
                  Recovery: set missing variables in <code>.godmode_env</code>, restart stack, then run one-click bootstrap again.
                </p>
              </>
            ) : null}
            <div className="button-row">
              <button type="button" className="button button--primary" onClick={() => void startBootstrap()} disabled={bootstrapBusy}>
                {bootstrapBusy ? 'Bootstrapping...' : 'Start system (one-click)'}
              </button>
              <button type="button" className="button" onClick={() => void refreshBootstrapStatus()} disabled={bootstrapBusy}>
                Refresh bootstrap status
              </button>
            </div>
            <p>Started at: <code>{bootstrapState.started_at || '-'}</code></p>
            <p>Finished at: <code>{bootstrapState.finished_at || '-'}</code></p>
            <p>Windows</p>
            <pre className="json-panel"><code>{ONE_CLICK_WINDOWS}</code></pre>
            <p>Linux</p>
            <pre className="json-panel"><code>{ONE_CLICK_LINUX}</code></pre>
            <div className="button-row">
              <button
                type="button"
                className="button"
                onClick={() => void copyText(ONE_CLICK_WINDOWS, 'Windows start command')}
              >
                Copy Windows start command
              </button>
              <button
                type="button"
                className="button"
                onClick={() => void copyText(ONE_CLICK_LINUX, 'Linux start command')}
              >
                Copy Linux start command
              </button>
            </div>
            <p className="status-banner">{quickActionStatus}</p>
          </article>

          <article className="platform-card">
            <h2>Prompt Command Layer</h2>
            <p>
              Gib eine Anweisung in natürlicher Sprache ein. Ausführung ist nur erlaubt, wenn Bootstrap auf READY
              steht.
            </p>
            <label className="dispatch-label">
              Agent profile for this prompt
              <select
                value={selectedAutonomyProfile.id}
                onChange={(event) => setAutonomyProfileId(event.target.value)}
                aria-label="Prompt agent profile selector"
              >
                {autonomyProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="hud-muted">
              Chain: <code>{selectedAutonomyProfile.agents.join(' -> ')}</code>
            </p>
            <label className="dispatch-label">
              Prompt command
              <textarea
                rows={6}
                value={promptCommand}
                onChange={(event) => setPromptCommand(event.target.value)}
                placeholder="Build a production-ready app with tests and artifact evidence."
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                className="button button--primary"
                onClick={() => void executePromptCommand()}
                disabled={promptBusy || !readyForPromptExecution}
              >
                {promptBusy ? 'Executing...' : 'Execute prompt with autonomous agents'}
              </button>
              <button type="button" className="button" onClick={() => void copyText(promptCommand, 'prompt command')}>
                Copy prompt
              </button>
            </div>
            {!readyForPromptExecution ? (
              <p className="hud-muted">Prompt execution is locked until one-click bootstrap returns READY.</p>
            ) : null}
            <p className="status-banner">{promptMessage}</p>
          </article>

          <article className="platform-card platform-card--wide">
            <h2>Agent Live Activity Monitor</h2>
            {currentRun ? (
              <>
                <p className={`status-banner run-status run-status--${runChipState(currentRun.status)}`}>
                  Run <strong>{currentRun.run_id}</strong> | Status <strong>{currentRun.status}</strong> | Progress{' '}
                  <strong>
                    {currentRun.forwarded_steps}/{currentRun.total_steps}
                  </strong>
                  {currentRun.partial_steps ? ` | Partial/Fallback: ${currentRun.partial_steps}` : ''}
                  {currentRun.current_agent ? ` | Active: ${currentRun.current_agent}` : ''}
                </p>
                <p className="hud-muted">
                  Profile: <code>{currentRun.profile_label || currentRun.profile_id || 'unknown'}</code> | Started:{' '}
                  <code>{currentRun.started_at || '-'}</code> | Finished: <code>{currentRun.finished_at || '-'}</code>
                </p>
                <ul className="agent-list run-step-list" aria-label="Live agent run status">
                  {currentRun.steps.length === 0 ? (
                    <li className="health-chip health-chip--checking">
                      <strong>Waiting for first agent step</strong>
                      <span>The hub has created the run, but no agent has started yet.</span>
                    </li>
                  ) : (
                    currentRun.steps.map((step) => (
                      <li key={`${currentRun.run_id}-${step.step}-${step.agent}`} className={`health-chip health-chip--${runChipState(step.status)}`}>
                        <strong>
                          Step {step.step}: {step.agent}
                        </strong>
                        <span>
                            Status: {step.status}
                            {step.raw_status && step.raw_status !== step.status ? ` | Raw: ${step.raw_status}` : ''}
                            {step.runtime_target ? ` | Target: ${step.runtime_target}` : ''}
                            {step.http_status ? ` | HTTP ${step.http_status}` : ''}
                          </span>
                          {step.fallback_used ? (
                            <span>
                              Fallback used: {step.fallback_task_id || 'yes'}
                              {step.fallback_endpoint ? ` | ${step.fallback_endpoint}` : ''}
                            </span>
                          ) : null}
                          {step.fallback_reason ? <span>Fallback reason: {step.fallback_reason}</span> : null}
                          {step.recovery_used ? (
                            <span>
                              Recovery: {step.recovery_reason || 'chat-completions artifact recovery'}
                              {step.recovery_endpoint ? ` | ${step.recovery_endpoint}` : ''}
                            </span>
                          ) : null}
                          {step.primary_orchestrate_status ? (
                            <span>
                              Primary orchestrate: {step.primary_orchestrate_status}
                              {step.primary_orchestrate_http_status
                                ? ` | HTTP ${step.primary_orchestrate_http_status}`
                                : ''}
                            </span>
                          ) : null}
                          {step.reason ? <span>Reason: {step.reason}</span> : null}
                          {step.final_code_artifact ? (
                            <span>
                              Generated artifact: <code>{step.final_code_artifact}</code>
                              {step.final_code_bytes ? ` (${step.final_code_bytes} bytes)` : ''}
                            </span>
                          ) : null}
                          {step.final_code_url ? (
                            <span>
                              Preview:{' '}
                              <a href={`${HUB_BASE_URL}${step.final_code_url}`} target="_blank" rel="noreferrer">
                                open generated HTML artifact
                              </a>
                            </span>
                          ) : null}
                          {step.response_excerpt ? <span>Evidence preview: {step.response_excerpt}</span> : null}
                        {step.dispatch_artifact ? <code>{step.dispatch_artifact}</code> : null}
                      </li>
                    ))
                  )}
                </ul>
                <p className="hud-muted">
                  Evidence: <code>{currentRun.run_file || currentRun.snapshot || 'runtime evidence not reported yet'}</code>
                </p>
              </>
            ) : (
              <p className="status-banner">
                No run loaded yet. Execute a prompt or refresh checks to load the latest hub run.
              </p>
            )}
          </article>

          <article className="platform-card">
            <h2>Advanced Panels</h2>
            <p>Optional expert controls for raw dispatch payloads, profile pipelines and routing JSON.</p>
            <div className="button-row">
              <button
                type="button"
                className="button"
                aria-pressed={showAdvancedPanels}
                onClick={() => setShowAdvancedPanels((current) => !current)}
              >
                {showAdvancedPanels ? 'Hide advanced panels' : 'Show advanced panels'}
              </button>
            </div>
          </article>

          {showAdvancedPanels ? (
            <>
          <article className="platform-card">
            <h2>Prompt Builder (Apps + 3D + Automation)</h2>
            <label className="dispatch-label">
              Template
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                aria-label="Prompt template selector"
              >
                {PROMPT_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Recommended agent: <code>{selectedTemplate.recommendedAgent}</code>
            </p>
            <pre className="json-panel">{selectedTemplate.task}</pre>
            <div className="button-row">
              <button type="button" className="button button--primary" onClick={applyTemplateToDispatch}>
                Use template for dispatch
              </button>
              <button
                type="button"
                className="button"
                onClick={() => void copyText(selectedTemplate.task, `${selectedTemplate.title} prompt`)}
              >
                Copy prompt
              </button>
            </div>
          </article>

          <article className="platform-card">
            <h2>Autonomous Multi-Agent Run</h2>
            <label className="dispatch-label">
              Execution profile
              <select
                value={selectedAutonomyProfile.id}
                onChange={(event) => setAutonomyProfileId(event.target.value)}
                aria-label="Autonomy profile selector"
              >
                {autonomyProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
            <p>{selectedAutonomyProfile.description}</p>
            <p>
              Agent chain: <code>{selectedAutonomyProfile.agents.join(' -> ')}</code>
            </p>
            <label className="dispatch-label">
              Goal prompt
              <textarea
                rows={5}
                value={autonomyGoal}
                onChange={(event) => setAutonomyGoal(event.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                className="button button--primary"
                onClick={() => void runAutonomyPipeline()}
                disabled={autonomyBusy}
              >
                {autonomyBusy ? 'Running...' : 'Run fully autonomous pipeline'}
              </button>
              <button
                type="button"
                className="button"
                onClick={() => void copyText(autonomyGoal, 'autonomy goal prompt')}
              >
                Copy autonomy prompt
              </button>
            </div>
            <p className="status-banner">{autonomyMessage}</p>
          </article>

          <article className="platform-card">
            <h2>AI Capability Reality Check</h2>
            <p className="status-banner">
              No-limits claim: <strong>{noLimitsClaim ? 'TRUE' : 'FALSE'}</strong>
            </p>
            <p>
              This platform routes across the 26-agent superbrain. Full parity with top global AI depends on external
              provider access, credits, and runtime availability.
            </p>
            {capabilityLimitations.length === 0 ? (
              <p className="hud-muted">No active limitations reported by hub capabilities endpoint.</p>
            ) : (
              <ul className="agent-list">
                {capabilityLimitations.map((item, index) => (
                  <li key={`limit-${index}`}>
                    <strong>Limit {index + 1}</strong>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            <p>
              Source: <code>{HUB_BASE_URL}/autonomy/capabilities</code>
            </p>
          </article>

          <article className="platform-card">
            <h2>Agent Registry Snapshot</h2>
            <p>Source: <code>{HUB_BASE_URL}/agents</code></p>
            <p className="status-banner">
              Active agents: {agentCounts.active} | Legacy: {agentCounts.legacy} | Target: 25 + 1
            </p>
            {agents.length === 0 ? (
              <p className="hud-muted">No agents returned. Check dispatch hub or CORS policy.</p>
            ) : (
              <ul className="agent-list">
                {agents.slice(0, 40).map((agent, index) => {
                  const agentId =
                    String(agent.agent_id ?? agent.id ?? agent.name ?? `agent-${index}`);
                  const status = String(agent.status_class ?? agent.status ?? 'unknown');
                  const target = String(agent.runtime_target ?? agent.target ?? '-');
                  return (
                    <li key={`${agentId}-${index}`}>
                      <strong>{agentId}</strong>
                      <span>Status: {status}</span>
                      <span>Target: {target}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="platform-card">
            <h2>Routing Status</h2>
            <p>Source: <code>{HUB_BASE_URL}/routing/status</code></p>
            <pre className="json-panel">{JSON.stringify(routingStatus ?? { status: 'not-loaded' }, null, 2)}</pre>
          </article>

          <article className="platform-card">
            <h2>7-Field Mission Dispatch</h2>
            <p>
              Required contract:
              <code> agent, task, source, repo, ref, status, timestamp</code>
            </p>
            <form className="dispatch-form" onSubmit={dispatchMission}>
              <label>
                Agent
                <input
                  value={dispatchPayload.agent}
                  onChange={(event) => handleDispatchFieldChange('agent', event.target.value)}
                  placeholder="local.langgraph.planner"
                />
              </label>
              <label>
                Task
                <textarea
                  value={dispatchPayload.task}
                  onChange={(event) => handleDispatchFieldChange('task', event.target.value)}
                  rows={3}
                />
              </label>
              <label>
                Source
                <input
                  value={dispatchPayload.source}
                  onChange={(event) => handleDispatchFieldChange('source', event.target.value)}
                />
              </label>
              <label>
                Repo
                <input
                  value={dispatchPayload.repo}
                  onChange={(event) => handleDispatchFieldChange('repo', event.target.value)}
                />
              </label>
              <label>
                Ref
                <input
                  value={dispatchPayload.ref}
                  onChange={(event) => handleDispatchFieldChange('ref', event.target.value)}
                />
              </label>
              <label>
                Status
                <input
                  value={dispatchPayload.status}
                  onChange={(event) => handleDispatchFieldChange('status', event.target.value)}
                />
              </label>
              <label>
                Timestamp
                <input
                  value={dispatchPayload.timestamp}
                  onChange={(event) => handleDispatchFieldChange('timestamp', event.target.value)}
                />
              </label>
              <div className="button-row">
                <button type="submit" className="button button--primary" disabled={dispatchBusy}>
                  {dispatchBusy ? 'Dispatching...' : 'Send mission dispatch'}
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => setDispatchPayload(defaultDispatchPayload())}
                  disabled={dispatchBusy}
                >
                  Reset payload
                </button>
              </div>
            </form>
            <p className="status-banner">{dispatchMessage}</p>
          </article>
            </>
          ) : null}
        </section>
      ) : (
        <section className="app-content app-content--game">
          <section className="control-panel">
            <p className="control-panel__eyebrow">3D Creator Sandbox</p>
            <h1>Godmode 3D Sandbox</h1>
            <p className="control-panel__lede">
              Optionale Demo-Sandbox für 3D/Simulationstests. Primärer Projektfokus bleibt die Multi-Agenten-Entwicklerplattform.
            </p>

            <div className="status-banner" data-testid="status-banner">
              <strong>Status:</strong> {statusMessage}
            </div>

            {showHud ? (
              <div className="metrics-grid" aria-label="Mission metrics">
                <p data-testid="metric-state">
                  State: <strong>{deferredSnapshot.state}</strong>
                </p>
                <p data-testid="metric-level">
                  Level: <strong>{deferredSnapshot.levelTitle}</strong>
                </p>
                <p data-testid="metric-saved">
                  Saved: <strong>{deferredSnapshot.saved}</strong> / {deferredSnapshot.requiredSaved}
                </p>
                <p data-testid="metric-spawned">
                  Spawned: <strong>{deferredSnapshot.spawned}</strong> / {deferredSnapshot.totalAgents}
                </p>
                <p data-testid="metric-selected">
                  Selected: <strong>{selectedAgent ? `#${selectedAgent.id}` : 'none'}</strong>
                </p>
                <p data-testid="metric-skill">
                  Skill: <strong>{humanize(deferredSnapshot.selectedSkill)}</strong>
                </p>
                <p data-testid="metric-speed">
                  Speed: <strong>{deferredSnapshot.speed}x</strong>
                </p>
                <p data-testid="metric-quality">
                  Quality: <strong>{deferredSnapshot.quality}</strong>
                </p>
                <p data-testid="metric-remaining">
                  Remaining rescue quota: <strong>{deferredSnapshot.remainingToSave}</strong>
                </p>
                <p data-testid="metric-math-validation">
                  Math validation: <strong>{mathValidationLabel}</strong>
                </p>
              </div>
            ) : (
              <p className="hud-muted">HUD hidden. Re-enable HUD to view runtime metrics.</p>
            )}

            <div className="button-row">
              <button type="button" className="button button--primary" onClick={startMission}>
                Start mission
              </button>
              <button type="button" className="button" onClick={pauseMission} disabled={missionState !== 'running'}>
                Pause mission
              </button>
              <button type="button" className="button" onClick={resumeMission} disabled={missionState !== 'paused'}>
                Resume mission
              </button>
              <button type="button" className="button" onClick={restartLevel}>
                Restart level
              </button>
              <button type="button" className="button" onClick={resetCampaign}>
                Reset campaign
              </button>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="button"
                onClick={() => setLevelByIndex(Math.max(deferredSnapshot.levelIndex - 1, 0))}
                disabled={deferredSnapshot.levelIndex <= 0}
              >
                Previous level
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setLevelByIndex(Math.min(deferredSnapshot.levelIndex + 1, LEVEL_LIBRARY.length - 1))}
                disabled={deferredSnapshot.levelIndex >= LEVEL_LIBRARY.length - 1}
              >
                Next level
              </button>
              <button type="button" className="button" onClick={selectNextAgent}>
                Select next lemming
              </button>
              <button
                type="button"
                className="button"
                onClick={assignSelectedSkill}
                disabled={deferredSnapshot.selectedAgentId === null}
              >
                Assign selected skill
              </button>
              <button type="button" className="button" onClick={runMathValidationProbe}>
                Run math validation
              </button>
            </div>

            <div className="button-row">
              {SPEED_PRESETS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className="button"
                  aria-pressed={deferredSnapshot.speed === speed}
                  onClick={() => setSpeed(speed)}
                >
                  Speed {speed}x
                </button>
              ))}
            </div>

            <div className="button-row">
              {QUALITY_PRESETS.map((quality) => (
                <button
                  key={quality}
                  type="button"
                  className="button"
                  aria-pressed={deferredSnapshot.quality === quality}
                  onClick={() => setQuality(quality)}
                >
                  Quality {humanize(quality)}
                </button>
              ))}
            </div>

            <div className="button-row">
              <button type="button" className="button" onClick={() => setShowGrid((current) => !current)}>
                Toggle grid
              </button>
              <button type="button" className="button" onClick={() => setShowAtmosphere((current) => !current)}>
                Toggle atmosphere
              </button>
              <button type="button" className="button" onClick={() => setShowAgents((current) => !current)}>
                Toggle agents
              </button>
              <button type="button" className="button" onClick={() => setAudioEnabled((current) => !current)}>
                Toggle audio
              </button>
              <button type="button" className="button" onClick={() => setShowHud((current) => !current)}>
                Toggle HUD
              </button>
              <button type="button" className="button" onClick={() => setHighContrast((current) => !current)}>
                Toggle high contrast
              </button>
            </div>

            <section className="skill-panel" aria-label="Skill controls">
              <p className="skill-panel__title">Skill console</p>
              <div className="skill-grid">
                {SKILL_BUTTONS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    className="button"
                    aria-pressed={deferredSnapshot.selectedSkill === skill}
                    onClick={() => setSkill(skill)}
                  >
                    Skill: {humanize(skill)} ({deferredSnapshot.skillInventory[skill]})
                  </button>
                ))}
              </div>
            </section>

            <section className="level-info" aria-label="Level details">
              <p className="level-info__title">{level.title}</p>
              <p>{level.description}</p>
            </section>
          </section>

          <section className="scene-panel" aria-label="3D viewport">
            {!sceneRequested ? (
              <SceneFallback
                title="Mission in standby"
                description="Start mission to spawn lemmings, issue skills, and run the deterministic simulation."
                tone="standby"
              />
            ) : !webglReady ? (
              <SceneFallback
                title="WebGL unavailable"
                description="WebGL is required for the 3D viewport. Runtime controls remain active for verification."
                tone="error"
              />
            ) : (
              <CanvasErrorBoundary
                fallback={
                  <SceneFallback
                    title="3D scene crashed"
                    description="Renderer failed. The control panel remains available for diagnostics and reruns."
                    tone="error"
                  />
                }
              >
                <Suspense
                  fallback={
                    <SceneFallback
                      title="Loading 3D stage"
                      description="Streaming terrain, lights, and active lemmings."
                      tone="loading"
                    />
                  }
                >
                  <SceneCanvas
                    snapshot={deferredSnapshot}
                    showGrid={showGrid}
                    showAtmosphere={showAtmosphere}
                    showAgents={showAgents}
                    highContrast={highContrast}
                    quality={deferredSnapshot.quality}
                    selectedAgentId={deferredSnapshot.selectedAgentId}
                    onSelectAgent={(agentId) => {
                      engineRef.current.setSelectedAgent(agentId);
                      updateStatus(`Selected lemming #${agentId} via viewport.`);
                      refreshSnapshot();
                    }}
                  />
                </Suspense>
              </CanvasErrorBoundary>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
