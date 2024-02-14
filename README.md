# Earth Classifier: Web-Tool für die überwachte Klassifikation von Erdbeobachtungsdaten in OpenEO
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

Klonen Sie das Repository auf Ihr lokales System und führen folgenden Befehl aus

```bash
Docker-compose up 
```
Öffnen Sie die Website in ihrem browser auf localhost:3000/

## Verwendung
**1. Schritt:** Auswahl des Interessensgebiets in der Karte durch Einzeichnen eines Rechtecks, alternativ: Upload oder Textfeld<br>
**2. Schritt:** Bereits trainiertes Model auswählen oder neues Model trainieren<br>
**3. Schritt:** Datum auswählen und speichern <br>
**4. Schritt:** Auswahl der Auflösung <br>
**5. Schritt:** Berechnung starten (classification) oder wolkenfreies Echtfarbkomposit berechnen<br>
**6. Schritt:** Berechnetes Ergebnis (.tif) oder model (.rds) downloaden

## Hinweise
- Das ausgewählte Datum muss mindestens 4 Wochen in der Vergangenheit liegen um monatliche Aggregation berechnen zu können (3. Schritt)
- Trainigsdaten (labelled Polygons) sind als GeoJSON in folgender Struktur hochzuladen: (1. Schritt)
    - type: FeatureCollection
    - crs: { "type": "name", "properties": { "name": CRS } }
    - features : [
      - properties: { Label: mylabel }, geometry: { type: Polygon, coordinates: [[[ ... ]]] }
     ]
- Verfügbare crs für trainingsdaten: EPSG:32632, EPSG:4326, EPSG:4269, EPSG:3857
- Bei Berechnungen  die länger als 5 Minuten dauern, bricht bei uns die Server-connection ab, wenn der Server auf AWS läuft
- Wenn ein Zeitraum und Ort ausgewählt wird, wird ein stac call gemacht, um sicherzustellen, dass es genug passenden Satellitenbilder gibt, jedoch stimmt das Ergebnis aus unserem stac call nicht mit dem openeocubes stac call überein. Wenn also openeocubes keine Bilder findet, wird ein Error geworfen, der im Frontend nicht gecatched wird und die Berechnung bricht ab  

## Verwendete Technologien
Frontend:
- HTML/CSS (Framework Bootstrap/ Einbindung von Libraries in classify.html)
- Javascript (Leaflet)

Backend:
- R
- OpenEO (Lizenz: Apache. 2.0)

Organisation:
- GitHub


## Entwickler*innen des Projektes
Planet Pioneers <br>
Simon Schröder, Arne Wilberg, Inka Hatesohl, Sonja Becker, Elena Glaser <br>
Heisenbergstraße 2
48149 Müntser

