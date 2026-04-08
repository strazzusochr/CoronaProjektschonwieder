import { lazy, startTransition, Suspense, useState } from 'react';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';

const loadSceneCanvas = () => import('./SceneCanvas');
const SceneCanvas = lazy(loadSceneCanvas);

type SceneFallbackProps = {
  title: string;
  description: string;
  tone?: 'loading' | 'error';
};

function SceneFallback({
  title,
  description,
  tone = 'loading',
}: SceneFallbackProps) {
  return (
    <div className={`scene-fallback scene-fallback--${tone}`} role="status">
      <span className="scene-fallback__eyebrow">
        {tone === 'error' ? 'Recovery mode' : 'Loading'}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function App() {
  const [isSceneRequested, setIsSceneRequested] = useState(false);

  const activateScene = () => {
    startTransition(() => {
      setIsSceneRequested(true);
    });
  };

  const preloadScene = () => {
    void loadSceneCanvas();
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">GODMODE Stack x Vienna Prototype</p>
        <h1>Corona V4</h1>
        <p className="hero-panel__lede">
          Ein stabilisierter 3D-Szenen-Prototyp mit sichtbarer Missionslage,
          robuster Browser-Fallback-Strategie und produktionsnaher Validierung.
        </p>
        <div className="hero-panel__chips" aria-label="Mission stats">
          <span>Build verified</span>
          <span>Browser smoke-tested</span>
          <span>Orbit to explore</span>
        </div>
        <ul className="hero-panel__checklist">
          <li>Interaktive 3D-Buehne mit belastbarer Kamerafuehrung</li>
          <li>Fallback-UI fuer langsames Laden oder WebGL-Probleme</li>
          <li>Klare Missionsanzeige statt schwarzem Leerbildschirm</li>
        </ul>
      </section>

      <section className="scene-panel" aria-label="3D viewport">
        <div className="scene-panel__hud">
          <p className="scene-panel__status">
            {isSceneRequested ? 'Viewport online' : 'Viewport standby'}
          </p>
          <div className="scene-panel__legend">
            <span>Drag to orbit</span>
            <span>Scroll to zoom</span>
          </div>
        </div>
        {isSceneRequested ? (
          <CanvasErrorBoundary
            fallback={
              <SceneFallback
                title="3D preview unavailable"
                description="The scene could not be initialized. The status panel stays online so the app never collapses into a blank screen."
                tone="error"
              />
            }
          >
            <Suspense
              fallback={
                <SceneFallback
                  title="Loading 3D scene"
                  description="Preparing the Vienna skyline, lights, and orbit controls."
                />
              }
            >
              <SceneCanvas />
            </Suspense>
          </CanvasErrorBoundary>
        ) : (
          <div className="scene-fallback scene-fallback--standby" role="status">
            <span className="scene-fallback__eyebrow">Standby</span>
            <h2>Launch the 3D viewport when you are ready</h2>
            <p>
              The heavy Three.js scene stays deferred until you explicitly open it,
              keeping first paint, audits, and browser startup much lighter.
            </p>
            <button
              className="scene-launch-button"
              type="button"
              onClick={activateScene}
              onMouseEnter={preloadScene}
              onFocus={preloadScene}
            >
              Activate 3D scene
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
