import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';

// --- DIALOG MANAGER LOGIC (Integrated) ---

export interface DialogOption {
    id: string;
    text: string;
    nextId?: string;
    action?: () => void;
    condition?: () => boolean;
}

export interface DialogNode {
    id: string;
    speaker: string;
    text: string;
    options: DialogOption[];
}

class DialogManager {
    private static instance: DialogManager;
    private dialogs: Map<string, DialogNode> = new Map();

    private constructor() {
        this.initializeDialogs();
    }

    public static getInstance(): DialogManager {
        if (!DialogManager.instance) {
            DialogManager.instance = new DialogManager();
        }
        return DialogManager.instance;
    }

    private initializeDialogs() {
        // Beispiel-Dialog: Verlorener Sohn (Quest Start)
        this.addDialog({
            id: 'DIALOG_MOTHER_START',
            speaker: 'Besorgte Mutter',
            text: 'Bitte, haben Sie meinen Sohn gesehen? Er wollte nur friedlich demonstrieren, aber jetzt ist alles außer Kontrolle!',
            options: [
                {
                    id: 'opt_1',
                    text: 'Wie sieht er aus?',
                    nextId: 'DIALOG_MOTHER_DESCRIBE'
                },
                {
                    id: 'opt_2',
                    text: 'Ich habe keine Zeit für Zivilisten.',
                    nextId: 'DIALOG_END',
                    action: () => console.log('Reputation gesenkt')
                }
            ]
        });

        this.addDialog({
            id: 'DIALOG_MOTHER_DESCRIBE',
            speaker: 'Besorgte Mutter',
            text: 'Er trägt eine rote Jacke und hat einen Rucksack. Er wollte zum Graben. Bitte helfen Sie ihm!',
            options: [
                {
                    id: 'opt_1',
                    text: 'Ich werde die Augen offen halten. (Quest annehmen)',
                    nextId: 'DIALOG_END',
                    action: () => {
                        useGameStore.getState().setPrompt("QUEST GESTARTET: Der verlorene Sohn");
                        console.log("Quest 'Der verlorene Sohn' akzeptiert");
                    }
                },
                {
                    id: 'opt_2',
                    text: 'Bleiben Sie hier in Sicherheit.',
                    nextId: 'DIALOG_END'
                }
            ]
        });
    }

    public addDialog(node: DialogNode) {
        this.dialogs.set(node.id, node);
    }

    public getDialog(id: string): DialogNode | undefined {
        return this.dialogs.get(id);
    }
}

// --- UI COMPONENT ---

// Globale Funktion um Dialog zu öffnen
export const openDialog = (dialogId: string) => {
    const event = new CustomEvent('open-dialog', { detail: dialogId });
    window.dispatchEvent(event);
};

const DialogUI: React.FC = () => {
    const [currentDialog, setCurrentDialog] = useState<DialogNode | null>(null);

    useEffect(() => {
        const handleOpenDialog = (e: Event) => {
            const customEvent = e as CustomEvent;
            const dialogId = customEvent.detail;
            const dialog = DialogManager.getInstance().getDialog(dialogId);
            if (dialog) {
                setCurrentDialog(dialog);
                document.exitPointerLock();
            }
        };

        window.addEventListener('open-dialog', handleOpenDialog);
        return () => window.removeEventListener('open-dialog', handleOpenDialog);
    }, []);

    const handleOptionClick = (option: DialogOption) => {
        if (option.action) {
            option.action();
        }

        if (option.nextId && option.nextId !== 'DIALOG_END') {
            const nextDialog = DialogManager.getInstance().getDialog(option.nextId);
            if (nextDialog) {
                setCurrentDialog(nextDialog);
            } else {
                closeDialog();
            }
        } else {
            closeDialog();
        }
    };

    const closeDialog = () => {
        setCurrentDialog(null);
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.requestPointerLock();
    };

    if (!currentDialog) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid #4fc3f7',
            borderRadius: '10px',
            padding: '20px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            zIndex: 1000,
            boxShadow: '0 0 20px rgba(79, 195, 247, 0.5)'
        }}>
            <h3 style={{ color: '#4fc3f7', marginTop: 0 }}>{currentDialog.speaker}</h3>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>{currentDialog.text}</p>
            
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentDialog.options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => handleOptionClick(option)}
                        style={{
                            padding: '10px 15px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid #666',
                            color: 'white',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: '5px',
                            fontSize: '1rem',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(79, 195, 247, 0.3)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                    >
                        ➤ {option.text}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DialogUI;
