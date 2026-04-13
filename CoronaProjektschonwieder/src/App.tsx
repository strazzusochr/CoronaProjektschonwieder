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
    description: 'Planner -> Performance -> UI Review -> External Lead Coder -> Finalize',
    agents: [
      'local.langgraph.planner',
      'local.langgraph.performance',
      'local.langgraph.ui_review',
      'external.ollamahf.lead_coder',
      'local.langgraph.finalize',
    ],
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
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState('No mission dispatched yet.');
  const [dispatchPayload, setDispatchPayload] = useState<DispatchPayload>(() => defaultDispatchPayload());
  const [selectedTemplateId, setSelectedTemplateId] = useState(PROMPT_TEMPLATES[0].id);
  const [autonomyProfiles, setAutonomyProfiles] = useState<AutonomyProfile[]>(AUTONOMY_PROFILE_FALLBACK);
  const [autonomyProfileId, setAutonomyProfileId] = useState(AUTONOMY_PROFILE_FALLBACK[0].id);
  const [autonomyGoal, setAutonomyGoal] = useState(PROMPT_TEMPLATES[0].task);
  const [autonomyBusy, setAutonomyBusy] = useState(false);
  const [autonomyMessage, setAutonomyMessage] = useState('No autonomous run started yet.');
  const [quickActionStatus, setQuickActionStatus] = useState('No quick action executed yet.');
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentCounts, setAgentCounts] = useState<AgentCounts>({ active: 0, legacy: 0 });
  const [routingStatus, setRoutingStatus] = useState<RoutingRecord>(null);
  const [capabilitiesStatus, setCapabilitiesStatus] = useState<CapabilitiesRecord>(null);
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

  const refreshPlatformChecks = async () => {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      setPlatformStatus('Fetch API unavailable in this runtime.');
      return;
    }
    setPlatformBusy(true);
    setPlatformStatus('Running live checks for services, routing, and agent registry...');
    setServiceHealth((current) =>
      current.map((service) => ({ ...service, state: 'checking', detail: 'Checking...', checkedAt: nowIso() }))
    );

    let hubState: HealthState = 'down';
    let hubDetail = 'No response from /health';
    let routingTargets: Record<string, Record<string, unknown>> = {};

    try {
      const healthResponse = await fetchWithTimeout(`${HUB_BASE_URL}/health`, { method: 'GET' }, 5000);
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
      const agentsResponse = await fetchWithTimeout(`${HUB_BASE_URL}/agents`, { method: 'GET' }, 5000);
      const agentsPayload = await parseResponseSafely(agentsResponse);
      setAgents(normalizeAgentsPayload(agentsPayload));
      setAgentCounts({
        active: Number(agentsPayload.active_count ?? 0),
        legacy: Number(agentsPayload.legacy_count ?? 0),
      });
    } catch {
      setAgents([]);
      setAgentCounts({ active: 0, legacy: 0 });
    }

    try {
      const routingResponse = await fetchWithTimeout(`${HUB_BASE_URL}/routing/status`, { method: 'GET' }, 5000);
      const routingPayload = await parseResponseSafely(routingResponse);
      setRoutingStatus(routingPayload);
      if (
        routingPayload.targets &&
        typeof routingPayload.targets === 'object' &&
        !Array.isArray(routingPayload.targets)
      ) {
        routingTargets = routingPayload.targets as Record<string, Record<string, unknown>>;
      }
    } catch {
      setRoutingStatus({ status: 'unreachable', detail: 'Could not fetch /routing/status from dispatch hub.' });
    }

    try {
      const profilesResponse = await fetchWithTimeout(`${HUB_BASE_URL}/autonomy/profiles`, { method: 'GET' }, 5000);
      const profilesPayload = await parseResponseSafely(profilesResponse);
      const profiles = normalizeAutonomyProfiles(profilesPayload);
      setAutonomyProfiles(profiles);
      if (!profiles.some((profile) => profile.id === autonomyProfileId)) {
        setAutonomyProfileId(profiles[0]?.id ?? AUTONOMY_PROFILE_FALLBACK[0].id);
      }
    } catch {
      setAutonomyProfiles(AUTONOMY_PROFILE_FALLBACK);
      if (!AUTONOMY_PROFILE_FALLBACK.some((profile) => profile.id === autonomyProfileId)) {
        setAutonomyProfileId(AUTONOMY_PROFILE_FALLBACK[0].id);
      }
    }

    try {
      const capabilitiesResponse = await fetchWithTimeout(`${HUB_BASE_URL}/autonomy/capabilities`, { method: 'GET' }, 5000);
      const capabilitiesPayload = await parseResponseSafely(capabilitiesResponse);
      setCapabilitiesStatus(capabilitiesPayload);
    } catch {
      setCapabilitiesStatus({ status: 'unreachable', limitations: ['Capabilities endpoint unreachable'] });
    }

    const checkedAt = nowIso();
    const serviceResults: ServiceHealth[] = SERVICE_CATALOG.map((service) => {
      if (!service.targetKey) {
        return {
          id: service.id,
          label: service.label,
          source: service.source,
          state: hubState,
          detail: hubDetail,
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

    const upCount = serviceResults.filter((service) => service.state === 'up').length;
    setPlatformStatus(`Checks complete: ${upCount}/${serviceResults.length} services responding.`);
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
    if (!autonomyGoal.trim()) {
      setAutonomyMessage('Autonomy run rejected: goal prompt is empty.');
      return;
    }

    setAutonomyBusy(true);
    setAutonomyMessage('Autonomous multi-agent run in progress...');
    try {
      const response = await fetchWithTimeout(
        `${HUB_BASE_URL}/autonomy/run`,
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
      setAutonomyMessage(`Autonomy response HTTP ${response.status}. ${summary}`);
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
    const timer = window.setInterval(() => {
      void refreshPlatformChecks();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [activeView]);

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
            <h2>One-Click Start</h2>
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
