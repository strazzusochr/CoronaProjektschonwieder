import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import CombatSystem from '@/systems/CombatSystem';

const DebugConsole: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [logs, setLogs] = useState<string[]>(['Debug-Konsole bereit. Tippe "hilfe" für Befehle.']);

    // Commands references
    const spawnItem = useGameStore(state => state.spawnItem);
    const addItem = useGameStore(state => state.addItem);
    const setHealth = useGameStore(state => state.setHealth);
    const toggleDebug = useGameStore(state => state.toggleDebug);
    const playerPos = useGameStore(state => state.player.position);

    const log = (msg: string) => setLogs(prev => [...prev, `> ${msg}`].slice(-20));

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '~' || e.key === '^') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleCommand = (cmd: string) => {
        const parts = cmd.trim().split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        try {
            switch (command) {
                case 'help':
                case 'hilfe':
                    log('Verfügbar: hilfe, clear, spawn <item>, give <item>, heil, debug <fps|physics>, molotov');
                    break;
                case 'debug':
                    if (args.length < 1) { log('Nutzung: debug <fps|physics>'); break; }
                    // eslint-disable-next-line no-case-declarations
                    const mode = args[0].toUpperCase();
                    if (mode === 'FPS' || mode === 'PHYSICS') {
                        toggleDebug(mode);
                        log(`${mode} Debug umgeschaltet`);
                    } else {
                        log('Unbekannter Debug-Modus');
                    }
                    break;
                case 'clear':
                    setLogs([]);
                    break;
                case 'spawn':
                    if (args.length < 1) { log('Nutzung: spawn <item_id>'); break; }
                    // Spawn 2 meters in front of player (approx)
                    spawnItem(args[0], [playerPos[0] + 2, playerPos[1] + 1, playerPos[2]]);
                    log(`Gespawnt: ${args[0]}`);
                    break;
                case 'give':
                case 'gib':
                    if (args.length < 1) { log('Nutzung: gib <item_id> [anzahl]'); break; }
                    // eslint-disable-next-line no-case-declarations
                    const qty = args[1] ? parseInt(args[1]) : 1;
                    // eslint-disable-next-line no-case-declarations
                    const success = addItem({
                        id: args[0], name: args[0], type: 'CONSUMABLE',
                        description: 'Debug Item', maxStack: 64, quantity: qty
                    });
                    log(success ? `${qty}x ${args[0]} hinzugefügt` : 'Inventar voll');
                    break;
                case 'heal':
                case 'heil':
                    // eslint-disable-next-line no-case-declarations
                    const hp = args[0] ? parseInt(args[0]) : 100;
                    setHealth(hp);
                    log(`Gesundheit auf ${hp} gesetzt`);
                    break;
                case 'molotov':
                    // Spawn molotov projectile from player's position, slightly in front and up
                    CombatSystem.spawnProjectile('MOLOTOV', [playerPos[0], playerPos[1] + 1, playerPos[2]], [0, 5, -5], 'PLAYER');
                    log('Molotow gespawnt');
                    break;
                default:
                    log(`Unbekannter Befehl: ${command}`);
            }
        } catch (e) {
            log(`Error: ${e}`);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        log(input);
        handleCommand(input);
        setInput('');
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '300px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            borderBottom: '2px solid #00FF00',
            zIndex: 4000,
            fontFamily: 'monospace', color: '#00FF00',
            display: 'flex', flexDirection: 'column',
            padding: '10px'
        }}>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
                <span style={{ marginRight: '5px' }}>$</span>
                <input
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={{
                        flex: 1, background: 'transparent',
                        border: 'none', color: '#00FF00', outline: 'none',
                        fontFamily: 'monospace'
                    }}
                />
            </form>
        </div>
    );
};

export default DebugConsole;
