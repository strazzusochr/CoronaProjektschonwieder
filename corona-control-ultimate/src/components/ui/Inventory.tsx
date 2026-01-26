import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';

const Inventory: React.FC = () => {
    const inventory = useGameStore(state => state.inventory);
    const equipment = useGameStore(state => state.equipment);
    const isInventoryOpen = useGameStore(state => state.isInventoryOpen);
    const toggleInventory = useGameStore(state => state.toggleInventory);
    const useItem = useGameStore(state => state.useItem);
    const equipItem = useGameStore(state => state.equipItem);
    const unequipItem = useGameStore(state => state.unequipItem);

    // Local state for selected item details
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

    // Keyboard Handler for 'I'
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'i') {
                toggleInventory();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleInventory]);

    if (!isInventoryOpen) return null;

    const selectedItem = selectedSlotIndex !== null ? inventory[selectedSlotIndex]?.item : null;

    const handleSlotClick = (index: number) => {
        setSelectedSlotIndex(index);
    };

    const handleUse = () => {
        if (selectedSlotIndex !== null) {
            useItem(selectedSlotIndex);
        }
    };

    const handleEquip = () => {
        if (selectedSlotIndex !== null) {
            equipItem(selectedSlotIndex);
        }
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3000,
            color: 'white',
            fontFamily: 'monospace'
        }}>
            <div style={{
                width: '900px',
                height: '600px',
                backgroundColor: '#1a1a1a',
                border: '2px solid #444',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                    <h2 style={{ margin: 0 }}>INVENTAR</h2>
                    <button
                        onClick={toggleInventory}
                        style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.5rem', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: 'flex', flex: 1, gap: '20px' }}>
                    {/* Left Column: Equipment */}
                    <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h3 style={{ fontSize: '1rem', color: '#888', borderBottom: '1px solid #333' }}>AUSRÜSTUNG</h3>

                        {Object.entries(equipment).map(([slot, item]) => (
                            <div key={slot} style={{
                                padding: '10px',
                                background: '#2a2a2a',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                minHeight: '60px'
                            }}>
                                <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '5px' }}>{slot}</div>
                                {item ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ fontSize: '1.5rem' }}>{item.icon || '📦'}</div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem' }}>{item.name}</div>
                                            <button
                                                onClick={() => unequipItem(slot as any)}
                                                style={{ fontSize: '0.7rem', background: '#444', border: 'none', color: 'white', cursor: 'pointer', marginTop: '2px' }}
                                            >
                                                Ablegen
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: '#444', fontStyle: 'italic', fontSize: '0.8rem' }}>Leer</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Middle Column: Inventory Grid */}
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1rem', color: '#888', borderBottom: '1px solid #333' }}>TASCHE</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                            gap: '8px',
                            maxHeight: '450px',
                            overflowY: 'auto',
                            paddingRight: '5px'
                        }}>
                            {inventory.map((slot) => (
                                <div
                                    key={slot.index}
                                    onClick={() => handleSlotClick(slot.index)}
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        backgroundColor: selectedSlotIndex === slot.index ? '#3a3a3a' : '#222',
                                        border: selectedSlotIndex === slot.index ? '2px solid #4fc3f7' : '1px solid #333',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    {slot.item && (
                                        <>
                                            <div style={{ fontSize: '1.5rem' }}>{slot.item.icon || '📦'}</div>
                                            {slot.item.quantity > 1 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '2px',
                                                    right: '4px',
                                                    fontSize: '0.7rem',
                                                    color: '#aaa'
                                                }}>
                                                    x{slot.item.quantity}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div style={{ width: '250px', background: '#222', padding: '15px', borderRadius: '4px' }}>
                        <h3 style={{ fontSize: '1rem', color: '#888', borderBottom: '1px solid #333' }}>DETAILS</h3>
                        {selectedItem ? (
                            <div>
                                <div style={{ fontSize: '3rem', textAlign: 'center', margin: '10px 0' }}>{selectedItem.icon || '📦'}</div>
                                <h4 style={{ margin: '0 0 10px 0', color: '#4fc3f7' }}>{selectedItem.name}</h4>
                                <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4' }}>{selectedItem.description}</p>

                                {selectedItem.stats && (
                                    <div style={{ marginTop: '15px', fontSize: '0.85rem' }}>
                                        {selectedItem.stats.damage && <div>Schaden: {selectedItem.stats.damage}</div>}
                                        {selectedItem.stats.defense && <div>Verteidigung: {selectedItem.stats.defense}</div>}
                                    </div>
                                )}

                                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                    {selectedItem.equippableSlot ? (
                                        <button
                                            onClick={handleEquip}
                                            style={{ padding: '8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Ausrüsten
                                        </button>
                                    ) : selectedItem.effect ? (
                                        <button
                                            onClick={handleUse}
                                            style={{ padding: '8px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Benutzen
                                        </button>
                                    ) : null}

                                    <button style={{ padding: '8px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: 0.5 }}>
                                        Wegwerfen
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#666', fontStyle: 'italic', marginTop: '20px', textAlign: 'center' }}>
                                Wähle ein Item aus.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Inventory;
