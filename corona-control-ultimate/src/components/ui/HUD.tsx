import { useGameStore } from '@/stores/gameStore';
import { getActiveQuests } from '@/managers/QuestManager';
import { EndingManager } from '@/managers/EndingManager';
import type { QuestObjective } from '@/types/QuestData';

const HUD: React.FC = () => {
    const gameState = useGameStore((state) => state.gameState);
    const missions = useGameStore((state) => state.missions);
    const resetGame = useGameStore((state) => state.resetGame);

    // Quest State
    const activeQuests = getActiveQuests();

    const activeCutscene = useGameStore(state => state.gameState.activeCutscene);
    console.log('HUD: Rendering. Active Cutscene:', activeCutscene, 'Game Over:', gameState.isGameOver, 'Victory:', gameState.isVictory);

    // const activePrompt = useGameStore(state => state.gameState.activePrompt);
    const activePrompt = useGameStore(state => state.gameState.activePrompt);
    const isUsingBinoculars = useGameStore(state => state.player.isUsingBinoculars);

    const currentMission = missions[gameState.currentMissionIndex];

    const formatTime = (time: number) => {
        const hours = Math.floor(time / 60);
        const minutes = Math.floor(time % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    if (activeCutscene) {
        console.log('HUD: Hidden due to active cutscene');
        return null;
    }

    if (gameState.isGameOver) {
        return (
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                backgroundColor: 'rgba(50, 0, 0, 0.9)', color: 'red', fontFamily: 'Courier New', zIndex: 3500
            }}>
                <h1 style={{ fontSize: '5rem', textShadow: '0 0 20px red', margin: 0 }}>MISSION GESCHEITERT</h1>
                <div style={{ fontSize: '8rem', color: '#800000', fontWeight: 'bold' }}>RANK F</div>
                <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>Die Situation ist vollständig eskaliert.</p>
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <div>Punkte: {gameState.points}</div>
                    <div>Spannung: {useGameStore.getState().tensionLevel}%</div>
                </div>
                <button
                    onClick={resetGame}
                    style={{ marginTop: '2rem', padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer', background: 'white', border: 'none', borderRadius: '5px' }}
                >
                    NEUSTART
                </button>
            </div>
        );
    }

    if (gameState.isVictory) {
        const result = EndingManager.calculateEnding();

        let rankColor = 'white';
        if (result.rank === 'S') rankColor = 'gold';
        else if (result.rank === 'A') rankColor = '#4CAF50';
        else if (result.rank === 'B') rankColor = '#8BC34A';

        return (
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                backgroundColor: 'rgba(0, 20, 0, 0.95)', color: 'white', fontFamily: 'Courier New', zIndex: 3500
            }}>
                <h1 style={{ fontSize: '4rem', textShadow: '0 0 20px white', margin: 0, letterSpacing: '5px' }}>MISSION ERFÜLLT</h1>

                <div style={{
                    fontSize: '10rem',
                    color: rankColor,
                    fontWeight: 'bold',
                    textShadow: `0 0 50px ${rankColor}`,
                    lineHeight: 1
                }}>
                    {result.rank}
                </div>

                <div style={{ fontSize: '1.5rem', color: '#aaa', marginBottom: '2rem' }}>RANKING</div>

                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', minWidth: '400px' }}>
                    <p style={{ fontSize: '1.2rem', margin: '0 0 10px 0', borderBottom: '1px solid #555', paddingBottom: '10px' }}>{result.summary}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                        <span>Punkte:</span> <span>{result.score}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                        <span>Spannungs-Level:</span> <span>{result.tensionLevel}%</span>
                    </div>
                </div>

                <button
                    onClick={resetGame}
                    style={{ marginTop: '3rem', padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer', background: rankColor, border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
                >
                    HAUPTMENÜ
                </button>
            </div>
        );
    }

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', color: 'white', fontFamily: 'monospace', zIndex: 100 }}>
            {/* Binoculars Overlay */}
            {isUsingBinoculars && (
                <>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'radial-gradient(circle, transparent 30%, black 70%)',
                        zIndex: 200
                    }} />
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', width: '400px', height: '400px',
                        border: '2px solid rgba(79, 195, 247, 0.5)', borderRadius: '50%',
                        transform: 'translate(-50%, -50%)', zIndex: 201
                    }} />
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', width: '2px', height: '60px',
                        background: '#4fc3f7', transform: 'translate(-50%, -50%)', zIndex: 201
                    }} />
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', height: '2px', width: '60px',
                        background: '#4fc3f7', transform: 'translate(-50%, -50%)', zIndex: 201
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)',
                        color: '#4fc3f7', fontSize: '1.5rem', fontWeight: 'bold', zIndex: 201
                    }}>
                        MARKIERUNGS-MODUS AKTIV
                    </div>
                </>
            )}

            {/* Tutorial Prompts */}
            {activePrompt && (
                <div style={{
                    position: 'absolute',
                    top: '25%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '20px 40px',
                    borderRadius: '8px',
                    border: '2px solid #4fc3f7',
                    fontSize: '1.3rem',
                    textAlign: 'center',
                    boxShadow: '0 0 20px rgba(79, 195, 247, 0.3)'
                }}>
                    <div style={{ color: '#4fc3f7', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>HINWEIS</div>
                    {activePrompt}
                </div>
            )}

            {/* Header / Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '10px' }}>
                <div>
                    <h3>CORONA CONTROL</h3>
                    <div style={{ fontSize: '1.2rem', color: '#aaa' }}>{formatTime(gameState.dayTime)} Uhr</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h3>Punkte: {gameState.points}</h3>
                </div>
            </div>

            {/* Health Bar */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '300px' }}>
                <div style={{ marginBottom: '5px' }}>GESUNDHEIT: {Math.floor(gameState.health)}%</div>
                <div style={{ width: '100%', height: '20px', background: '#333', border: '2px solid white' }}>
                    <div style={{ width: `${Math.max(0, gameState.health)}%`, height: '100%', background: gameState.health < 30 ? 'red' : 'green', transition: 'width 0.2s' }} />
                </div>
            </div>

            {/* Mission Panel */}
            <div style={{ position: 'absolute', top: '100px', right: '20px', width: '300px', background: 'rgba(0,0,0,0.6)', padding: '15px', borderLeft: '4px solid gold' }}>
                <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #555' }}>AKTUELLE MISSION</h4>
                {currentMission ? (
                    <>
                        <div style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{currentMission.description}</div>
                        <div>Fortschritt: {Math.floor(currentMission.currentAmount)} / {currentMission.targetAmount || currentMission.timeLimit}</div>
                        <div style={{ width: '100%', height: '5px', background: '#333', marginTop: '5px' }}>
                            <div style={{ width: `${Math.min(100, (currentMission.currentAmount / (currentMission.targetAmount || currentMission.timeLimit || 1)) * 100)}%`, height: '100%', background: 'gold' }} />
                        </div>
                    </>
                ) : (
                    <div>Keine aktiven Missionen.</div>
                )}
            </div>

            {/* Side-Quest Panel (NEU) */}
            {activeQuests.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '250px',
                    right: '20px',
                    width: '250px',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '10px',
                    borderLeft: '4px solid #4fc3f7'
                }}>
                    <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #555', fontSize: '0.9rem', color: '#4fc3f7' }}>NEBENMISSIONEN</h4>
                    {activeQuests.map(quest => (
                        <div key={quest.id} style={{ marginBottom: '10px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{quest.name}</div>
                            {quest.objectives.filter((o: QuestObjective) => !o.isCompleted).map((obj: QuestObjective) => (
                                <div key={obj.id} style={{ fontSize: '0.75rem', color: '#ccc', marginLeft: '5px' }}>
                                    - {obj.description} {obj.targetCount ? `(${obj.currentCount}/${obj.targetCount})` : ''}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Equipment Display (NEU) */}
            <div style={{
                position: 'absolute',
                bottom: '100px',
                left: '20px',
                display: 'flex',
                gap: '10px',
                background: 'rgba(0,0,0,0.5)',
                padding: '10px',
                borderRadius: '5px'
            }}>
                <div style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
                    <div style={{ fontSize: '1.5rem' }}>🔭</div>
                    <div style={{ fontSize: '0.7rem' }}>FERNGLAS</div>
                    <div style={{ fontSize: '0.6rem', color: '#4fc3f7' }}>B</div>
                </div>
                <div style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
                    <div style={{ fontSize: '1.5rem' }}>📻</div>
                    <div style={{ fontSize: '0.7rem' }}>FUNK</div>
                    <div style={{ fontSize: '0.6rem', color: '#4fc3f7' }}>R</div>
                </div>
                <div style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
                    <div style={{ fontSize: '1.5rem' }}>🌶️</div>
                    <div style={{ fontSize: '0.7rem' }}>SPRAY</div>
                    <div style={{ fontSize: '0.6rem', color: '#4fc3f7' }}>Q</div>
                </div>
            </div>

            {/* Wetter/Standort Info (NEU) */}
            <div style={{
                position: 'absolute',
                top: '70px',
                left: '20px',
                background: 'rgba(0,0,0,0.5)',
                padding: '8px 15px',
                borderRadius: '5px',
                fontSize: '0.8rem'
            }}>
                <div style={{ color: '#aaa' }}>📍 STEPHANSPLATZ, WIEN</div>
                <div style={{ color: '#aaa' }}>🌡️ 8°C | ☁️ BEWÖLKT</div>
            </div>

            {/* Controls Helper */}
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', textAlign: 'right', opacity: 0.7 }}>
                <div>WASD - Bewegen</div>
                <div>SHIFT - Rennen</div>
                <div>SPACE - Springen</div>
                <div>B - Fernglas</div>
                <div>L-CLICK - Molotow werfen</div>
            </div>
        </div>
    );
};

export default HUD;
