# 🚨 KRITISCHER NOTFALL-PROMPT: GRAFIK IST KOMPLETT FALSCH

## ⛔ STOPP - LIES DAS SOFORT

**DIE AKTUELLE GRAFIK IST INAKZEPTABEL!**

Was du gebaut hast:
- Primitive Zylinder als "Menschen" (ca. 50 Polygone)
- Einfarbige Flächen ohne Texturen
- Ein blaues Rechteck als "Gebäude"
- Keine Details, keine Umgebung, keine Atmosphäre

Was gefordert war:
- 35.000+ Polygone pro Charakter
- 8K PBR-Texturen
- Detaillierte Wiener Architektur
- Hunderte Umgebungs-Objekte

**DAS IST EIN TOTALES VERSAGEN. DU MUSST DAS KOMPLETT NEU MACHEN.**

---

# TEIL 1: SOFORT-MASSNAHMEN

## 1.1 LÖSCHE ALLE PRIMITIVEN PLACEHOLDER

Suche und LÖSCHE jeden Code der so aussieht:

```
// LÖSCHEN - Das sind primitive Placeholder:
<mesh>
  <cylinderGeometry args={[0.5, 0.5, 2]} />
  <meshStandardMaterial color="green" />
</mesh>

<mesh>
  <boxGeometry args={[10, 5, 10]} />
  <meshStandardMaterial color="blue" />
</mesh>

<mesh>
  <capsuleGeometry args={[0.3, 1.5]} />
  <meshBasicMaterial color="red" />
</mesh>
```

**ALLES was cylinderGeometry, boxGeometry, capsuleGeometry für NPCs oder Gebäude verwendet = LÖSCHEN**

---

## 1.2 WARUM DAS PASSIERT IST

Du hast die Spezifikationen ignoriert und stattdessen:
1. Einfache Three.js Primitiven verwendet
2. Keine echten 3D-Modelle erstellt
3. Keine Texturen geladen
4. Die Polygon-Anforderungen komplett missachtet

**Das ist nicht AAA-Qualität. Das ist nicht mal Mobile-Game-Qualität. Das ist Prototype-Müll.**

---

# TEIL 2: KORREKTE CHARAKTER-IMPLEMENTIERUNG

## 2.1 MENSCH-ANATOMIE IN POLYGONEN

Ein realistischer Mensch mit 35.000+ Polygonen besteht aus:

### KOPF (8.000-10.000 Polygone)
- Schädelform: Nicht eine Kugel, sondern anatomisch korrekt mit Stirn, Wangenknochen, Kiefer
- Augen: Jedes Auge hat Augapfel (Kugel mit 500 Polygone), Iris-Detail, Pupille, Lid-Geometrie (oberes und unteres Lid separat modelliert)
- Nase: Nasenbein, Nasenflügel, Nasenlöcher (nicht ein Dreieck, sondern 800+ Polygone)
- Mund: Lippen mit Volumen (Ober- und Unterlippe separat), Mundwinkel, Zähne-Geometrie hinter den Lippen
- Ohren: Vollständig modelliert mit Ohrmuschel, Ohrläppchen, inneren Details (600+ Polygone pro Ohr)
- Haare: Entweder Mesh-basiert (tausende kleine Polygone die Strähnen formen) oder Hair-Cards (planare Geometrie mit Alpha-Textur)

### TORSO (10.000-12.000 Polygone)
- Brustkorb: Nicht ein Zylinder! Anatomische Form mit Rippen-Andeutung
- Schultern: Kugelgelenk-Form, Deltoid-Muskel-Definition
- Rücken: Schulterblätter-Definition, Wirbelsäulen-Verlauf
- Bauch: Core-Muskulatur angedeutet, natürliche Rundung
- Becken: Hüftknochen-Definition

### ARME (4.000 Polygone pro Arm, 8.000 total)
- Oberarm: Bizeps/Trizeps-Definition, nicht ein einfacher Zylinder
- Ellbogen: Gelenk-Detail mit Knöchel
- Unterarm: Verjüngung zum Handgelenk, Muskel-Definition
- Handgelenk: Knöchel sichtbar

### HÄNDE (2.000 Polygone pro Hand, 4.000 total)
- Handfläche: Nicht flach! Anatomisch gewölbt
- Finger: JEDER Finger hat 3 Glieder (außer Daumen mit 2)
- Jedes Fingerglied ist ein separates Segment mit Gelenk
- Fingernägel: Kleine planare Geometrie auf jedem Finger
- Daumen: Eigene Position, eigene Rotation
- Knöchel: Sichtbar auf Handrücken

### BEINE (5.000 Polygone pro Bein, 10.000 total)
- Oberschenkel: Quadrizeps-Definition, Verjüngung zum Knie
- Knie: Kniescheibe-Geometrie
- Unterschenkel: Wadenmuskel-Definition
- Knöchel: Sichtbare Knöchel-Knochen

### FÜSSE (1.500 Polygone pro Fuß, 3.000 total)
- Fußform: Anatomisch korrekt, nicht ein Quader
- Zehen: Alle 5 Zehen modelliert (vereinfacht aber erkennbar)
- Ferse: Gerundete Form
- Fußgewölbe: Innenseite höher als Außenseite

---

## 2.2 KLEIDUNG FÜR DEMONSTRANTEN (zusätzlich 5.000-10.000 Polygone)

### T-SHIRT / HOODIE
- Nicht flach am Körper! Stoff hat Dicke (0.5-1cm)
- Falten an Achseln, Ellbogen, Taille
- Kragen-Detail: Rundkragen oder V-Ausschnitt mit Dicke
- Saum: Sichtbarer Abschluss unten
- Bei Hoodie: Kapuze als separates Geometrie-Element mit Innenfutter

### HOSE / JEANS
- Bundhöhe: Hose beginnt an natürlicher Taille
- Taschen: Eingesetzte Taschen mit sichtbarer Naht-Linie
- Knie-Bereich: Extra Polygone für Faltenwurf
- Hosenbein-Ende: Umschlag oder glatter Abschluss

### SCHUHE
- Sohle: Mehrschichtig (Laufsohle, Zwischensohle, Einlegesohle)
- Obermaterial: Textur-abhängig (Leder, Stoff, Synthetik)
- Schnürung: Entweder modelliert oder Textur
- Fersenkappe: Verstärkung sichtbar

### ACCESSOIRES FÜR DEMONSTRANTEN
- Rucksack: 2.000 Polygone (Tasche mit Riemen, Reißverschlüssen, Seitentaschen)
- Schild/Banner: 500 Polygone (Planar mit Stange)
- Cap/Mütze: 800 Polygone
- Schal/Tuch: 600 Polygone (für Maskierung)
- Sonnenbrille: 400 Polygone
- Handy in der Hand: 200 Polygone

---

## 2.3 POLIZEI-AUSRÜSTUNG (zusätzlich 8.000-15.000 Polygone)

### TAKTISCHER HELM (3.000 Polygone)
- Helm-Schale: Nicht eine Halbkugel! Taktische Form mit Kanten
- Visier: Transparentes Material, beweglich (hoch/runter)
- Kinnriemen: Modelliert mit Schnalle
- Polsterung innen: Sichtbar am Rand
- Nackenschutz: Verlängerung nach hinten

### SCHUTZWESTE (4.000 Polygone)
- Platten-Träger: MOLLE-System (Schlaufen-Reihen für Ausrüstung)
- Vorderseite: Magazintaschen, Funkgerät-Halterung
- Rückseite: Erste-Hilfe-Tasche, Handschellen-Halterung
- Schulterschutz: Gepanzerte Schulterklappen
- Seitenschutz: Seitenplatten-Taschen
- Beschriftung: "POLIZEI" als Relief oder Aufnäher-Geometrie

### SCHILD (2.500 Polygone)
- Schild-Körper: Leicht gebogen (nicht flach!)
- Sichtfenster: Transparenter Bereich oben
- Griffe: Zwei Griffe auf Rückseite
- Arm-Schlaufe: Schlaufe für Unterarm
- Verstärkungen: Rand-Verstärkung

### SCHLAGSTOCK (800 Polygone)
- Griff: Geriffelt für Grip
- Schaft: Nicht perfekt zylindrisch
- Spitze: Leicht verdickt
- Handschlaufe: Band am Griff

### SONSTIGE AUSRÜSTUNG
- Funkgerät: 400 Polygone (mit Antenne)
- Pfefferspray: 200 Polygone
- Handschellen: 300 Polygone
- Taschenlampe: 250 Polygone
- Kamera/Bodycam: 350 Polygone

---

## 2.4 IMPLEMENTIERUNG MIT REACT THREE FIBER

### METHODE 1: Prozedurale Erstellung (wenn keine GLB-Dateien)

Da du keine externen 3D-Modelle hast, musst du die Geometrie PROZEDURAL erstellen. Das bedeutet: Kombiniere VIELE einfache Formen zu komplexen Modellen.

#### Beispiel: KOPF (vereinfacht aber besser als Kugel)

Der Kopf besteht aus mehreren Mesh-Gruppen:

Schädel-Basis: Eine modifizierte Kugel, die in Y-Richtung gestreckt ist (Faktor 1.2), in Z-Richtung gestaucht (Faktor 0.9). Segmente: 32 horizontal, 24 vertikal. Das ergibt etwa 1.500 Polygone nur für die Grundform.

Kiefer-Region: Eine weitere Geometrie die von unten an den Schädel anschließt. Breiter als hoch, Trapez-Form von vorne gesehen.

Augen-Höhlen: Zwei Vertiefungen die durch Morph-Targets oder separate Geometrie eingedrückt werden.

Nase: Kombiniere einen vertikalen Quader (Nasenrücken) mit einer Kugel-Hälfte (Nasenspitze) und zwei kleinen Kugeln (Nasenflügel).

Ohren: Torus-Segmente kombiniert mit flachen Scheiben.

#### Beispiel: TORSO

Hauptkörper: Nicht ein Zylinder! Verwende eine modifizierte Kapsel die:
- Oben breiter ist (Schulterbreite)
- In der Mitte schmaler (Taille)
- Unten wieder breiter (Hüfte)

Dies erreichst du durch:
- Erstelle Querschnitte auf verschiedenen Höhen
- Verbinde die Querschnitte mit Polygonen
- Jeder Querschnitt hat 32-64 Vertices

#### Beispiel: HAND

Eine Hand besteht aus:
- Handfläche: Abgeflachter Quader mit gerundeten Kanten
- 5 Finger: Jeder Finger ist eine Kette von 3 Zylindern (unterschiedliche Durchmesser)
- Gelenke zwischen Zylindern
- Daumen: Andere Ausrichtung, nur 2 Glieder

### METHODE 2: GLB/GLTF Import (BEVORZUGT)

Wenn du Zugang zu 3D-Modellen hast:

Lade die Modelle mit useGLTF von @react-three/drei.

Jedes Modell sollte:
- Im GLB oder GLTF Format sein
- Bereits UV-unwrapped für Texturen
- Armature/Skeleton für Animation haben
- LOD-Versionen (hochauflösend und niedrigauflösend)

Platziere die Modelle im public/models/ Ordner:
- public/models/demonstrator_male_01.glb
- public/models/demonstrator_female_01.glb
- public/models/police_officer_riot.glb
- public/models/police_officer_standard.glb

---

# TEIL 3: GEBÄUDE-IMPLEMENTIERUNG

## 3.1 WIENER ARCHITEKTUR-ELEMENTE

### GRÜNDERZEIT-HAUS (60.000-80.000 Polygone)

Ein typisches Wiener Wohnhaus hat:

Erdgeschoss (Sockelzone):
- Höhe: 4-5 Meter
- Rustika-Fassade (Quaderstein-Optik, jeder "Stein" ist Geometrie)
- Eingangsportal: Bogen mit Schlussstein
- Schaufenster: Große Glasflächen mit Rahmen
- Türen: Doppelflügel mit Oberlicht

Hauptgeschosse (2-5 Stockwerke):
- Fenster: Nicht einfache Löcher! Jedes Fenster hat:
  - Außenrahmen (Faschen)
  - Fensterbrett (Gesims)
  - Fensterkreuz (Sprossen)
  - Verdachung (Dreieck oder Bogen über dem Fenster)
- Balkone: Schmiedeeiserne Brüstung mit detailliertem Muster
- Pilaster: Vertikale Gliederung zwischen Fenstern
- Gesimse: Horizontale Bänder zwischen Stockwerken

Dachzone:
- Kranzgesims: Starker horizontaler Abschluss
- Attika: Aufmauerung über Gesims
- Dach: Mansarddach mit Gauben (Dachfenster)
- Schornsteine: Mehrere, gemauert

Fassaden-Details:
- Stuck-Ornamente: Blumenmotive, Masken, Wappen
- Medaillons: Runde Reliefs
- Atlanten/Karyatiden: Figürliche Träger an wichtigen Stellen

### STEPHANSDOM (Wahrzeichen, 200.000+ Polygone)

Südturm (Steffl):
- Höhe: 136 Meter
- Gotische Fialen (kleine Türmchen)
- Maßwerk (durchbrochene Steinarbeit)
- Spitze mit Kreuz

Dach:
- Berühmtes Zickzack-Muster aus glasierten Ziegeln
- Dachneigung und Geometrie der Ziegel
- Dachreiter (kleine Türmchen auf dem Dach)

Hauptportal (Riesentor):
- Romanischer Bogen
- Säulen mit Kapitellen
- Figürlicher Schmuck

---

## 3.2 STRASSEN UND INFRASTRUKTUR

### STRASSE (pro 100m Segment: 5.000 Polygone)

Fahrbahn:
- Nicht flach! Leichte Wölbung zur Mitte (Quergefälle)
- Asphalt-Textur mit Rissen und Flecken
- Fahrstreifen-Markierungen
- Schachtdeckel (Kanaldeckel): Runde Geometrie mit Gitter-Muster

Gehsteig:
- Erhöht (15-20cm über Fahrbahn)
- Bordstein: Separate Geometrie
- Pflasterung: Wiener Würfel (kleine Granitquader)
- Abgesenkte Bereiche bei Übergängen

### STRASSENLATERNE (2.000 Polygone pro Stück)

Mast:
- Nicht zylindrisch! Leicht konisch
- Basis: Dekorativer Fuß
- Höhe: 4-6 Meter

Leuchte:
- Historischer Stil: Laterne mit mehreren Glasscheiben
- Moderner Stil: LED-Ausleger

Arm:
- Geschwungener Ausleger
- Verzierungen

### WEITERE STRASSEN-OBJEKTE

Mülleimer (1.500 Polygone):
- Zylindrisch mit Deckel
- Öffnung vorne
- Halterung/Ständer

Bank (3.000 Polygone):
- Holzlatten auf Metallgestell
- Rückenlehne
- Armlehnen

Telefonzelle (2.500 Polygone):
- Klassische Wiener Telefonzelle
- Glaswände
- Dach

Verkehrsschild (500 Polygone):
- Mast
- Schild-Geometrie
- Halterung

Ampel (1.000 Polygone):
- Mast
- Signalgeber (3 Lichter)
- Fußgänger-Signal

Hydrant (800 Polygone):
- Klassische Form
- Anschlüsse

---

# TEIL 4: TEXTUREN

## 4.1 TEXTUR-ARTEN (PBR-Workflow)

Für JEDES Material brauchst du:

Albedo/Diffuse (Base Color):
- Die Grundfarbe ohne Licht-Einflüsse
- RGB, 8-bit pro Kanal
- Auflösung: 4K (4096x4096) für Hauptcharaktere, 2K für Nebensachen

Normal Map:
- Simuliert Oberflächendetails ohne Geometrie
- RGB, Tangent-Space
- Blau-violetter Farbton
- Fügt Tiefe zu flachen Flächen hinzu (Poren, Nähte, Kratzer)

Roughness Map:
- Grayscale
- Weiß = rau (Stoff, Beton)
- Schwarz = glatt/glänzend (Metall, nasses Leder)

Metallic Map:
- Grayscale
- Weiß = Metall (Knöpfe, Reißverschlüsse)
- Schwarz = Nicht-Metall (fast alles andere)

Ambient Occlusion (AO):
- Grayscale
- Dunkle Bereiche wo Umgebungslicht nicht hinkommt
- Falten, Ecken, unter Kragen

Height/Displacement Map (optional):
- Grayscale
- Echte Geometrie-Verschiebung
- Nur für extreme Close-ups

## 4.2 CHARAKTER-TEXTUREN

### HAUT-TEXTUR

Albedo:
- Variationen im Hautton (nicht einfarbig!)
- Rötliche Bereiche: Wangen, Nase, Ohren, Lippen
- Bläuliche Bereiche: Augenringe, Schatten
- Gelbliche Bereiche: Stirn, Kinn
- Sommersprossen, Leberflecken, Muttermale
- Bartschatten bei Männern

Normal Map:
- Poren (mikroskopische Vertiefungen)
- Falten (Stirn, Augenwinkel, Nasolabial)
- Narben falls gewünscht

Subsurface Scattering:
- Haut ist leicht durchscheinend
- Rot-orange Unterfarbe (Blut)
- Besonders an dünnen Stellen (Ohren, Nasenflügel)

### STOFF-TEXTUR (Kleidung)

Albedo:
- Farbe des Stoffs
- Muster falls vorhanden (Streifen, Karos)
- Abnutzung (ausgeblichene Bereiche)
- Flecken

Normal Map:
- Webart-Struktur (Köper, Leinwand, etc.)
- Nähte (erhabene Linien)
- Falten (im Albedo weniger sichtbar)

Roughness:
- Baumwolle: hoch (0.7-0.9)
- Seide: niedrig (0.2-0.4)
- Leder: mittel (0.4-0.6)
- Abnutzung erhöht Roughness

## 4.3 UMGEBUNGS-TEXTUREN

### ASPHALT

Albedo:
- Dunkelgrau mit Variationen
- Flicken (hellere/dunklere Bereiche)
- Ölflecken
- Reifenspuren

Normal Map:
- Körnung
- Risse
- Schlagloch-Ränder

### BACKSTEIN/ZIEGEL

Albedo:
- Rote/braune Ziegel
- Variationen zwischen Ziegeln
- Mörtel-Fugen (hellgrau)

Normal Map:
- Ziegel-Relief
- Fugen vertieft
- Oberflächenstruktur der Ziegel

### GLAS

Transparent mit:
- Leichter Grünstich
- Reflexionen (Environment Map)
- Verschmutzung (fingerabdrücke, Staub)

---

# TEIL 5: SOFORTIGE CODE-ÄNDERUNGEN

## 5.1 ERSETZE PRIMITIVE NPCs

Lösche diesen Code KOMPLETT:

Alles was so aussieht:
- mesh mit cylinderGeometry für NPC-Körper
- mesh mit sphereGeometry für NPC-Köpfe
- mesh mit capsuleGeometry für NPC-Körper
- Einfarbige meshStandardMaterial oder meshBasicMaterial für NPCs

Ersetze durch einen der folgenden Ansätze:

### ANSATZ A: Prozedural generierte Menschen

Erstelle eine Komponente die einen Menschen aus vielen Teilen zusammensetzt:

Die Komponente HumanCharacter erhält Props für Größe, Körpertyp, Kleidung, Accessories.

Intern erstellt sie Gruppen für:
- Kopf-Gruppe (alle Kopf-Meshes)
- Torso-Gruppe (Oberkörper-Meshes)
- Linker-Arm-Gruppe
- Rechter-Arm-Gruppe
- Linkes-Bein-Gruppe
- Rechtes-Bein-Gruppe
- Kleidungs-Gruppe
- Accessoire-Gruppe

Jede Gruppe enthält mehrere Meshes die zusammen die Form bilden.

### ANSATZ B: LOW-POLY aber DETAILLIERT

Wenn Performance kritisch ist, verwende weniger Polygone aber mit:
- Guten Normal-Maps (simuliert Detail)
- Detaillierten Texturen
- Korrekten Proportionen

Minimum 5.000 Polygone pro Charakter (nicht 50!).

## 5.2 ERSETZE PRIMITIVE GEBÄUDE

Lösche diesen Code KOMPLETT:

Das blaue Rechteck das als "Gebäude" dient.

Ersetze durch:

### Modulares Gebäude-System

Erstelle wiederverwendbare Komponenten:
- Fenster-Modul (mit Rahmen, Glas, Sims)
- Tür-Modul (mit Portal, Türblatt, Oberlicht)
- Balkon-Modul (mit Brüstung, Boden)
- Geschoss-Modul (Wand mit Fenstern)
- Dach-Modul (verschiedene Dachformen)

Kombiniere diese zu vollständigen Gebäuden:

Ein Wohnhaus ist:
- 1x Erdgeschoss-Modul
- 3-5x Geschoss-Module gestapelt
- 1x Dach-Modul oben

## 5.3 FÜGE STRASSENELEMENTE HINZU

Die Szene braucht:
- Straßen mit Texturen (nicht nur Grid-Linien!)
- Gehsteige erhöht
- Straßenlaternen VIELE (alle 20-30 Meter)
- Mülleimer
- Bänke
- Bäume (mindestens als Billboards mit Alpha)
- Verkehrsschilder

---

# TEIL 6: TEXTUR-ERSTELLUNG OHNE EXTERNE DATEIEN

Falls du keine Textur-Dateien hast, erstelle sie PROZEDURAL:

## 6.1 Canvas-basierte Texturen

Erstelle Texturen mit HTML Canvas API:

Für eine Haut-Textur:
1. Erstelle ein Canvas 1024x1024
2. Fülle mit Basis-Hautton (RGB: 255, 205, 180)
3. Füge Noise hinzu (Perlin/Simplex)
4. Male dunklere Bereiche (Augenringe, Bartschatten)
5. Male rötliche Bereiche (Wangen, Nase)
6. Füge kleine Punkte hinzu (Poren, Sommersprossen)
7. Konvertiere zu Three.js Texture

Für eine Stoff-Textur:
1. Erstelle Canvas 512x512
2. Fülle mit Stoff-Farbe
3. Erstelle Webart-Muster durch Linien-Gitter
4. Füge leichte Farbvariationen hinzu
5. Konvertiere zu Texture

Für Asphalt:
1. Erstelle Canvas 1024x1024
2. Fülle mit Dunkelgrau
3. Füge viel Noise hinzu
4. Male unregelmäßige hellere/dunklere Flecken
5. Male dünne schwarze Linien (Risse)
6. Konvertiere zu Texture

## 6.2 Noise-Funktionen

Implementiere Perlin Noise oder Simplex Noise für:
- Organische Variationen
- Terrain-Höhe
- Wolken
- Verschmutzung

---

# TEIL 7: CHECKLISTE FÜR GEMINI

## NACH DIESER ÜBERARBEITUNG MUSST DU FOLGENDES HABEN:

### NPCs (Mindestens 1 Modell):
- [ ] Polygon-Count: Über 5.000 (Minimum), Ziel 35.000
- [ ] Anatomisch korrekte Proportionen
- [ ] Kopf mit Gesichtszügen (nicht Kugel)
- [ ] Torso mit Körperform (nicht Zylinder)
- [ ] Separate Arme und Beine
- [ ] Hände mit Fingern
- [ ] Kleidung als separate Geometrie
- [ ] Mindestens eine Textur (Albedo)

### Gebäude (Mindestens 1):
- [ ] Polygon-Count: Über 10.000 (Minimum), Ziel 50.000
- [ ] Mehrere Stockwerke
- [ ] Fenster mit Rahmen (nicht Löcher)
- [ ] Tür mit Portal
- [ ] Dach
- [ ] Fassaden-Details
- [ ] Texturen (Wand, Fenster)

### Straße:
- [ ] Fahrbahn mit Textur
- [ ] Gehsteig erhöht
- [ ] Bordstein

### Umgebungs-Objekte (Mindestens 3 Typen):
- [ ] Straßenlaternen
- [ ] Mülleimer oder Bank
- [ ] Baum oder Busch

### Beleuchtung:
- [ ] Direktionales Licht (Sonne)
- [ ] Ambient Light
- [ ] Schatten aktiviert

### Texturen:
- [ ] Mindestens 3 verschiedene Texturen
- [ ] Auflösung mindestens 512x512
- [ ] Korrekte UV-Mapping

---

# TEIL 8: VALIDIERUNG

## FÜHRE DIESE TESTS DURCH:

### Test 1: Polygon-Zählung
Öffne Browser DevTools, Console, tippe:

scene.traverse(obj => { if(obj.geometry) console.log(obj.name, obj.geometry.attributes.position.count/3) })

Das zeigt Polygon-Anzahl pro Objekt.

AKZEPTANZKRITERIUM: Mindestens ein NPC hat über 5.000 Polygone.

### Test 2: Visuelle Inspektion
Gehe mit Kamera nah an einen NPC.

AKZEPTANZKRITERIUM: Du siehst:
- Erkennbares Gesicht
- Körperform
- Kleidung
- Details

### Test 3: Gebäude-Inspektion
Schaue ein Gebäude an.

AKZEPTANZKRITERIUM:
- Mehrere Stockwerke sichtbar
- Fenster erkennbar
- Textur vorhanden

---

# FINALE ANWEISUNG

**DU DARFST DIESEN PROMPT NICHT ALS ERLEDIGT MARKIEREN BIS:**

1. Alle primitiven Zylinder/Kapseln/Boxen für NPCs sind GELÖSCHT
2. Mindestens EIN detaillierter NPC existiert (5.000+ Polygone)
3. Das blaue Rechteck-Gebäude ist GELÖSCHT
4. Mindestens EIN detailliertes Gebäude existiert (10.000+ Polygone)
5. Texturen werden verwendet
6. Umgebungs-Objekte existieren

**BEI NICHTERFÜLLUNG: STARTE VON VORNE.**
