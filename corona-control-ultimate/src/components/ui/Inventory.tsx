import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import type { Item } from '@/stores/gameStore';

const INVENTORY_COLS = 10;

const Inventory: React.FC = () => {
    const inventory = useGameStore(state => state.inventory);
    const isInventoryOpen = useGameStore(state => state.isInventoryOpen);
    const toggleInventory = useGameStore(state => state.toggleInventory);
    const useItem = useGameStore(state => state.useItem);

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

    const handleSlotClick = (index: number) => {
        // Implement Use Item logic logic
         useItem(index);
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000 // Above HUD
        }}>
            <div style={{
                width: '800px',
                backgroundColor: '#1C1C24',
                border: '2px solid #333',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                fontFamily: 'Courier New, monospace',
                color: 'white'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2>INVENTAR</h2>
                    <button onClick={toggleInventory} style={{ background: 'none', border: 'none', color: 'red', fontSize: '1.5rem', cursor: 'pointer' }}>X</button>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${INVENTORY_COLS}, 1fr)`,
                    gap: '10px'
                }}>
                    {inventory.map((slot) => (
                        <InventorySlot key={slot.index} item={slot.item} onClick={() => handleSlotClick(slot.index)} />
                    ))}
                </div>

                <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Klicke auf ein Item, um es zu benutzen.</span>
                    <div style={{ gap: '10px', display: 'flex' }}>
                         <button 
                            onClick={useGameStore.getState().saveGame}
                            style={{ padding: '5px 10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                         >
                             SPEICHERN
                         </button>
                         <button 
                            onClick={() => {
                                if(useGameStore.getState().loadGame()) {
                                    alert('Spiel geladen!');
                                } else {
                                    alert('Kein Spielstand gefunden!');
                                }
                            }}
                            style={{ padding: '5px 10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                         >
                             LADEN
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InventorySlot: React.FC<{ item: Item | null, onClick: () => void }> = ({ item, onClick }) => {
    return (
        <div 
            onClick={onClick}
            style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#2A2A35',
                border: '1px solid #444',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                cursor: item ? 'pointer' : 'default',
                transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3A3A45'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2A2A35'}
        >
            {item && (
                <>
                    <div style={{ fontSize: '1.5rem' }}>
                        {/* Placeholder Icon logic */}
                        {item.type === 'CONSUMABLE' ? '💊' : item.type === 'WEAPON' ? '🔫' : '📦'}
                    </div>
                    {item.quantity > 1 && (
                        <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            color: '#DDD'
                        }}>
                            {item.quantity}
                        </div>
                    )}
                     {/* Tooltip on Hover could be added here */}
                </>
            )}
        </div>
    );
};

export default Inventory;
