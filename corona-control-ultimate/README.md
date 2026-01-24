# Corona Control Ultimate 🛡️🦠

**Version:** 1.0.0 (Release)
**Engine:** React 19 + Three.js (R3F) + Rapier Physics

## 🚔 Projektübersicht
"Corona Control Ultimate" ist eine High-Fidelity Polizei-Simulation, entwickelt nach den Spezifikationen des **MASTER START PROMPT**. Sie übernehmen die Kontrolle über eine WEGA-Spezialeinheit, um Ordnung in einer chaotischen, dystopischen Umgebung wiederherzustellen.

## ✨ Features
*   **Advanced AI**: 
    *   **Rioter**: Aggressives Verhalten, Fluchtmechaniken, Angriffe auf den Spieler.
    *   **Police**: Formationsverhalten, Unterstützung bei Verhaftungen.
    *   **Civilian**: Dynamische Reaktionen auf Chaos (Panik, Flucht).
*   **Physik-basiertes Gameplay**: Rapier Physics Engine für realistische Kollisionen und Projektil-Flugbahnen.
*   **Inventar-System**:
    *   40-Slot Grid (Taste `I`).
    *   Loot-System (Items in der Welt aufheben).
    *   Nutzbare Items (Medkits, Steine).
*   **Persistenz**: Speichern und Laden des Spielstands (LocalStorage).
*   **Mission System**: Dynamische Ziele (z.B. "Zerstreue Randalierer", "Überlebe").
*   **High-End Visuals**:
    *   Dynamische Beleuchtung (Punktlichter, Umgebungslicht).
    *   Partikeleffekte für Treffer und Explosionen.
    *   Tag/Nacht-Zyklus (Atmosphärische Abendstimmung).
*   **Dev Tools**: Integrierte Debug-Konsole und Einstellungsmenü.

## 🎮 Steuerung

| Taste | Aktion |
| :--- | :--- |
| **W, A, S, D** | Bewegung |
| **Maus** | Umsehen (Kamera) |
| **Shift** | Rennen |
| **Space** | Springen |
| **Linksklick** | Werfen / Interagieren (UI) |
| **E** | Item aufheben |
| **I** | Inventar öffnen/schließen |
| **ESC** | Einstellungen / Pause |
| **~** (Tilde) | Debug Konsole |

## 🚀 Installation & Start

1.  **Voraussetzungen**: Node.js v16+ (Empfohlen: v18+).
2.  **Dependencies installieren**:
    ```bash
    npm install
    ```
3.  **Development Server starten**:
    ```bash
    npm run dev
    ```
    Das Spiel ist unter `http://localhost:5173/` erreichbar.

4.  **Production Build**:
    ```bash
    npm run build
    npm run preview
    ```

## 🛠️ Debugging & Cheats
Öffnen Sie die Konsole mit `~` (oder `^`).
*   `help`: Zeigt alle Befehle.
*   `spawn <item_id>`: Spawnt ein Item (z.B. `spawn medkit`).
*   `give <item_id> [job]`: Gibt Items ins Inventar.
*   `heal [amount]`: Heilt den Spieler.

## 📁 Projektstruktur
*   `src/components/`: React-Komponenten (Player, NPC, UI).
*   `src/components/ui/`: HUD, Inventar, Menüs.
*   `src/stores/`: Zustandsspeicher (Zustand: GameStore, PlayerStore).
*   `src/managers/`: Spiel-Logik Loop (GameLoop, Projectiles, Crowd).
*   `src/systems/`: KI-Verhalten und Physik-Logik.

---
*Entwickelt von Antigravity Agent (Gemini 2.0)*
