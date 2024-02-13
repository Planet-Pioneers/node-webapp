# Earth Classifier: Web- Toll für die überwachte Klassifikation von Erdbeobachtungsdaten in OpenEO
## Zielsetzung des Projekts
Satelliten sammeln viele verschiedene Informationen über die Erde (z.B. über die Landnutzung).
Dabei entstehen riesige Mengen an Daten. Um diese zu verarbeiten, bietet es sich an MLAlgorithmen zu nutzen.
Um Luftbilder mit einen ML-Algorithmus zu klassifizieren, muss dieser zunächst trainiert
werden. Dafür wird der Algorithmus mit Trainingsdaten gefüttert. Diese enthalten ein Luftbild
und die Zuweisung von Bildbereichen zu verschiedenen Landnutzungstypen. Anhand dieser
Informationen erkennt der Algorithmus Muster. Mithilfe der erkannten Muster kann der trainierte
Algorithmus anderen Luftbilder auswerten und klassifizieren.
Der “Earth Classifier” ist ein innovatives Toolkit
für die Klassifizierung von Landnutzungsdaten in der Cloud mithilfe von ML. Zudem visualisiert
er die Ergebnisse der Klassifizierung in einer Karte und stellt sie dem Nutzer über eine
Download-Funktion als GeoTIFF zur Verfügung
## Installation

Klonen Sie das Repository auf Ihrem lokalen System.
Installieren Sie die erforderlichen Abhängigkeiten mit
```bash
npm install
```
Starten Sie die Anwendung mit
```bash
npm start
```
oder
```bash
Docker compose up --build
```
Öffnen Sie die Website in ihrem browser auf localhost:3000/

## Verwendung
**1. Schritt:** Trainiertes Model auswählen <br>
**2. Schritt:** Auswahl des Interessensgebiets in der Karte durch Einzeichnen eines Rechtecks, alternativ: Upload oder Textfeld <br>
**3. Schritt:** Datum auswählen und speichern <br>
**4. Schritt:** Auswahl der Auflösung <br>
**5. Schritt:** Berechnung starten <br>
**6. Schritt:** Download ausführen

## Hinweise
- Das ausgewählte Datum muss mindestens 4 Wochen in der Vergangenheit liegen (3. Schritt)
- Trainigsdaten sind in folgender Struktur hochzuladen: (1. Schritt)
- Je größer das ausgwählte Interssensgebiet, desto länger dauert die Berechnung (2. und 5. Schritt)

## Verwendete Technologien
Frontend:
- HTML/CSS (Framework Bootstrap/ Einbindung von Libraries in classify.html)
- Javascript (Leaflet)

Backend:
- R
- Docker
- MongoDB (Localhost: 27017)
- OpenEO (Lizenz: Apache. 2.0)

Organisation
- GitHub

Entwicklungsumgebung
- Visual Studio Code

## Entwickler*innen des Projektes
Planet Pioneers <br>
Simon Schröder, Arne Wilberg, Inka Hatesohl, Sonja Becker, Elena Glaser <br>
Heisenbergstraße 2
48149 Müntser

