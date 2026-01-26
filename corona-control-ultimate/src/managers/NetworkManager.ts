import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/stores/gameStore';
// Circular dependency management: import type or use late binding
// We'll use a dynamic import or window reference to avoid issues in this simpler setup
// or just a callback. Let's use late binding.

const SERVER_URL = 'http://localhost:3005';

interface RemotePlayer {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    health: number;
}

class NetworkManager {
    private static instance: NetworkManager;
    private socket: Socket | null = null;
    public remotePlayers: Map<string, RemotePlayer> = new Map();
    public isConnected: boolean = false;
    private updateInterval: number | null = null;

    private constructor() { }

    public static getInstance(): NetworkManager {
        if (!this.instance) {
            this.instance = new NetworkManager();
        }
        return this.instance;
    }

    public connect() {
        if (this.socket) return;

        console.log(`[Network] Connecting to ${SERVER_URL}...`);
        this.socket = io(SERVER_URL);

        this.socket.on('connect', () => {
            console.log('[Network] Connected!');
            this.isConnected = true;
            useGameStore.getState().setPrompt('🌐 Online: Verbunden');
            setTimeout(() => useGameStore.getState().setPrompt(null), 3000);

            this.startSync();
        });

        this.socket.on('disconnect', () => {
            console.log('[Network] Disconnected');
            this.isConnected = false;
            this.remotePlayers.clear();
            useGameStore.getState().setPrompt('❌ Offline: Getrennt');
        });

        this.socket.on('gameState', (data: any) => {
            // Initial state load
            data.players.forEach((p: any) => {
                if (p.id !== this.socket?.id) {
                    this.remotePlayers.set(p.id, p);
                }
            });
        });

        this.socket.on('playerJoined', (data: { id: string }) => {
            console.log(`[Network] Player joined: ${data.id}`);
            useGameStore.getState().setPrompt(`👋 Spieler beigetreten`);
            this.remotePlayers.set(data.id, {
                id: data.id,
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                health: 100
            });
        });

        this.socket.on('playerLeft', (data: { id: string }) => {
            console.log(`[Network] Player left: ${data.id}`);
            this.remotePlayers.delete(data.id);
        });

        this.socket.on('playerMoved', (data: any) => {
            if (this.remotePlayers.has(data.id)) {
                const p = this.remotePlayers.get(data.id)!;
                p.position = data.pos;
                p.rotation = data.rot;
            }
        });

        this.socket.on('correction', (data: { pos: [number, number, number] }) => {
            console.warn('[Network] Position correction received (Rubberbanding)');
            // Update store directly to snap player back
            useGameStore.setState(state => ({
                player: { ...state.player, position: data.pos }
            }));
        });

        this.socket.on('kick', (data: { reason: string }) => {
            console.error(`[Network] Kicked from server: ${data.reason}`);
            useGameStore.getState().setPrompt(`🚫 Verbindung getrennt: ${data.reason}`);
            this.disconnect();
        });

        this.socket.on('cloudData', (data: any) => {
            if (data) {
                console.log('[Network] Cloud data received.');
                import('./SaveManager').then(m => m.saveManager.applyCloudData(data));
            } else {
                console.log('[Network] No cloud data found.');
            }
        });
    }

    private startSync() {
        if (this.updateInterval) clearInterval(this.updateInterval);

        // Send updates 10 times per second
        this.updateInterval = window.setInterval(() => {
            if (!this.socket || !this.isConnected) return;

            const state = useGameStore.getState();
            if (state.gameState.menuState !== 'PLAYING') return;

            const pos = state.player.position;
            // Simplified: we send rotation as 0,0,0 for now as player rotation is not in store fully
            // In a real implementation we would grab camera rotation

            this.socket.emit('updatePosition', {
                pos: pos,
                rot: [0, 0, 0]
            });
        }, 100);
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Phase 25: Cloud-Saves
    public cloudSave(saveData: any) {
        if (!this.socket || !this.isConnected) return;
        console.log('[Network] Uploading Cloud Save...');
        this.socket.emit('cloudSave', saveData);
    }

    public requestCloudData() {
        if (!this.socket || !this.isConnected) return;
        console.log('[Network] Requesting Cloud Data...');
        this.socket.emit('getCloudSave');
    }
}

export const networkManager = NetworkManager.getInstance();
(window as any).networkManager = networkManager;
