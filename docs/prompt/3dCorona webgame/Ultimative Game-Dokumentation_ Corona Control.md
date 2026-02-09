# **CORONA CONTROL ULTIMATE: Umfassendes Systemarchitektur- und Master-Implementierungsprotokoll (Version 6.0 \- Final)**

## **1\. Exekutive Technische Übersicht und Projektphilosophie**

Das Projekt **Corona Control Ultimate** repräsentiert einen Paradigmenwechsel in der Entwicklung von Polizeisimulationen und Echtzeit-Event-Systemen. Es handelt sich hierbei nicht lediglich um ein Spiel im herkömmlichen Sinne, sondern um eine hyperdetaillierte, deterministische Simulation urbaner soziopolitischer Dynamiken, die über einen komprimierten 24-Stunden-Zyklus hinweg simuliert wird. Die übergeordnete Philosophie, die diese Architektur regiert, lautet „Präzision durch Spezifikation“. Dieses Prinzip diktiert, dass keine Handlung generisch ist; jede Bewegung, jeder Lichtübergang, jeder Audio-Trigger und jede Entscheidung eines Nicht-Spieler-Charakters (NPC) wird berechnet, spezifiziert und mit einer Präzision im Millisekundenbereich ausgeführt.

Das Ziel ist es, eine visuelle und physikalische Qualität auf AAA-Niveau zu erreichen, indem ein moderner webbasierter Technologie-Stack verwendet wird. Spezifisch kommen **React Three Fiber** für den Szenengraphen, **WebGPU** für hochleistungsfähiges Rendering und Compute-Aufgaben sowie **Jolt Physics** für deterministische Starrkörper- und Constraint-Simulationen zum Einsatz.1 Die Simulation operiert auf einer strikten temporalen Skala, bei der ein Spieltag exakt 24 Minuten Realzeit entspricht, was eine robuste, mehrfädige Update-Architektur erfordert, um die Synchronisation über Physik-, KI- und Rendering-Schleifen hinweg aufrechtzuerhalten.1

Dieser Bericht dient als das „Master Control“-Dokument, das die architektonischen Mandate aus den Protokollen *24H\_HYPER\_DETAIL\_KOMPLETT*, *MASTER\_CONTROL\_PROMPT\_24H\_HYPERDETAIL* und *CORONA\_CONTROL\_V5.1\_ULTRA\_COMPLETE* in einer vereinheitlichten, erschöpfenden technischen Bibel synthetisiert. Er adressiert identifizierte Lücken in den Deeskalationsmechaniken, der horizontalen Validierung und den physikalischen Interaktionen und transformiert die fragmentierten Daten in einen kohärenten Produktionsbauplan.

## **2\. Temporale Architektur und der Core-Loop**

Das Fundament von *Corona Control Ultimate* ist sein kompromissloses Zeitsystem. Im Gegensatz zu traditionellen Game-Loops, die sich für alle Logiken auf variable Zeitdeltas stützen, verwendet dieses System einen hybriden Ansatz, um ein deterministisches Auslösen von Ereignissen zu gewährleisten, während gleichzeitig eine flüssige visuelle Leistung beibehalten wird.

### **2.1 Die Echtzeit-Konvertierungsmatrix**

Die Simulation schafft eine direkte, lineare Abbildung zwischen der Realzeiterfahrung des Spielers und dem Fortschritt im Spiel. Diese strikte Kopplung ist notwendig, um die Illusion einer lebenden, atmenden Stadt zu erzeugen, die nicht auf den Spieler wartet, sondern nach ihrem eigenen Rhythmus existiert.

* **Globale Zeitskala:** Der 24-Stunden-Zyklus wird in 1.440 Sekunden Realzeit (24 Minuten) komprimiert. Dies erzeugt ein temporales Kompressionsverhältnis von 1:60.1  
* **Einheitendefinitionen:**  
  * **1 Spieltag:** 1.440 Spielminuten \= 24 Realminuten.  
  * **1 Spielstunde:** 60 Spielminuten \= 60 Realsekunden.  
  * **1 Spielminute:** 1 Realsekunde.  
  * **1 Spielsekunde:** 16,66 Millisekunden.1

Diese Konvertierung ist entscheidend für die „Hyper-Detail“-Philosophie. Sie ermöglicht Entwicklern, Ereignisse Frame für Frame zu skripten. Beispielsweise deckt eine Animation, die in Echtzeit 1,5 Sekunden dauert, exakt 1,5 Minuten Simulationszeit ab, was ein vorhersehbares Fenster für NPC-Wegfindungs- und Interaktionslogik bietet.1 Diese Determiniertheit ist essentiell für die Synchronisation von Audio- und visuellen Effekten, etwa wenn eine Kirchenglocke exakt zur vollen Stunde schlagen muss und der Hallradius mit der Position der Kamera und der Windrichtung korreliert.

### **2.2 Mehrschichtige Update-Frequenz-Architektur**

Um die Leistung für mehr als 500 gleichzeitige NPCs und eine dynamische globale Beleuchtung zu optimieren, verzichtet das System auf einen monolithischen Update-Loop zugunsten einer geschichteten Frequenzarchitektur.1

| Systemschicht | Frequenz | Intervall (ms) | Verantwortlichkeit | Zitation |
| :---- | :---- | :---- | :---- | :---- |
| **Physik (Jolt)** | 120 Hz | 8,33 ms | Starrkörperdynamik, Kollisionsauflösung, Raycasting. | 1 |
| **Render-Loop** | 60 Hz | 16,67 ms | WebGPU Draw Calls, Shader-Uniform-Updates, UI-Compositing. | 1 |
| **KI (Verhalten)** | 10 Hz | 100 ms | Auswertung von Verhaltensbäumen, Neuberechnung der Wegfindung, Zustandsübergänge. | 1 |
| **Uhr/UI** | 1 Hz | 1000 ms | HUD-Updates, Synchronisation des visuellen Timers mit internen gameTimeSeconds. | 1 |
| **Globale Events** | 0,2 Hz | 5000 ms | Große Zustandsprüfungen (z. B. Prüfung, ob die „Morgenphase“ beendet ist). | 1 |

**Optimierungseinsicht:** Die Entkopplung des Physik-Loops (120 Hz) vom Render-Loop (60 Hz) ist für die Stabilität unerlässlich. Jolt Physics benötigt einen festen Zeitschritt, um deterministisch zu bleiben. Indem die Physik mit der doppelten Render-Rate läuft, stellt die Simulation sicher, dass sich schnell bewegende Objekte (wie Projektile oder Fahrzeuge) nicht durch Geometrie „tunneln“, ein häufiges Problem in Simulationen mit niedrigerer Frequenz. Die Aktualisierung der KI mit 10 Hz ist eine leistungssparende Maßnahme; menschliche Reaktionszeiten und Massenströme erfordern keine Präzision im Millisekundenbereich, was es der CPU ermöglicht, die schwere Last von 500 entscheidungsfindenden Entitäten über mehrere Frames zu verteilen.2

## **3\. Die 24-Stunden-Hyper-Timeline: Phasenweise Spezifikation**

Die Simulation ist in vier primäre chronologische Phasen unterteilt. Jede Phase diktiert spezifische Beleuchtungs-Shader, Audio-Layer und NPC-Spawn-Logiken. Der folgende Abschnitt erweitert das Quellenmaterial, um die fehlende physikalische und verhaltensbezogene Granularität bereitzustellen, die für ein „vollständiges“ System erforderlich ist.

### **3.1 Phase 1: Morgen (Das Erwachen) \[06:00 – 12:00\]**

Der Übergang von der Nacht zum Tag ist die technisch anspruchsvollste Sequenz und dient als Benchmark für die „Ultra-Detail“-Fähigkeiten des Systems. Hier wird die Stadt nicht einfach „eingeschaltet“, sondern sie erwacht organisch durch tausende mikroskopische Zustandsänderungen.

#### **3.1.1 Die „Stadt Erwacht“ (City Awakens) Transitionssequenz**

Diese Sequenz demonstriert die Leistungsfähigkeit der Shader-Interpolation und der Audio-Layer-Steuerung.

**Trigger-Zeit:** 06:00:00.000 (Spielzeit)

**Dauer:** 300 Spielsekunden (5 Realsekunden)

**Detailliertes Ausführungsprotokoll:**

* **T-Minus 0 (06:00:00):** Die Skybox-Zenith-Farbe ist auf tiefes Nachtblau (RGB 15, 15, 45\) fixiert. Die Sonne befindet sich auf \-18° Elevation. Straßenlaternen sind bei 800 Lumen Intensität aktiv.  
* **T-Plus 1s (06:01:00):** Die Horizontfarbe verschiebt sich zu einem tiefen Orange-Verlauf (RGB 120, 60, 40). Die Sonnenelevation steigt auf \-12°. Ein globales Audio-Fade-Out für den Track night\_ambient\_city.wav beginnt (Lineare Kurve: \-12dB bis \-∞).1 Gleichzeitig beginnt die Audio-Engine, die Parameter für die Hallräume (Reverb) anzupassen, da die kühle Nachtluft durch wärmere Luftschichten ersetzt wird, was die Schallausbreitung subtil verändert.  
* **T-Plus 2s (06:02:00):** **God-Ray-Aktivierung.** Die volumetrische Beleuchtungs-Engine aktiviert God-Rays mit einer Sample-Anzahl von 64 und einer Zerfallsrate von 0,95. Die Sonnenscheibe wird sichtbar mit einer Bloom-Intensität von 2,0.  
* **T-Plus 3s (06:03:00):** **Die Laternen-Flacker-Welle.** Dies ist ein kritischer Synchronisationstest. 247 Straßenlaternen (IDs Laterne\_001 bis Laterne\_247) beginnen eine Abschaltsequenz. Anstatt eines gleichzeitigen Blackouts führt das System einen „Wellen-Effekt“ aus, der sich von Osten nach Westen bewegt.  
  * *Logik:* StartZeit \= 06:03:00 \+ (Laternen\_ID \* 0,033s).  
  * *Sequenz:* Frame 0-5 (Dimmen auf 400lm), Frame 6-10 (Erholen auf 800lm), Frame 11-14 (Dimmen auf 200lm), Frame 25 (Abschalten auf 0lm).  
  * *Audio-Sync:* Jede einzelne Laterne löst im exakten Moment ihres finalen Erlöschens das Audiofile electric\_buzz\_off.wav aus.1  
* **T-Plus 5s (06:05:00):** Transition abgeschlossen. Die Intensität des gerichteten Lichts erreicht 15.000 Lux (Tageslicht). Das Umgebungslicht (Ambient Light) wird auf 0,6 gesetzt. Sterne werden unsichtbar gerendert (Opazität 0).1

#### **3.1.2 Fehlende Physikalische Interaktionen (Lückenschluss)**

Die Analyse des Quellenmaterials 1 deutet auf einen Mangel an physikalischen Interaktionsdefinitionen während dieser Phase hin. Das optimierte System fügt Folgendes hinzu:

* **Oberflächen-Thermodynamik:** Um 06:00:00 initiiert der GlobalMaterialController eine lineare Interpolation des **Roughness**\-Wertes für Asphalt- und Betonmaterialien. Die Werte verschieben sich von 0,2 (Nass/Morgentau) auf 0,8 (Trocken) im Verlauf des virtuellen Morgens (06:00–09:00), um das Verdunsten von Feuchtigkeit bei Sonnenaufgang zu simulieren. Dies beeinflusst direkt die Reflexionseigenschaften im PBR-Rendering.  
* **Thermische Winddynamik:** Da die Sonne aufsteigt, aktualisiert sich der GlobalWindVector von einem statischen (0, 0, 0\) zu einem turbulenten (0,5, 0, 0,2), um morgendliche thermische Aufwinde zu simulieren. Dies wirkt sich direkt auf die Tuchsimulation (Cloth Simulation) an Flaggen und Bannern aus, die nun beginnen, sich physikalisch korrekt im Wind zu blähen.1

#### **3.1.3 NPC-Initialisierung: Die Erste Welle**

Parallel zur Umwelttransformation beginnt die Simulation der Bevölkerung. Um 06:00:00 werden spezifische NPCs instanziiert, die individuelle Routinen abarbeiten.

**NPC Zivilist 001: Jogger Stefan**

Stefan ist kein generischer NPC, sondern ein vollständig definierter Agent.

* **Spawn:** 06:00:00 am Stadtpark Eingang Ost.  
* **Physiologie:** Modell male-athletic-30s, Gewicht 78 kg. Seine Animation jogging-male-athletic ist mit einer Geschwindigkeit von 3,2 m/s (11,5 km/h) gekoppelt.  
* **Audio-Signatur:** Seine Schritte triggern footstep-running-gravel.wav, moduliert durch die Geschwindigkeit. Ein dedizierter Atembus (breathing-athletic-loop.wav) wird basierend auf seiner Ausdauer (Stamina-Wert) in der Lautstärke gesteuert.  
* **Wegfindung:** Er folgt einem Spline-basierten Loop durch den Park mit 9 Waypoints. Sein Verhalten ist auf „Ausweichen“ priorisiert; er stoppt für nichts außer unmittelbaren Bedrohungen.

**NPC Zivilist 002: Büroangestellte Maria**

* **Spawn:** 06:00:15 am U-Bahn-Ausgang A.  
* **Sequenz:** Sie tritt aus dem Schacht (Animation stairs-climb-exit), orientiert sich kurz (look-around-quick), zieht ihr Smartphone (retrieve-phone-pocket, Audio fabric-rustle.wav) und beginnt ihren Weg zum Bürogebäude.  
* **Multitasking:** Der Animations-Controller blendet walk-purposeful (Unterkörper) mit phone-check-walking (Oberkörper) mit einer Gewichtung von 0,4. Dies demonstriert die Fähigkeit des Systems zu komplexem Animation Blending.

**NPC Zivilist 003: Rentner Heinrich mit Hund**

* **Komplexe Interaktion:** Heinrich (70er Jahre, Gehstock) ist physikalisch über ein Seil-System (Rope Physics) mit seinem Hund „Waldi“ verbunden.  
* **Logik:** Das Seil hat eine maximale Länge von 2,0 Metern. Wenn der Hund (dog-dachshund) stehen bleibt, um zu schnüffeln (dog-sniff-ground), spannt sich das Seil, und Heinrichs IK-System zieht seinen linken Arm in Richtung des Hundes, während er stehen bleibt und wartet. Dies erfordert eine bidirektionale Kommunikation zwischen zwei unabhängigen KI-Agenten.

#### **3.1.4 Die Bäckerei-Öffnungssequenz (06:00:00 \- 06:00:30)**

Ein Paradebeispiel für die skriptgesteuerte Interaktivität ist die Öffnung der Bäckerei „Goldene Semmel“.

1. **Licht (06:00:00.1):** Das Licht im Hinterzimmer schaltet ein (400 Lumen, Warmweiß).  
2. **Hauptraum (06:00:00.5):** Vier Deckenlampen schalten sequenziell mit 0,1s Verzögerung ein, inklusive eines Neonröhren-Flackereffekts.  
3. **NPC-Aktion (06:00:01):** Bäcker Franz betritt den Raum aus dem Hinterzimmer. Er drückt die Klinke (door-handle-press.wav), öffnet die Tür physikalisch (Hinge Joint), wischt sich die Hände an der Schürze ab und positioniert sich hinter der Theke.  
4. **Ladenöffnung (06:00:10):** Franz geht zur Vordertür, entriegelt sie (Schlüsselbund-Physik und Audio keys-jingle.wav), öffnet sie und dreht das „Geschlossen“-Schild um 180 Grad (sign-flip.wav).

### **3.2 Phase 2: Mittag (Die Eskalation) \[12:00 – 18:00\]**

Diese Phase führt den primären Konflikt-Loop ein: Das Ultimatum und die daraus resultierende Eskalation. Hier muss das System von friedlicher Simulation auf High-Stress-Crowd-Control umschalten.

#### **3.2.1 Das Ultimatum der Polizei (12:00:00)**

Das Event „Auflösungs-Ansage“ ist ein synchronisierter Vorgang, der Audio, KI und Animationen über hunderte Entitäten hinweg koordiniert.

* **Protagonist:** Oberst Martin Gruber betritt die Bühne, flankiert von vier Polizisten. Seine Animationen sind strikt autoritär (march-formation, shove-aside).  
* **Audio-Logik:** Um exakt 12:00:20 wird die Ansage über Lautsprecher ausgegeben. Dies ist ein „Priorität 1“-Audioereignis, das alle Umgebungsebenen (Ambient Layer) per Sidechaining um \-15dB absenkt (Ducking), um Klarheit zu gewährleisten.  
* **Massenreaktion (Crowd Explosion):** Um 12:01:00 folgt auf die Ansage zwei Sekunden Stille, dann eine Explosion der Wut.  
  * **KI-Zustandswechsel:** Die Crowd-KI wechselt nicht instantan, sondern über einen **„Wellen-Ausbreitungs-Algorithmus“**. NPCs nahe der Bühne reagieren zuerst (Statuswechsel zu STATE\_AGITATED), und dieser Zustand breitet sich mit einer Verzögerung von 0,1s pro Meter Radius nach außen aus. Dies simuliert die akustische Verzögerung und die soziale Ansteckung.  
  * **Physik-Aktivierung:** Erste Wurfgeschosse (Flaschen, Steine) werden instanziiert. Die Kollisionsmatrix wird aktualisiert: GROUP\_PROJECTILE kollidiert nun mit GROUP\_POLICE\_SHIELD.

#### **3.2.2 Erste Gewaltausbrüche und Nahkampf-Logik**

Um 12:15:00 erreicht die Aggression den Siedepunkt.

* **Auslöser:** Ein NPC (Demo-47) spuckt einem Polizisten ins Visier. Das System registriert dies als Treffer auf dem Kopf-Collider.  
* **Kettenreaktion:** Der betroffene Polizist wechselt in den STATE\_COMBAT und führt einen Schlagstock-Hieb aus (baton-strike-overhead).  
* **Schadensberechnung:** Das System berechnet Treffer basierend auf Hitboxen. Ein Schlag auf den Arm verursacht 15 HP Schaden und triggert die Animation stagger-back. Ein Schildstoß verursacht 25 HP Schaden und einen physikalischen Knockback-Impuls.  
* **Ragdoll-Physik:** Fällt ein NPC auf 0 HP, wird das Animationssystem deaktiviert und der Jolt-Physik-Ragdoll-Modus aktiviert. Der Körper reagiert nun rein physikalisch auf Schwerkraft und Kollisionen.

#### **3.2.3 Einsatz der Wasserwerfer (13:01:00)**

Das „Hydro-Cannon-Assault“-Event demonstriert die Integration von Partikelsystemen und Physik.

* **Partikelsystem:** Der Wasserstrahl ist kein einfacher Strahl, sondern ein WebGPU-basiertes Partikelsystem mit Kollisionsabfrage.  
* **Physik-Interaktion:** Trifft ein Wasserpartikel einen NPC, wird ein Impulsvektor auf den Starrkörper des NPCs angewendet. Die Stärke des Impulses korreliert mit dem Druck (15 Bar) und der Distanz.  
* **Materialänderung:** Getroffene NPCs und Bodenflächen erhalten dynamisch einen „Nass“-Shader-Parameter (erhöhte Specularity, dunklere Albedo), der über Zeit wieder abklingt.

### **3.3 Phase 3: Abend (Der Aufruhr) \[18:00 – 22:00\]**

Wenn die Sonne untergeht, ändert sich die Tonalität des Spiels drastisch. Die Beleuchtung wird komplexer, da hunderte dynamische Lichtquellen (Bengalos, Molotowcocktails) berechnet werden müssen.

#### **3.3.1 Visuelle Transition und Bengalo-Inferno**

* **Goldene Stunde (18:00):** Die UI-Farbe wechselt zu Gold (\#FFD700). Die Sonnenelevation fällt auf 5°. Da Schatten länger werden, erhöht das System den Shadow Bias-Parameter auf 0,005, um Artefakte („Shadow Acne“) zu vermeiden.  
* **Pyro-Show (19:30):** Zwanzig Bengalos werden gleichzeitig gezündet.  
  * **Lichttechnik:** Jedes Bengalo instanziert ein dynamisches Point-Light (Rot, 2000 Lumen). Da herkömmliches Forward Rendering hier einbrechen würde, nutzt das System hier die Stärken des **Deferred Rendering** (oder Forward+ in WebGPU), um hunderte Lichter performant zu berechnen.  
  * **Partikel:** Roter Rauch wird emittiert, der volumetrisch vom Licht der Bengalos beleuchtet wird.

#### **3.3.2 Der Schwarze Block und Mob-KI**

Eine neue Gruppe von NPCs (Extremisten) spawnt. Ihre Attribute sind maximiert: Aggression 100, Moral 0 (keine Angst).

* **Barrikadenbau:** Das System nutzt eine komplexe Objekt-Interaktions-Logik. NPCs identifizieren physikalische Objekte (Autos, Müllcontainer), wenden Kräfte an (push-car-coordinated), um sie umzuwerfen, und erstellen so dynamische NavMesh-Hindernisse.  
* **Molotow-Physik:** Ein Molotowcocktail ist ein Projektil mit einer Flüssigkeitssimulation im Inneren. Beim Aufprall (Impact) zerbricht das Mesh, und ein Flächenbrand-System wird instanziiert. Das Feuer breitet sich basierend auf Voxel-Daten aus und verursacht Flächenschaden.

### **3.4 Phase 4: Nacht (Die Nachwehen) \[22:00 – 06:00\]**

**Event: Die Säuberung**

* **UI-Shift:** Um 20:00:00 wechselt die Uhr auf Royal Blue (\#4169E1) mit einem pulsierenden Leuchteffekt.1  
* **Entitäten-Management:** Der „Mob“ wird despawnt oder verhaftet. Die Spawn-Logik wechselt auf „Forensik“ und „Reinigungstrupps“. Leichensäcke werden physikalisch korrekt abtransportiert.  
* **Performance-Reset:** Eine aggressive Garbage Collection läuft in dieser Phase geringerer Intensität, um ungenutzte Assets (Texturen, Meshes) aus dem GPU-Speicher zu entfernen und Lecks zu verhindern.1

## **4\. Fortgeschrittene NPC- und Crowd-KI-Architektur**

Das Projekt lehnt generisches Massenrauschen ab zugunsten individueller Handlungsfähigkeit (Agency). Dies erfordert eine ausgefeilte KI-Architektur, die auf **Behavior Trees (Verhaltensbäumen)** und **Utility AI** basiert.3

### **4.1 Die Implementierung der Verhaltensbäume (Behavior Trees)**

Jeder NPC operiert auf einem modularen Behavior Tree (BT). Das Master-Prompt spezifiziert die Verwendung von **Blackboards** zum Datenaustausch.1

**Struktur des NPC\_Protester\_BT:**

1. **Wurzel-Selektor:**  
   * **Prioritäts-Sequenz (Selbsterhaltung):** Wenn Health \< 20% ODER PerceivedThreat \> 80, führe Flee\_Behavior aus.  
   * **Sequenz (Interaktion):** Wenn NearbyNPC übereinstimmt mit Friend\_ID, führe Greet\_Animation (Handschlag/Umarmung) aus.  
   * **Sequenz (Protest):** Wenn InZone(Protest\_Area) UND HasSign \== True, führe Hold\_Sign\_Idle mit Chant\_Loop aus.  
   * **Fallback (Wandern):** Führe Wander\_Randomly innerhalb der definierten NavMesh-Grenzen aus.1

**Optimierung für 500+ Agenten:**

Standard-Verhaltensbäume können CPU-intensiv sein. Um dies für 500+ Agenten zu optimieren:

* **LOD für KI (Level of Detail):** NPCs, die weiter als 50 Meter von der Kamera entfernt sind, werten ihren BT nicht alle 100ms (10Hz) aus. Stattdessen wechseln sie in einen vereinfachten „Crowd Flow“-Zustand und aktualisieren nur alle 500ms (2Hz).  
* **GPU Compute Crowds:** Für das „Massenansturm“-Event (10:00:00), bei dem hunderte Agenten spawnen, nutzt das System WebGPU Compute Shaders, um Geschwindigkeitsfelder und Kollisionsvermeidung (Boids-Algorithmus) zu berechnen, wodurch Positionsaktualisierungen von der CPU auf die GPU verlagert werden.2

### **4.2 Individualisierung und Spawn-Logik**

NPCs sind keine Klone; sie werden über ein „genetisches“ Attributsystem konstruiert.1

* **Attribut-Vektoren:**  
  * Speed: 3,2 m/s (Jogger) bis 1,0 m/s (Rentner).  
  * Bravery: 0,0 bis 1,0 (Bestimmt Fluchtschwelle).  
  * Aggression: 0,0 bis 1,0 (Bestimmt Wahrscheinlichkeit, die Polizei anzugreifen).  
* **Spawn-Wellen:**  
  * **06:00 Welle:** „Frühaufsteher“ (15 NPCs). Hohe Speed (Jogger), niedrige Aggression.  
  * **10:00 Welle:** „Massenansturm“. Spawns folgen einer gewichteten Verteilung: 25% von U-Bahn Nord, 15% von Westplatz. Dies verhindert Engpässe an einem einzelnen Spawn-Punkt.

### **4.3 Soziale Interaktion und Deeskalationsmechaniken**

Um die Lücke im Quellenmaterial bezüglich der Deeskalation zu schließen 1, wird das folgende System architektonisch festgelegt:

**Die Dialog- & Beziehungs-Engine:**

* **Beziehungsmetrik:** Jeder NPC unterhält einen RelationshipScore (-100 bis \+100) relativ zum Spieler (Polizei).  
  * \-100 \= Gewalttätige Feindseligkeit.  
  * 0 \= Neutral.  
  * \+100 \= Kooperativ.  
* **Interaktions-Raycast:** Wenn der Spieler einen NPC fokussiert und „Sprechen“ auslöst, ruft ein Raycast die spezifische ID des NPCs ab.  
* **Emotionsvektor:** Die KI berechnet den aktuellen EmotionVector basierend auf:  
  * GlobalTension (Weltzustand).  
  * PersonalSafety (Ist der NPC in Gefahr?).  
  * RecentInteractions (Hat der Spieler kürzlich Gewalt in der Nähe angewendet?).  
* **Dialogbaum-Logik:**  
  * *Spieler-Option:* „Beruhigen“ \-\> *Prüfung:* RelationshipScore \> \-20?  
  * *Ergebnis Erfolg:* RelationshipScore \+= 10, NPC wechselt in Listen\_State.  
  * *Ergebnis Fehlschlag:* RelationshipScore \-= 10, NPC wechselt in Shout\_State.

Dieses System stellt sicher, dass „Deeskalation“ ein Gameplay-Loop ist, nicht nur ein Tastendruck. Der Spieler muss „soziales Kapital“ mit der Menge aufbauen, um Ausschreitungen zu verhindern.

### **4.4 Mission: Staatsfeind Nr. 1**

Diese spezielle Mission fügt eine Ebene der verdeckten Ermittlung hinzu.

* **Generierung:** Der Ziel-NPC (Alias Viktor Kessler) wird als einer von hunderten Demonstranten generiert, jedoch mit versteckten Markern.  
* **Intel-System:** Der Spieler erhält fragmentierte Hinweise (z.B. „Trägt schwarze Kappe“, „Hat Bluetooth-Ohrstecker“).  
* **Erkennungsmechaniken:**  
  * **Kamerasystem:** Drohnenüberwachung mit KI-Gesichtserkennung.  
  * **Wärmebild:** Identifiziert versteckte Waffen (Kälte-Signatur von Stahl am Körper) oder erhöhte Körpertemperatur (Stress).  
  * **Akustik:** Richtmikrofone filtern einzelne Stimmen aus dem Umgebungslärm, um Akzente oder Schlüsselwörter zu erkennen.  
* **Zugriff:** Sobald identifiziert, muss der Zugriff erfolgen. Das Timing ist entscheidend. Ein Zugriff inmitten der Menge triggert sofortige Eskalation. Der Spieler muss warten, bis das Ziel sich absondert (z.B. für ein Telefonat), um einen „sauberen Zugriff“ ohne Crowd-Awareness durchzuführen.

## **5\. Visuelles Rendering und WebGPU-Implementierung**

Die visuelle Treue stützt sich auf eine Deferred Rendering Pipeline, die über **WebGPU** implementiert wird, was Funktionen ermöglicht, die in WebGL unmöglich wären.5

### **5.1 Die 4-Pass Render-Pipeline**

1. **Geometry Pass (G-Buffer):** Rendert Szenengeometrie in mehrere Render-Targets (Albedo, Normal, Position, Roughness/Metallic). Dies trennt Beleuchtungsberechnungen vom Geometrie-Rendering und ermöglicht hunderte dynamische Lichter.1  
2. **Lighting Pass (Accumulation):** Ein Compute Shader liest den G-Buffer und berechnet die Beleuchtung für alle 100+ Lichtquellen in einem einzigen Durchgang. Dies umfasst die Sonne (Directional), Straßenlaternen (Point) und Bengalos (Dynamic Point).  
3. **Post-Processing Pass:** Wendet Vollbild-Effekte an:  
   * **Bloom:** Schwellenwertbasiertes Leuchten für Sonne und Laternen.  
   * **God-Rays:** Volumetrische Streuung, berechnet durch Ray-Marching gegen den Tiefenpuffer.1  
   * **Color Grading:** Wendet die spezifischen Hex-Codes für die Tageszeit an (z.B. Verschiebung des Gammas in Richtung Blau \#4169E1 bei Nacht).  
4. **UI Overlay Pass:** Rendert die 120x50px Digitaluhr und Dialogblasen über der 3D-Szene.1

### **5.2 Level of Detail (LOD) Strategie**

Um 60 FPS bei hoher Wiedergabetreue zu halten, wird ein striktes 5-Stufen-LOD-System durchgesetzt 1:

* **LOD 0 (Ultra High):** Distanz \< 10m. Volle Geometrie, Gesichtsmorph-Ziele aktiv, Stoffsimulation aktiviert.  
* **LOD 1 (High):** 10m \- 30m. Reduzierte Polygonanzahl, vereinfachte Shader.  
* **LOD 2 (Medium):** 30m \- 100m. Skelettanimation vereinfacht (weniger Knochen aktualisiert).  
* **LOD 3 (Low):** 100m \- 300m. Statisches Mesh oder Impostors.  
* **LOD 4 (Billboard):** \> 300m. 2D-Sprite-Repräsentationen.

### **5.3 Prozedurale Weltgenerierung (Die Wien-Engine)**

Die Umgebung ist kein statisches Mesh, sondern eine prozedural gestreamte Entität.1

* **Chunk Streaming:** Die Stadt ist in Raster-Chunks unterteilt. Nur Chunks innerhalb eines definierten Radius um den Spieler werden in den Speicher geladen.  
* **Architekturstile:** Der Generator wählt aus Asset-Pools („Gründerzeit“, „Modern“, „Barock“), um Gebäudefassaden zu konstruieren, wodurch sichergestellt wird, dass die Ästhetik dem Wiener Setting entspricht.1

## **6\. Physik und Physikalische Interaktionsarchitektur**

Während Jolt Physics das Rückgrat bildet, sind spezifische Anpassungen für die einzigartigen Anforderungen des Projekts erforderlich, insbesondere in Bezug auf Soft Bodies und Stoff.7

### **6.1 Starrkörperdynamik (Jolt-Integration)**

* **Charakter-Controller:** NPCs werden durch Kapselformen repräsentiert, um eine effiziente Kollisionserkennung zu gewährleisten. Ein benutzerdefinierter CharacterVirtual-Controller ist implementiert, um Stufenhöhen (Bordsteine) und Steigungen (Wiener Gelände) geschmeidig zu bewältigen.1  
* **Kollisionsmatrix:** Eine umfassende Matrix definiert Interaktionsregeln:  
  * *Spieler* kollidiert mit *Welt*, *NPC*, *Fahrzeug*.  
  * *NPC* kollidiert mit *Welt*, *Spieler*, *Fahrzeug*.  
  * *Kamera* ignoriert *NPC* (um Clipping zu verhindern), kollidiert mit *Welt* (um hineinzuzoomen).1

### **6.2 Fortgeschrittene Stoff- und Soft-Body-Simulation**

Die Quellenanalyse zeigt, dass die Soft-Body-Unterstützung von Jolt experimentell ist.8 Daher wird ein hybrider Ansatz spezifiziert:

* **Flaggen und Banner:** Implementiert mittels **Verlet-Integration** auf der GPU (Compute Shaders) anstelle von Jolts CPU-Soft-Bodies. Die Simulation liest den GlobalWindVector und wendet Kräfte auf das Gitter der Vertices an, die den Stoff repräsentieren. Dies ermöglicht tausende Flaggen ohne CPU-Engpässe.10  
* **Interaktionen:** NPCs halten Flaggen mittels **Inverse Kinematics (IK)**. Der Handknochen ist der „Anker“ für die Stoffsimulation. Bewegt sich der NPC, bewegt sich der Anker, und der Stoff reagiert physikalisch auf die Trägheit.1  
* **Tränengas-Simulation:** Das Tränengas wird nicht als einfache Textur, sondern als **Fluid-Simulation** (basierend auf Smoothed Particle Hydrodynamics \- SPH) im WebGPU Compute Shader berechnet. Dies erlaubt dem Gas, sich realistisch um Hindernisse zu legen und durch Gassen zu fließen.10

## **7\. Das Immersive Audio-Ökosystem**

Audio ist nicht bloß Ausgabe; es ist eine Simulationsschicht. Das System nutzt eine „Wellenausbreitungs“-Logik für Okklusion und Propagation.12

### **7.1 Geschichtete Audio-Architektur**

* **Layer 0 (Ambient Base):** Loops wie morning\_ambient\_city.wav. Die Lautstärke wird durch die globale Zustandsmaschine gesteuert (z.B. Ausblenden während des 12:00 Ultimatums).  
* **Layer 1 (Räumliche Details):** One-Shot-Sounds (Vögel, Schritte). Diese nutzen 3D-Positionierung.  
  * *Doppler-Effekt:* Aktiviert für sich schnell bewegende Quellen (Vögel, Fahrzeuge).  
* **Layer 2 (Events):** Hochpriorisierte Trigger (Kirchenglocken). Diese umgehen einige Okklusionsfilter, um sicherzustellen, dass sie stadtweit gehört werden.1

### **7.2 Okklusion und Propagation (Lückenschluss)**

Um das Fehlen detaillierter Okklusionsspezifikationen in den Snippets zu adressieren, wird der folgende Algorithmus mandatiert:

* **Raycast-Okklusion:** Alle 100ms wird ein Strahl vom Audio-Hörer (Spieler) zu aktiven Schallquellen geworfen.  
* **Materialfilterung:** Trifft der Strahl auf Geometrie (z.B. eine Wand), prüft das System den Materialtyp (Beton, Glas, Holz).  
* **Tiefpassfilter (LPF):** Basierend auf der Materialdichte wird ein Tiefpassfilter auf den Sound angewendet. Beton wendet einen starken Cutoff an (dämpft hohe Frequenzen), während Glas einen leichteren Cutoff anwendet. Dies simuliert Schall, der *durch* oder *um* Hindernisse herumgeht.13

## **8\. Master Control & Qualitätssicherungsprotokoll**

Um sicherzustellen, dass das System als kohärente Einheit funktioniert, wird ein strenges Validierungsprotokoll etabliert.

### **8.1 Vertikale Validierung (Der Drill-Down)**

* **Architektur-Check:** Verifiziere, dass die /src-Ordnerstruktur dem Bauplan entspricht (Trennung von Core, Systems, Render, AI). Keine zirkulären Abhängigkeiten erlaubt.  
* **Komponenten-Check:** Stelle sicher, dass alle React-Komponenten PascalCase verwenden und alle Logiken in Hooks/Utils (camelCase) liegen.  
* **Typsicherheit:** tsconfig.json muss Ultra-Strict sein. Keine any-Typen. Alle Funktionen müssen explizite Rückgabetypen haben.1

### **8.2 Horizontale Validierung (Querschnittsthemen)**

* **Leistungsbudget:**  
  * Render-Zeit \< 16ms (60 FPS).  
  * Physik-Zeit \< 8ms (120 Hz).  
  * Speichernutzung \< 4GB (Browser-Limit-Sicherheit).  
* **Sicherheit:** Input-Sanitization für alle textbasierten Befehle (Deeskalationsdialog).  
* **Datenfluss:** Verifiziere, dass der GlobalState korrekt an das RenderSystem (z.B. Zeitänderungen aktualisieren Skybox) und PhysicsSystem (z.B. Zeitänderungen aktualisieren Wind) propagiert.1

## **9\. Konklusion**

Die in diesem Bericht definierte Architektur transformiert „Corona Control Ultimate“ von einem Konzept in eine produktionsreife Ingenieursspezifikation. Durch die rigorose Definition des **Zeitsystems** als Herzschlag der Simulation, die Entkopplung der **Physik-** und **Render**\-Loops für Stabilität und die Nutzung von **WebGPU Compute Shaders** für massenskalierte KI- und Stoffsimulationen kann das Projekt das versprochene „Hyper-Detail“ erreichen.

Die Einbeziehung der fehlenden **Deeskalationsmechaniken** und **Physik-/Wetterinteraktionen** stellt sicher, dass die Simulation nicht nur ein visuelles Spektakel ist, sondern ein tief interaktives System, in dem die Handlungsfähigkeit des Spielers (durch Dialog und Taktik) das deterministische Chaos des 24-Stunden-Zyklus tatsächlich beeinflusst. Dieses Dokument dient als der finale, autoritative Leitfaden für das Implementierungsteam.

# ---

**Technischer Anhang: Detaillierte Implementierungsdirektiven**

## **A. Verzeichnisstruktur-Mandat**

Um die architektonische Integrität zu gewährleisten, muss die Projektstruktur strikt folgendem Schema entsprechen 1:

/src  
  /core          \# Engine-Loop, Zustandsmanagement, Physik-Initialisierung  
  /systems       \# Die 25 Gameplay-Systeme (Verkehr, Crowd, Wetter, etc.)  
  /rendering     \# WebGPU-Pipeline, Shader-Pässe, Post-Processing  
  /ai            \# Behavior Trees, GOAP, Blackboard-Definitionen  
  /world         \# Wien-Generator, Chunk-Streaming-Logik  
  /ui            \# Uhr, Dialog, HUD-Overlay  
  /utils         \# mathematische Helfer, Datenformatierer  
  /types         \# TypeScript-Interfaces und Typdefinitionen  
  /assets        \# Modelle, Texturen, Audio-Dateien  
  /shaders       \# WGSL-Shader-Code

## **B. Die „Ultrastrict“ TypeScript-Konfiguration**

Die tsconfig.json muss die folgenden Compiler-Optionen erzwingen, um Code-Robustheit zu garantieren 1:

* "strict": true  
* "noImplicitAny": true  
* "strictNullChecks": true  
* "noUnusedLocals": true  
* "noUnusedParameters": true  
* "exactOptionalPropertyTypes": true

## **C. Shader-Transitionstabelle (Phase 1: Morgen)**

Präzises Parameter-Mapping für den Übergang um 06:00:00.1

| Zeit (Real Sek) | Sonnen-Elevation | Directional Lux | Nebeldichte | Straßenlaternen | Audio Layer 0 |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **0,0s** | \-18° | 0 | 0,008 | AN (800lm) | \-12 dB |
| **1,0s** | \-12° | 50 | 0,008 | AN | \-15 dB |
| **2,0s** | \-6° | 500 | 0,007 | AN | \-18 dB |
| **3,0s** | \-3° | 2.000 | 0,006 | Flacker-Sequenz | \-25 dB |
| **4,0s** | 0° (Horizont) | 5.000 | 0,005 | AUS | \-Inf |
| **5,0s** | \+3° | 15.000 | 0,004 | AUS | \-Inf |

Diese Tabelle repräsentiert die unveränderliche „Wahrheit“ für die Interpolationslogik der Engine während des Sonnenaufgangs-Events. Alle Systeme (Audio, Visuell, Physik) müssen von dieser zentralen Zustandstabelle lesen, um perfekte Synchronisation zu gewährleisten.

#### **Referenzen**

1. CORONA CONTROL ULTIMATE \- KOMPLETTES 24-STUNDEN EVENT.txt  
2. Real-time Position-Based Crowd Simulation in WebGPU \- GitHub, Zugriff am Januar 28, 2026, [https://github.com/wayne-wu/webgpu-crowd-simulation](https://github.com/wayne-wu/webgpu-crowd-simulation)  
3. Advanced AI Programming for Adaptive NPC Behavior | by Argentics \- Medium, Zugriff am Januar 28, 2026, [https://medium.com/@argentics/advanced-ai-programming-for-adaptive-npc-behavior-91bad6236f95](https://medium.com/@argentics/advanced-ai-programming-for-adaptive-npc-behavior-91bad6236f95)  
4. Enemy Patrol \- Advanced AI \- Unreal Engine 5 \- YouTube, Zugriff am Januar 28, 2026, [https://www.youtube.com/watch?v=EUNZ9y\_jO2w](https://www.youtube.com/watch?v=EUNZ9y_jO2w)  
5. WebGPU — From Ping Pong WebGL To Compute Shader 🖥️ | by Phish Chiang \- Medium, Zugriff am Januar 28, 2026, [https://medium.com/phishchiang/webgpu-from-ping-pong-webgl-to-compute-shader-%EF%B8%8F-1ab3d8a461e2](https://medium.com/phishchiang/webgpu-from-ping-pong-webgl-to-compute-shader-%EF%B8%8F-1ab3d8a461e2)  
6. Threejs WebGPU Post Processing with React Three Fiber \- YouTube, Zugriff am Januar 28, 2026, [https://www.youtube.com/watch?v=BvmFEHxQyVA](https://www.youtube.com/watch?v=BvmFEHxQyVA)  
7. jrouwe/JoltPhysics: A multi core friendly rigid body physics and collision detection library. Written in C++. Suitable for games and VR applications. Used by Horizon Forbidden West and Death Stranding 2\. \- GitHub, Zugriff am Januar 28, 2026, [https://github.com/jrouwe/JoltPhysics](https://github.com/jrouwe/JoltPhysics)  
8. Architecture of Jolt Physics \- GitHub Pages, Zugriff am Januar 28, 2026, [https://jrouwe.github.io/JoltPhysics/](https://jrouwe.github.io/JoltPhysics/)  
9. Soft body support · Issue \#390 · jrouwe/JoltPhysics \- GitHub, Zugriff am Januar 28, 2026, [https://github.com/jrouwe/JoltPhysics/issues/390](https://github.com/jrouwe/JoltPhysics/issues/390)  
10. Constraint-based cloth simulation on WebGPU compute shaders \- Reddit, Zugriff am Januar 28, 2026, [https://www.reddit.com/r/webgpu/comments/1qelp0j/constraintbased\_cloth\_simulation\_on\_webgpu/](https://www.reddit.com/r/webgpu/comments/1qelp0j/constraintbased_cloth_simulation_on_webgpu/)  
11. Particles, Progress, and Perseverance: A Journey into WebGPU Fluids \- Codrops, Zugriff am Januar 28, 2026, [https://tympanus.net/codrops/2025/01/29/particles-progress-and-perseverance-a-journey-into-webgpu-fluids/](https://tympanus.net/codrops/2025/01/29/particles-progress-and-perseverance-a-journey-into-webgpu-fluids/)  
12. GSOUND: INTERACTIVE SOUND PROPAGATION FOR GAMES \- GAMMA, Zugriff am Januar 28, 2026, [http://gamma.cs.unc.edu/GSOUND/gsound\_aes41st.pdf](http://gamma.cs.unc.edu/GSOUND/gsound_aes41st.pdf)  
13. Dynamic Audio Occlusion: Elevating Immersion in Indie Games \- Wayline, Zugriff am Januar 28, 2026, [https://www.wayline.io/blog/dynamic-audio-occlusion-indie-games](https://www.wayline.io/blog/dynamic-audio-occlusion-indie-games)  
14. Any fellow game-audio nerds out there? (Real-time audio occlusion and diffraction simulation in UE4) : r/gamedev \- Reddit, Zugriff am Januar 28, 2026, [https://www.reddit.com/r/gamedev/comments/4420me/any\_fellow\_gameaudio\_nerds\_out\_there\_realtime/](https://www.reddit.com/r/gamedev/comments/4420me/any_fellow_gameaudio_nerds_out_there_realtime/)