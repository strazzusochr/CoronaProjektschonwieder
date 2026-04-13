import { lazy, startTransition, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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

export default function App() {
  const engineRef = useRef(new LemmingsEngine(0));
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

  const deferredSnapshot = useDeferredValue(snapshot);
  const level = LEVEL_LIBRARY[deferredSnapshot.levelIndex];
  const missionState = deferredSnapshot.state;
  const canInteract = missionState === 'running' || missionState === 'paused';
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

  return (
    <main className={`app-shell ${highContrast ? 'app-shell--contrast' : ''}`}>
      <section className="control-panel">
        <p className="control-panel__eyebrow">Godmode 3D test platform</p>
        <h1>Godmode Lemmings 3D Lab</h1>
        <p className="control-panel__lede">
          Lemmings-inspiriertes 3D Webgame mit deterministischer Tick-Simulation, Skill-Dispatch,
          Multi-Level-Pipeline und finalen Build-/Evidence-Gates.
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
          <button type="button" className="button" onClick={() => setLevelByIndex(Math.max(deferredSnapshot.levelIndex - 1, 0))} disabled={deferredSnapshot.levelIndex <= 0}>
            Previous level
          </button>
          <button type="button" className="button" onClick={() => setLevelByIndex(Math.min(deferredSnapshot.levelIndex + 1, LEVEL_LIBRARY.length - 1))} disabled={deferredSnapshot.levelIndex >= LEVEL_LIBRARY.length - 1}>
            Next level
          </button>
          <button type="button" className="button" onClick={selectNextAgent}>
            Select next lemming
          </button>
          <button type="button" className="button" onClick={assignSelectedSkill} disabled={deferredSnapshot.selectedAgentId === null}>
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
    </main>
  );
}
