# Codebasis-Review: gefundene Probleme und konkrete Aufgaben

## 1) Aufgabe: Tippfehler/Benennungsfehler korrigieren
**Problem:** Die Komponente `StephansdomPlaceholder` ist in der Benennung nicht eindeutig, ob der Wiener Dom (`Stephansdom`) oder die im Deutschen häufige Form `Stefansdom` gemeint ist. Im Kontext sollte die Bezeichnung konsistent und sprachlich sauber sein (z. B. `StStephansCathedralPlaceholder` oder `StephansdomMeshPlaceholder`).

**Vorgeschlagene Aufgabe:**
- Komponente und ggf. Referenzen auf einen klaren, konsistenten Namen umbenennen.
- Kurz im README festhalten, welche Namenskonvention für 3D-Objekte gilt (Deutsch oder Englisch, aber einheitlich).

**Akzeptanzkriterien:**
- Keine alten Bezeichner mehr im Projekt.
- Build läuft weiterhin.

---

## 2) Aufgabe: Programmierfehler korrigieren (Build bricht ab)
**Problem:** Das Projekt kann aktuell nicht gebaut werden, weil der Vite-Einstiegspunkt `index.html` fehlt. `npm run build` endet mit: `Could not resolve entry module "index.html"`.

**Vorgeschlagene Aufgabe:**
- `index.html` im Projektroot anlegen (Vite-Standardstruktur).
- Sicherstellen, dass ein passender Einstieg (`src/main.tsx`) existiert und `App` rendert.
- Danach `npm run build` als Pflichtcheck.

**Akzeptanzkriterien:**
- `npm run build` läuft ohne Fehler durch.
- Das Bundle wird erzeugt.

---

## 3) Aufgabe: Dokumentations-Unstimmigkeit korrigieren
**Problem:** Die README ist aktuell zu knapp und deckt die tatsächlich verfügbaren npm-Skripte (`dev`, `build`, `preview`) nicht ab.

**Vorgeschlagene Aufgabe:**
- README um die Bereiche „Setup“, „Entwicklung“, „Build“, „Preview“ erweitern.
- Node-/npm-Versionen oder Mindestvoraussetzungen ergänzen.
- Kurz beschreiben, was in der 3D-Szene enthalten ist (Sky, Stars, Environment, OrbitControls).

**Akzeptanzkriterien:**
- README enthält reproduzierbare Startanleitung.
- Dokumentation entspricht den Scripts in `package.json`.

---

## 4) Aufgabe: Tests verbessern
**Problem:** Es gibt derzeit keine automatisierten Tests für Rendering/Struktur (weder Unit- noch Component-Tests).

**Vorgeschlagene Aufgabe:**
- Test-Setup mit Vitest + React Testing Library ergänzen.
- Mindestens folgende Tests hinzufügen:
  1. `App` rendert den Canvas-Container.
  2. Szene enthält die Placeholder-Komponente.
  3. Smoke-Test für App-Render ohne Exception.
- Optional: einfacher CI-Check (`npm test`) im Workflow.

**Akzeptanzkriterien:**
- Testkommando ist in `package.json` definiert.
- Tests laufen lokal grün.
