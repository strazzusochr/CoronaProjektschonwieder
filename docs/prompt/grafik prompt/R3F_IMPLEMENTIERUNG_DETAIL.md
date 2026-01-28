# KONKRETE R3F IMPLEMENTIERUNG - ERSETZE DIE PRIMITIVEN

## SOFORT-CODE-BEISPIELE

Hier sind konkrete Code-Strukturen die du verwenden musst statt der primitiven Zylinder.

---

# TEIL 1: DETAILLIERTER NPC

## 1.1 Human Character Komponente Struktur

Die Komponente muss folgende Struktur haben (in Worten beschrieben):

Erstelle eine React Functional Component namens HumanCharacter.

Die Component akzeptiert Props:
- position: Array mit drei Zahlen für X Y Z
- rotation: Array mit drei Zahlen für Rotation
- scale: Zahl für Gesamtgröße
- characterType: String, entweder "demonstrator" oder "police" oder "civilian"
- clothingColor: String für Hauptfarbe der Kleidung
- skinTone: String für Hauttonwahl
- hasSign: Boolean ob die Person ein Demo-Schild trägt
- signText: String für Text auf dem Schild

Innerhalb der Component:

Verwende useRef für die Haupt-Gruppe um später Animation zu ermöglichen.

Return eine group-Komponente die alles enthält.

Innerhalb der group, erstelle weitere group-Komponenten für:
- headGroup
- torsoGroup
- leftArmGroup
- rightArmGroup
- leftLegGroup
- rightLegGroup
- clothingGroup
- accessoriesGroup

Jede Körperteil-Gruppe enthält die entsprechenden Meshes.

## 1.2 Kopf-Aufbau

Der Kopf ist KEINE einfache Kugel. Erstelle ihn so:

Haupt-Schädel:
- Verwende eine SphereGeometry
- Aber modifiziere sie: Segmente 32 horizontal, 24 vertikal
- WICHTIG: Nach Erstellung, skaliere in Y-Richtung um Faktor 1.15 (Kopf ist höher als breit)
- Skaliere in Z-Richtung um Faktor 0.9 (Kopf ist von der Seite flacher)
- Position relativ zur Gruppe: Y ist Augenhöhe

Kiefer:
- Erstelle eine separate Box oder modifizierte Sphere
- Position: Unterhalb des Hauptschädels
- Skalierung: Breiter als hoch

Nase:
- Erstelle aus mehreren Teilen:
- Nasenrücken: Schmaler vertikaler Quader, leicht nach vorne geneigt
- Nasenspitze: Kleine Kugel am unteren Ende
- Nasenflügel: Zwei winzige Kugeln links und rechts
- Position: Zentrum des Gesichts, nach vorne versetzt

Augen:
- Für jedes Auge erstelle:
- Augenhöhle: Leichte Einbuchtung (dunkleres Material)
- Augapfel: Weiße Kugel
- Iris: Farbige Scheibe vor dem Augapfel
- Pupille: Schwarze Scheibe vor der Iris
- Position: Links und rechts von der Nase, leicht nach innen versetzt

Ohren:
- Erstelle aus Torus-Segmenten oder abgeflachten Ellipsoiden
- Position: Seitlich am Kopf, auf Augenhöhe
- Rotation: Leicht nach hinten geneigt

Mund:
- Erstelle eine horizontale Linie/Furche
- Oberlippe: Leicht gewölbter Quader
- Unterlippe: Dickerer gewölbter Quader

Haare (Optional, aber wichtig für Realismus):
- Methode 1: Haube aus Mesh über dem Schädel
- Methode 2: Viele kleine Planes mit Hair-Textur
- Methode 3: Einfache Form die Frisur andeutet

## 1.3 Torso-Aufbau

Der Torso ist KEIN einfacher Zylinder. Erstelle ihn so:

Hauptkörper:
- Verwende KEINE CylinderGeometry direkt
- Stattdessen: Erstelle eine Custom BufferGeometry ODER verwende eine modifizierte LatheGeometry

Für LatheGeometry:
- Definiere ein Profil (Array von Vector2 Punkten)
- Das Profil beschreibt die Silhouette von der Seite:
  - Starte bei Hals (schmal)
  - Weite zu Schultern (breit)
  - Kurve zum Brustbereich
  - Schmaler bei Taille
  - Leicht breiter bei Hüfte
- LatheGeometry dreht dieses Profil um Y-Achse
- Segmente: 32 für smooth

Alternative: Mehrere Primitive kombinieren
- Oberkörper: Abgeflachte Sphere (Brustkorb)
- Bauch: Zylinder (aber mit Verjüngung)
- Schultern: Zwei halbe Kugeln links und rechts

Schultern:
- Erstelle zwei separate Sphere-Geometrien
- Position: Links und rechts oben am Torso
- Skalierung: In X-Richtung gestreckt

## 1.4 Arme

Jeder Arm besteht aus:

Oberarm:
- Modifizierter Zylinder (dicker oben, dünner unten)
- Oder: CapsuleGeometry für weichere Enden
- Rotation: Nach unten hängend oder in Pose

Ellbogen:
- Kleine Kugel als Übergang
- Oder: Teil des Unter/Oberarms

Unterarm:
- Ähnlich wie Oberarm aber kürzer und dünner

Handgelenk:
- Sehr kleine Kugel oder Teil der Hand

Hand:
- Erstelle als separate Komponente
- Siehe Hand-Detail unten

## 1.5 Hand-Detail

Eine Hand hat:

Handfläche:
- Abgeflachter Quader
- Leicht gebogen (nicht komplett flach)
- Breite etwa 0.08 Einheiten
- Länge etwa 0.1 Einheiten
- Dicke etwa 0.025 Einheiten

Finger (4 Finger, nicht Daumen):
- Jeder Finger: 3 Segmente
- Segment 1 (Grundglied): Zylinder, Durchmesser 0.015
- Segment 2 (Mittelglied): Etwas dünner, 0.013
- Segment 3 (Endglied): Am dünnsten, 0.011
- Zwischen Segmenten: Kleine Kugeln als Gelenke

Daumen:
- Nur 2 Segmente
- Andere Ausrichtung (90 Grad zur Seite)
- Dickere Segmente als andere Finger

## 1.6 Beine

Jedes Bein besteht aus:

Oberschenkel:
- Dicker modifizierter Zylinder
- Oben (bei Hüfte) am dicksten
- Verjüngt sich zum Knie
- Länge etwa gleich Torso-Höhe

Knie:
- Kleine Kugel oder Teil des Ober/Unterschenkels
- Kniescheibe als kleine Erhebung vorne

Unterschenkel (Wade):
- Dünner als Oberschenkel
- Dickste Stelle oben-hinten (Wadenmuskel)
- Verjüngt sich zum Knöchel

Knöchel:
- Kleine Kugeln links und rechts

Fuß:
- Siehe Fuß-Detail

## 1.7 Fuß-Detail

Hauptteil:
- Abgeflachter Quader
- Aber mit Wölbung (nicht flach auf dem Boden)
- Ferse rund
- Vorderseite breiter

Zehen (vereinfacht):
- 5 kleine zylindrische Segmente vorne
- Oder ein gemeinsamer Zehenblock

Schuh (falls angezogen):
- Umhüllt den Fuß
- Sohle als separate Geometrie
- Schnürung als Textur oder Relief

---

# TEIL 2: KLEIDUNG

## 2.1 T-Shirt/Oberteil

Erstelle als leicht größere Version des Torso:
- Nimm die Torso-Geometrie
- Skaliere um Faktor 1.02-1.05 (Stoff hat Dicke)
- Subtrahiere (oder verdecke) den Hals-Bereich
- Ärmel: Kurze Zylinder die vom Schulterbereich ausgehen

Falten:
- Entweder durch Normal-Map simuliert
- Oder: Extra Geometrie für große Falten
- Wichtige Falten-Bereiche: Unter Achseln, am Bauch wenn gebeugt

## 2.2 Hose

Erstelle als leicht größere Version der Beine:
- Separates Mesh für jedes Bein
- Verbunden im Schritt-Bereich
- Bund oben als separater Torus

Taschen:
- Rechteckige Einbuchtungen an den Seiten
- Oder nur durch Textur/Normal-Map

## 2.3 Polizei-Ausrüstung

Helm:
- Basis: Modifizierte Halbkugel (oben abgeflacht)
- Krempe: Torus-Segment vorne
- Visier: Transparente Plane mit Kurve
- Nackenschutz: Verlängerte Geometrie hinten

Schutzweste:
- Basis: Modifizierter Torso-Wrap
- Dicke: Deutlich dicker als Torso (5-10cm)
- Taschen: Box-Geometrien auf der Front
- MOLLE-Schlaufen: Horizontale Rippen (durch Normal-Map oder Geometrie)

Schild:
- Leicht gebogene Plane
- Dicke: 1-2cm
- Griff auf Rückseite

---

# TEIL 3: GEBÄUDE-KOMPONENTEN

## 3.1 Fenster-Komponente

Erstelle eine wiederverwendbare WindowComponent:

Props:
- width: Breite
- height: Höhe
- hasShutters: Boolean für Fensterläden
- isOpen: Boolean für offenes Fenster

Bestandteile:
- Rahmen außen: Vier schmale Boxen als Faschen
- Fensterbrett: Horizontale Box unten, ragt nach vorne
- Glas: Transparente Plane mit leichtem Grünstich
- Fensterkreuz: Vertikale und horizontale dünne Boxen im Glas
- Verdachung (optional): Dreieck oder Bogen über dem Fenster

## 3.2 Tür-Komponente

Props:
- width
- height
- style: "wooden", "glass", "metal"
- hasTransom: Boolean für Oberlicht

Bestandteile:
- Türrahmen: Drei Boxen (oben, links, rechts)
- Türblatt: Große Box mit Textur
- Türgriff: Kleine Geometrie auf Türblatt
- Oberlicht: Wenn hasTransom, zusätzliches Glas über Tür

## 3.3 Wand-Segment

Props:
- width
- height
- windows: Array von Fenster-Positionen
- material: Textur-Referenz

Bestandteile:
- Hauptwand: Große Box
- Aussparungen für Fenster (durch CSG oder separate Geometrie)
- Fenster eingefügt

## 3.4 Komplettes Gebäude

Props:
- floors: Anzahl Stockwerke
- width
- depth
- style: "gründerzeit", "modern", "industrial"

Erstelle durch Stapelung:
- Erdgeschoss mit Eingangstür und Schaufenstern
- Wiederhole Obergeschoss-Modul
- Dach oben

---

# TEIL 4: TEXTUREN PROZEDURAL ERSTELLEN

## 4.1 Canvas-Textur-Generator

Da du keine externen Textur-Dateien hast, erstelle sie mit JavaScript:

Funktion createSkinTexture:

Erstelle ein HTML Canvas Element mit Größe 1024 mal 1024.
Hole den 2D Kontext.
Fülle das gesamte Canvas mit Basis-Hautfarbe (z.B. RGB 235, 195, 170).
Erstelle Noise-Variation: Iteriere über jeden Pixel, addiere zufälligen Wert zwischen -5 und +5 zu jeder Farbkomponente.
Male dunklere Bereiche für Augenringe, Bartschatten.
Male rötliche Bereiche auf Wangen und Nase.
Erstelle eine Three.CanvasTexture aus dem Canvas.
Setze needsUpdate auf true.
Return die Texture.

Funktion createFabricTexture:

Parameter: baseColor (RGB Array)
Erstelle Canvas 512 mal 512.
Fülle mit baseColor.
Male feines Gitter-Muster (Webart):
- Horizontale Linien alle 4 Pixel, leicht heller
- Vertikale Linien alle 4 Pixel, leicht dunkler
Füge Noise hinzu für Variationen.
Return als CanvasTexture.

Funktion createBrickTexture:

Erstelle Canvas 1024 mal 1024.
Fülle mit Mörtel-Farbe (hellgrau, RGB 200, 195, 185).
Male Ziegel-Muster:
- Ziegel-Größe: 64 mal 32 Pixel
- Versetzte Reihen (jede zweite Reihe um halbe Ziegel versetzt)
- Ziegel-Farbe: Variationen von Rot-Braun
- Jeder Ziegel hat leicht andere Farbe (Noise)
Return als CanvasTexture.

Funktion createAsphaltTexture:

Erstelle Canvas 1024 mal 1024.
Fülle mit Dunkelgrau (RGB 60, 60, 65).
Füge starkes Noise hinzu (Körnung).
Male zufällige Flecken (heller und dunkler).
Male dünne schwarze Linien als Risse.
Return als CanvasTexture.

## 4.2 Textur-Verwendung

Speichere generierte Texturen in einem Store oder Context damit sie wiederverwendet werden und nicht jedes Frame neu erstellt werden.

Bei Component Mount:
- Prüfe ob Textur bereits existiert
- Wenn nicht, erstelle und speichere
- Verwende aus Store

---

# TEIL 5: MATERIAL-DEFINITIONEN

## 5.1 Haut-Material

Erstelle ein meshStandardMaterial oder meshPhysicalMaterial mit:
- map: Die generierte Haut-Textur
- roughness: 0.7 (Haut ist nicht glatt)
- metalness: 0 (Haut ist nicht metallisch)
- normalMap: Falls vorhanden (für Poren)
- Optional bei meshPhysicalMaterial:
  - clearcoat: 0.1 (leichter Glanz bei Schweiß)
  - transmission: 0.05 (Subsurface-Andeutung)

## 5.2 Stoff-Material

Erstelle meshStandardMaterial mit:
- map: Generierte Stoff-Textur
- roughness: 0.8-0.95 (je nach Stoffart)
- metalness: 0
- normalMap: Webart-Normal

## 5.3 Glas-Material

Erstelle meshPhysicalMaterial mit:
- transmission: 0.95 (fast komplett durchsichtig)
- roughness: 0.05 (sehr glatt)
- metalness: 0
- ior: 1.5 (Brechungsindex von Glas)
- thickness: 0.01 (Glas-Dicke)
- color: Leichter Grünstich (0xE8F5E9)

## 5.4 Metall-Material

Erstelle meshStandardMaterial mit:
- color: Basis-Metallfarbe
- roughness: 0.2-0.4 (je nach Politur)
- metalness: 1.0 (voll metallisch)
- envMapIntensity: 1.5 (starke Reflexionen)

---

# TEIL 6: BELEUCHTUNGS-SETUP

## 6.1 Pflicht-Lichter

Die Szene MUSS haben:

Direktionales Licht (Sonne):
- Typ: directionalLight
- Intensität: 1.5-2.0
- Position: Schräg von oben (z.B. Position 50, 100, 50)
- castShadow: true
- shadow-mapSize: Mindestens 2048 mal 2048
- shadow-camera: Angepasst an Szenen-Größe

Hemisphäre-Licht oder Ambient:
- Typ: hemisphereLight oder ambientLight
- Intensität: 0.3-0.5
- Bei Hemisphere: Himmelfarbe oben, Bodenfarbe unten

Füll-Licht (optional aber empfohlen):
- Typ: directionalLight (schwächer)
- Intensität: 0.3-0.5
- Position: Gegenüber der Hauptsonne
- Keine Schatten

## 6.2 Dynamische Lichter

Straßenlaternen:
- Typ: pointLight
- Intensität: 1.0-2.0
- Distanz: 15-20 (Radius des Lichtkegels)
- Farbe: Warmweiß (0xFFE4B5) für historisch, Weiß für modern
- Nur bei Nacht aktiv (basierend auf Spielzeit)

Fahrzeuglichter:
- Typ: spotLight
- Intensität: 2.0
- Winkel: 30 Grad
- Penumbra: 0.5

---

# TEIL 7: VALIDIERUNGS-CODE

## 7.1 Polygon-Zähler

Füge folgende Debug-Funktion ein:

Funktion countScenePolygons:
Definiere Variable totalTriangles mit Wert 0.
Traversiere scene (scene.traverse).
Für jedes Objekt:
- Wenn geometry existiert und geometry.attributes.position existiert:
  - Hole die Vertex-Anzahl: geometry.attributes.position.count
  - Berechne Dreiecke: Bei indexed geometry, index.count geteilt durch 3
  - Bei non-indexed: position.count geteilt durch 3
  - Addiere zu totalTriangles
  - Logge: Objektname und Dreieckszahl
Logge am Ende: Gesamt-Dreiecke.

Rufe diese Funktion bei Szenen-Load auf und prüfe ob die Zahlen stimmen.

## 7.2 Performance-Monitor

Füge hinzu:
- FPS-Counter (Stats.js oder custom)
- Draw-Call-Zähler: renderer.info.render.calls
- Triangle-Zähler: renderer.info.render.triangles
- Memory-Nutzung: renderer.info.memory

---

# ZUSAMMENFASSUNG DER PFLICHT-ÄNDERUNGEN

Du MUSST:

1. ALLE primitiven Zylinder/Kapseln/Boxen für NPCs LÖSCHEN
2. MINDESTENS einen detaillierten NPC erstellen mit:
   - Anatomisch korrektem Kopf (Gesichtszüge)
   - Torso mit Körperform
   - Arme mit Händen
   - Beine mit Füßen
   - Kleidung
   - ÜBER 5.000 Polygone

3. Das blaue Rechteck-Gebäude LÖSCHEN
4. MINDESTENS ein detailliertes Gebäude erstellen mit:
   - Fenstern (nicht Löcher, sondern mit Rahmen)
   - Tür
   - Mehreren Stockwerken
   - Texturen
   - ÜBER 10.000 Polygone

5. Straße mit Textur erstellen
6. Umgebungs-Objekte hinzufügen (Laternen, Mülleimer, etc.)
7. Texturen verwenden (generiert oder extern)
8. Beleuchtung korrekt einrichten

**OHNE DIESE ÄNDERUNGEN IST DAS PROJEKT INAKZEPTABEL.**
