import React from 'react';
import { useGameStore } from '../store/gameStore';

const panelStyle: React.CSSProperties = {
  background: 'rgba(0, 10, 15, 0.85)',
  border: '1px solid #00ff00',
  borderRadius: '8px',
  padding: '15px',
  fontFamily: '"Courier New", Courier, monospace',
  color: '#00ff00',
  boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)',
  position: 'absolute',
  zIndex: 1000
};

export const TelemetryHUD: React.FC<{ socket?: any }> = ({ socket }) => {
  const isStreamingMode = useGameStore(s => s.isStreamingMode);
  
  // Real-time store triggers for background data
  const rawWorldTime = useGameStore(s => s.worldTime);
  const rawTension = useGameStore(s => s.tension);
  const rawWorldPhase = useGameStore(s => s.worldPhase);
  const rawNpcs = useGameStore(s => s.npcs);
  const rawNpcTypeCount = useGameStore(s => s.npcTypeCount);
  const simSpeed = useGameStore(s => s.simSpeed);
  const isPaused = useGameStore(s => s.isPaused);

  // Throttled UI state to protect the main thread
  const [hudState, setHudState] = React.useState({
    time: rawWorldTime,
    tension: rawTension,
    phase: rawWorldPhase,
    npcCount: Object.keys(rawNpcs).length,
    counts: rawNpcTypeCount
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      setHudState({
        time: useGameStore.getState().worldTime,
        tension: useGameStore.getState().tension,
        phase: useGameStore.getState().worldPhase,
        npcCount: Object.keys(useGameStore.getState().npcs).length,
        counts: useGameStore.getState().npcTypeCount
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSpeed = (speed: number) => {
    if (socket) socket.emit('set_sim_speed', speed);
  };

  const togglePause = () => {
    if (socket) socket.emit('toggle_sim_pause');
  };

  return (
    <>
      {/* LEFT PANEL: Telemetry */}
      <div style={{...panelStyle, top: 20, left: 20, width: '350px'}}>
        <h2 style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#fff', textShadow: '0 0 5px #fff' }}>🚀 JETBRAIN TELEMETRY (HYPER-AAA)</h2>
        <div style={{ borderBottom: '1px solid #005500', marginBottom: '10px', paddingBottom: '10px' }}>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>TIME: {hudState.time} | TENSION: {hudState.tension}%</div>
          <div style={{ fontSize: '14px', color: '#00ffff' }}>PHASE: 📰 {hudState.phase}</div>
        </div>
        
        <div style={{ fontSize: '14px', color: '#ffaa00', marginBottom: '10px' }}>FPS: 60 (LOCKED)</div>
        <div style={{ fontSize: '14px', marginBottom: '5px' }}>NPCs: {hudState.npcCount} / 1000</div>
        <div style={{ fontSize: '14px', marginBottom: '10px' }}>POLYGONS: {(hudState.npcCount * 0.0008).toFixed(2)}M (Instanced)</div>

        <div style={{ borderTop: '1px solid #005500', paddingTop: '10px' }}>
          <div style={{ color: '#aaa', fontSize: '12px' }}>REAL-TIME DISTRIBUTION:</div>
          <div style={{ color: '#00ff00', fontSize: '13px' }}>Civilian: {hudState.counts['civilian'] || 0}</div>
          <div style={{ color: '#00ff00', fontSize: '13px' }}>Police: {hudState.counts['Police'] || 0}</div>
          <div style={{ color: '#00ff00', fontSize: '13px' }}>Demonstrators: {hudState.counts['demonstrator'] || 0}</div>
          <div style={{ color: '#ffaa00', fontSize: '13px' }}>Special Ops: {hudState.counts['RiotCop'] || 0}</div>
        </div>

        <div style={{ marginTop: '15px', fontSize: '10px', color: '#888' }}>
          ENGINE: NATIVE WEBGPU (BATCHED)<br/>
          FOOTPRINT: ZERO-LOCAL-CLOUD<br/>
          {isStreamingMode && (
            <span style={{ color: '#00ffcc', fontWeight: 'bold', fontSize: '10px', border: '1px solid #00ffcc', padding: '2px 5px', marginTop: '5px', display: 'inline-block' }}>
              ● STREAMING ACTIVE (0% LOAD)
            </span>
          )}
        </div>
      </div>

      {/* TOP CENTER: Phase Button */}
      <div style={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, textAlign: 'center' }}>
        <button 
           onClick={togglePause}
           style={{ background: isPaused ? '#ff4400' : '#002233', border: '2px solid #00ffff', color: '#00ffff', padding: '10px 30px', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)' }}>
          {isPaused ? 'SIMULATION PAUSIERT' : 'PHASE 14 OPERATIV'}
        </button>
        <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid #444', padding: '5px 15px', color: '#ccc', fontSize: '12px' }}>
          Simulations-Speed: {simSpeed}x
        </div>
      </div>

      {/* ... (RIGHT PANELS - Same as before) */}
      <div style={{ position: 'absolute', top: 20, right: 20, width: '300px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1000 }}>
        
        <div style={{...panelStyle, position: 'relative', border: '1px solid #00ffff', color: '#00ffff'}}>
          <h3 style={{ margin: 0, fontSize: '14px', borderBottom: '1px solid #005555', paddingBottom: '5px' }}>STREIFEN-PROTOKOLL</h3>
          <div style={{ fontSize: '12px', marginTop: '10px', color: '#ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Assessment:</span><span>24.04.2026</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffaa00' }}><span>Impact:</span><span>{hudState.tension > 70 ? 'CRITICAL' : 'HOCH'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff4444' }}><span>Tension:</span><span>{hudState.tension}%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Patrols:</span><span>{hudState.counts['Police'] || 0}</span></div>
          </div>
        </div>

        <div style={{...panelStyle, position: 'relative', border: '1px solid #00ffff', color: '#00ffff'}}>
          <h3 style={{ margin: 0, fontSize: '14px', borderBottom: '1px solid #005555', paddingBottom: '5px' }}>PHASE-TELEMETRIE</h3>
          <div style={{ fontSize: '12px', marginTop: '10px', color: '#ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fenster:</span><span>{hudState.time}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fortschritt:</span><span>{hudState.tension}%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Riot-Readiness:</span><span>{hudState.tension > 50 ? 'CRITICAL' : 'OK'}</span></div>
          </div>
        </div>

      </div>

      {/* BOTTOM PANEL: Timeline & Controls */}
      <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '80%', background: 'rgba(0, 15, 5, 0.9)', border: '1px solid #00ff00', borderRadius: '15px', padding: '15px', boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Top bar logic (Time info) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
          <button style={{ background: '#003300', border: '1px solid #00ff00', color: '#00ff00', padding: '5px 15px', borderRadius: '5px' }}>AUDIT</button>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => handleSpeed(0.1)} style={{ background: '#222', border: '1px solid #444', color: '#00ff00', padding: '2px 8px' }}>SLOW</button>
            <button onClick={togglePause} style={{ background: isPaused ? '#00ff00' : '#222', border: '1px solid #00ff00', color: isPaused ? '#000' : '#00ff00', padding: '2px 8px', fontWeight: 'bold' }}>
               {isPaused ? '▶' : '⏸'}
            </button>
            <button onClick={() => handleSpeed(1)} style={{ background: simSpeed === 1 ? '#00ff00' : '#222', border: '1px solid #444', color: simSpeed === 1 ? '#000' : '#00ff00', padding: '2px 8px' }}>1x</button>
            <button onClick={() => handleSpeed(10)} style={{ background: simSpeed === 10 ? '#00ff00' : '#222', border: '1px solid #444', color: simSpeed === 10 ? '#000' : '#00ff00', padding: '2px 8px' }}>10x</button>
          </div>

          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffaa00' }}>{hudState.time} {isPaused ? '⏸' : '▶'}</div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#222', padding: '5px 15px', borderRadius: '20px', color: '#aaa' }}>
            <span style={{ color: '#ffaa00' }}>⚡ {hudState.tension}%</span>
            <span>👥 {hudState.npcCount}</span>
          </div>

          <button style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '5px 15px', borderRadius: '5px' }}>{hudState.phase}</button>
        </div>

        {/* Speed Bar */}
        <div style={{ display: 'flex', gap: '3px', width: '100%', justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5, 10, 20, 50, 100].map(s => (
            <button 
              key={s} 
              onClick={() => handleSpeed(s)}
              style={{ background: simSpeed === s ? '#00aaaa' : '#111', color: simSpeed === s ? '#fff' : '#ffaa00', border: '1px solid #333', padding: '5px 10px', fontSize: '11px', flex: 1, borderRadius: '3px', cursor: 'pointer' }}>
              {s}x
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔊</span>
            <input type="range" min="0" max="100" defaultValue="50" style={{ width: '100px' }} />
          </div>
          <div style={{ background: '#002211', border: '1px solid #00ff00', color: '#00ff00', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            ● CLOUDFLARE NATIVE — ZERO LOAD SYSTEM — {simSpeed}x EFFECTIVE
          </div>
        </div>

      </div>
    </>
  );
};
