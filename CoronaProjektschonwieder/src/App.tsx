import { lazy, startTransition, Suspense, useDeferredValue, useState } from 'react';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';

const loadSceneCanvas = () => import('./SceneCanvas');
const SceneCanvas = lazy(loadSceneCanvas);

type Difficulty = 'rookie' | 'veteran' | 'nightmare';
type Theme = 'neon' | 'sunset';

type SceneFallbackProps = {
  title: string;
  description: string;
  tone?: 'loading' | 'error' | 'standby';
};

function SceneFallback({ title, description, tone = 'loading' }: SceneFallbackProps) {
  return (
    <div className={`scene-fallback scene-fallback--${tone}`} role="status">
      <span className="scene-fallback__eyebrow">
        {tone === 'error' ? 'Recovery mode' : tone === 'standby' ? 'Standby' : 'Loading'}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function scorePerOrb(difficulty: Difficulty) {
  if (difficulty === 'nightmare') {
    return 25;
  }

  if (difficulty === 'veteran') {
    return 15;
  }

  return 10;
}

function difficultyLabel(difficulty: Difficulty) {
  if (difficulty === 'nightmare') {
    return 'Nightmare';
  }

  if (difficulty === 'veteran') {
    return 'Veteran';
  }

  return 'Rookie';
}

export default function App() {
  const [isSceneRequested, setIsSceneRequested] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('rookie');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [theme, setTheme] = useState<Theme>('neon');

  const deferredScore = useDeferredValue(score);
  const deferredWave = useDeferredValue(wave);
  const deferredLives = useDeferredValue(lives);

  const activateScene = () => {
    startTransition(() => {
      setIsSceneRequested(true);
      setIsPaused(false);
    });
  };

  const preloadScene = () => {
    void loadSceneCanvas();
  };

  const resetMission = () => {
    setIsPaused(false);
    setDifficulty('rookie');
    setAutoRotate(true);
    setShowGrid(true);
    setShowAtmosphere(true);
    setWave(1);
    setScore(0);
    setLives(3);
    setTheme('neon');
  };

  const advanceWave = () => {
    if (!isSceneRequested || isPaused || lives <= 0) {
      return;
    }

    setWave((currentWave) => currentWave + 1);
  };

  const collectOrb = () => {
    if (!isSceneRequested || isPaused || lives <= 0) {
      return;
    }

    setScore((currentScore) => currentScore + scorePerOrb(difficulty));
  };

  const triggerHit = () => {
    if (!isSceneRequested || lives <= 0) {
      return;
    }

    setLives((currentLives) => {
      const nextLives = Math.max(currentLives - 1, 0);
      if (nextLives === 0) {
        setIsPaused(true);
      }
      return nextLives;
    });
  };

  const missionState = !isSceneRequested
    ? 'standby'
    : lives <= 0
      ? 'failed'
      : isPaused
        ? 'paused'
        : 'live';

  const canInteract = isSceneRequested && lives > 0;

  return (
    <main className={`app-shell app-shell--${theme}`}>
      <section className="control-panel">
        <p className="control-panel__eyebrow">Godmode 3D test platform</p>
        <h1>Godmode Arena Lab</h1>
        <p className="control-panel__lede">
          Neue Test-Game-Basis mit kompletter Kontrollflaeche fuer Szenenstart,
          Wellenlogik, Zustandsschalter und End-to-End Browser-Checks.
        </p>

        <div className="metrics-grid" aria-label="Mission metrics">
          <p data-testid="metric-state">
            State: <strong>{missionState}</strong>
          </p>
          <p data-testid="metric-wave">
            Wave: <strong>{deferredWave}</strong>
          </p>
          <p data-testid="metric-score">
            Score: <strong>{deferredScore}</strong>
          </p>
          <p data-testid="metric-lives">
            Lives: <strong>{deferredLives}</strong>
          </p>
          <p data-testid="metric-difficulty">
            Difficulty: <strong>{difficultyLabel(difficulty)}</strong>
          </p>
          <p data-testid="metric-theme">
            Theme: <strong>{theme === 'neon' ? 'Neon' : 'Sunset'}</strong>
          </p>
          <p data-testid="metric-grid">
            Grid: <strong>{showGrid ? 'On' : 'Off'}</strong>
          </p>
          <p data-testid="metric-atmosphere">
            Atmosphere: <strong>{showAtmosphere ? 'On' : 'Off'}</strong>
          </p>
          <p data-testid="metric-rotate">
            Auto rotate: <strong>{autoRotate ? 'On' : 'Off'}</strong>
          </p>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="button button--primary"
            onClick={activateScene}
            onMouseEnter={preloadScene}
            onFocus={preloadScene}
          >
            Activate 3D arena
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setIsPaused(true)}
            disabled={!canInteract || isPaused}
          >
            Pause simulation
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setIsPaused(false)}
            disabled={!canInteract || !isPaused}
          >
            Resume simulation
          </button>
          <button type="button" className="button" onClick={resetMission}>
            Reset mission
          </button>
        </div>

        <div className="button-row">
          <button type="button" className="button" onClick={advanceWave} disabled={!canInteract || isPaused}>
            Next wave
          </button>
          <button type="button" className="button" onClick={collectOrb} disabled={!canInteract || isPaused}>
            Collect orb
          </button>
          <button type="button" className="button" onClick={triggerHit} disabled={!isSceneRequested || lives <= 0}>
            Trigger hit
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setTheme((currentTheme) => (currentTheme === 'neon' ? 'sunset' : 'neon'))}
          >
            {theme === 'neon' ? 'Switch to sunset' : 'Switch to neon'}
          </button>
        </div>

        <div className="button-row button-row--toggles">
          <button type="button" className="button" onClick={() => setShowGrid((current) => !current)}>
            Toggle grid
          </button>
          <button type="button" className="button" onClick={() => setShowAtmosphere((current) => !current)}>
            Toggle atmosphere
          </button>
          <button type="button" className="button" onClick={() => setAutoRotate((current) => !current)}>
            Toggle auto rotate
          </button>
        </div>

        <div className="difficulty-switch" role="group" aria-label="Difficulty controls">
          <button
            type="button"
            className="button"
            aria-pressed={difficulty === 'rookie'}
            onClick={() => setDifficulty('rookie')}
          >
            Rookie mode
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={difficulty === 'veteran'}
            onClick={() => setDifficulty('veteran')}
          >
            Veteran mode
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={difficulty === 'nightmare'}
            onClick={() => setDifficulty('nightmare')}
          >
            Nightmare mode
          </button>
        </div>
      </section>

      <section className="scene-panel" aria-label="3D viewport">
        {isSceneRequested ? (
          <CanvasErrorBoundary
            fallback={
              <SceneFallback
                title="3D arena unavailable"
                description="Rendering failed. The control panel stays active so every mission switch can still be validated."
                tone="error"
              />
            }
          >
            <Suspense
              fallback={
                <SceneFallback
                  title="Loading 3D arena"
                  description="Streaming drones, arena lights, and challenge geometry."
                />
              }
            >
              <SceneCanvas
                paused={isPaused}
                difficulty={difficulty}
                wave={wave}
                autoRotate={autoRotate}
                showGrid={showGrid}
                showAtmosphere={showAtmosphere}
                theme={theme}
              />
            </Suspense>
          </CanvasErrorBoundary>
        ) : (
          <SceneFallback
            title="Arena is in standby"
            description="Start the arena to test rendering, controls, and runtime interactions end-to-end."
            tone="standby"
          />
        )}
      </section>
    </main>
  );
}
