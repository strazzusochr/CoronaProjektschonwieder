/**
 * SaveLoadUI - Save/Load Interface
 * Phase 21: Save-Load-System
 */
import React, { useState, useEffect } from 'react';
import { saveManager, type SaveData } from '@/managers/SaveManager';
import { useGameStore } from '@/stores/gameStore';

// Lokale Definition um Vite ESM-Problem zu umgehen
interface SaveSlot {
    id: number;
    isEmpty: boolean;
    data: SaveData | null;
    thumbnailBase64?: string;
}

interface SaveLoadUIProps {
    mode: 'SAVE' | 'LOAD';
    onClose: () => void;
}

const SaveLoadUI: React.FC<SaveLoadUIProps> = ({ mode, onClose }) => {
    const [slots, setSlots] = useState<SaveSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        refreshSlots();
    }, []);

    const refreshSlots = () => {
        setSlots(saveManager.getSaveSlots());
    };

    const handleSave = (slotId: number) => {
        const success = saveManager.saveToSlot(slotId);
        if (success) {
            setNotification('✓ Spielstand gespeichert!');
            refreshSlots();
            setTimeout(() => setNotification(null), 2000);
        } else {
            setNotification('✗ Speichern fehlgeschlagen');
        }
    };

    const handleLoad = (slotId: number) => {
        const success = saveManager.loadFromSlot(slotId);
        if (success) {
            setNotification('✓ Spielstand geladen!');
            setTimeout(() => {
                onClose();
            }, 1000);
        } else {
            setNotification('✗ Laden fehlgeschlagen');
        }
    };

    const handleDelete = (slotId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Spielstand wirklich löschen?')) {
            saveManager.deleteSlot(slotId);
            refreshSlots();
            setNotification('Spielstand gelöscht');
            setTimeout(() => setNotification(null), 2000);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                border: '2px solid rgba(100, 150, 255, 0.4)',
                borderRadius: '16px',
                padding: '32px',
                minWidth: '500px',
                maxWidth: '600px',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                }}>
                    <h2 style={{ color: '#7df', margin: 0, fontSize: '1.6rem' }}>
                        {mode === 'SAVE' ? '💾 Speichern' : '📂 Laden'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#888',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Notification */}
                {notification && (
                    <div style={{
                        background: notification.includes('✓') ? 'rgba(0, 200, 100, 0.2)' : 'rgba(255, 100, 100, 0.2)',
                        border: `1px solid ${notification.includes('✓') ? '#0c6' : '#f66'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '16px',
                        color: notification.includes('✓') ? '#8f8' : '#f88',
                        textAlign: 'center',
                    }}>
                        {notification}
                    </div>
                )}

                {/* Save Slots */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {slots.map(slot => (
                        <div
                            key={slot.id}
                            onClick={() => {
                                if (mode === 'SAVE') {
                                    handleSave(slot.id);
                                } else if (!slot.isEmpty) {
                                    handleLoad(slot.id);
                                }
                            }}
                            style={{
                                background: selectedSlot === slot.id
                                    ? 'rgba(100, 150, 255, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${selectedSlot === slot.id ? '#7df' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '10px',
                                padding: '16px',
                                cursor: slot.isEmpty && mode === 'LOAD' ? 'not-allowed' : 'pointer',
                                opacity: slot.isEmpty && mode === 'LOAD' ? 0.5 : 1,
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={() => setSelectedSlot(slot.id)}
                            onMouseLeave={() => setSelectedSlot(null)}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
                                        Slot {slot.id + 1}: {slot.isEmpty ? '(Leer)' : slot.data?.slotName || 'Spielstand'}
                                    </div>
                                    {!slot.isEmpty && slot.data && (
                                        <div style={{ color: '#888', fontSize: '0.85rem' }}>
                                            {formatDate(slot.data.timestamp)} •
                                            Spielzeit: {saveManager.formatPlaytime(slot.data.playtime)} •
                                            HP: {slot.data.gameState.health}%
                                        </div>
                                    )}
                                </div>

                                {/* Delete Button */}
                                {!slot.isEmpty && (
                                    <button
                                        onClick={(e) => handleDelete(slot.id, e)}
                                        style={{
                                            background: 'rgba(255, 100, 100, 0.2)',
                                            border: '1px solid rgba(255, 100, 100, 0.5)',
                                            borderRadius: '6px',
                                            color: '#f88',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                        }}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>
                        Quick-Save: F5 | Quick-Load: F9
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg, #555, #333)',
                            border: 'none',
                            color: '#fff',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                        }}
                    >
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveLoadUI;
