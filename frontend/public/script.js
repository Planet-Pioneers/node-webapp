// Initialize Leaflet map
const map = L.map('map').setView([51.96236, 7.62571], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Variables to store drawn layers
let drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Only allow polygons and rectangles
let drawControl = new L.Control.Draw({
  draw: {
    rectangle: true,
    polygon: true,
    circle: false,
    circlemarker: false,
    marker: false,
    polyline: false,
  },
  edit: {
    featureGroup: drawnItems,
    remove: true, // Allow removal of drawn items
  }
});
map.addControl(drawControl);

// Function to handle draw events
map.on('draw:created', function (e) {
  const type = e.layerType;
  const layer = e.layer;

  if (type === 'polygon' || type === 'rectangle') {
    // Add the drawn layer to the map
    drawnItems.addLayer(layer);

    // Show the popup for the drawn layer
    drawPopup(layer);
  }
});

// Event listener for when a GeoJSON file is uploaded
document.getElementById('geojson-file-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    geojsonData = JSON.parse(event.target.result);
    // Add GeoJSON to the map
    const geoJsonLayer = L.geoJSON(geojsonData).addTo(map);

    // Show the popup for the GeoJSON layer
    drawPopup(geoJsonLayer);
  };

  reader.readAsText(file);
});

// Function to draw popup for a layer
function drawPopup(layer) {
  if (layer instanceof L.LayerGroup) {
    // Handle a LayerGroup (GeoJSON with multiple features)
    layer.eachLayer(function (subLayer) {
      drawPopup(subLayer);
    });
  } else {
    // Check if the layer is a polygon or rectangle
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      // Get the coordinates of the layer
      const coordinates = layer.getLatLngs()[0];
      // Convert coordinates to a string for display
      const coordinatesString = coordinates.map(coord => `[${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}]`).join(', ');

      // Open a popup with date input fields and layer coordinates
      layer.bindPopup(`
        <label for="start-date">Start Date:</label>
        <input type="date" id="start-date"><br>
        <label for="end-date">End Date:</label>
        <input type="date" id="end-date"><br>
        <p>Layer Coordinates: ${coordinatesString}</p>
        <button onclick="saveTime()">Save Time</button>
        <button onclick="deleteLayer()">Delete</button> <!-- Add delete button -->
      `).openPopup();
    }
  }
}

// Function to handle delete button click
function deleteLayer() {
  const selectedLayer = map._popup._source; // Get the layer associated with the popup
  if (selectedLayer) {
    if (drawnItems.hasLayer(selectedLayer)) {
      drawnItems.removeLayer(selectedLayer);
    } else {
      map.removeLayer(selectedLayer);
    }
  }
  map.closePopup(); // Close the popup after deletion
}

// Event listener for when a GeoJSON file is uploaded
document.getElementById('geojson-file-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    geojsonData = JSON.parse(event.target.result);
    // Add GeoJSON to the map
    L.geoJSON(geojsonData).addTo(map);
  };

  reader.readAsText(file);
});

// Event listener for the visualization button
document.getElementById('resolution-slider').addEventListener('change', function () {
  visualizeData();
});

// Function to upload GeoJSON
function uploadGeoJSON() {
  // You can add logic here to send the GeoJSON data to the server
  console.log('GeoJSON uploaded:', geojsonData);
}

// Function to insert GeoJSON template into the data input field
function insertGeoJSONTemplate() {
  const template = `{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [7.62371, 51.96386],
        [7.62371, 51.96436],
        [7.62521, 51.96436],
        [7.62521, 51.96386],
        [7.62371, 51.96386]
      ]
    ]
  },
  "properties": {}
}`;

  // Insert the template into the data input field
  document.getElementById('data-input').value = template;
}

// Function to save data
function saveData() {
  const inputData = document.getElementById('data-input').value;

  try {
    // Parse the input data as JSON
    const geoJsonData = JSON.parse(inputData);

    // Check if the parsed data has the required structure
    if (
      geoJsonData &&
      geoJsonData.type === 'Feature' &&
      geoJsonData.geometry &&
      (geoJsonData.geometry.type === 'Polygon' || geoJsonData.geometry.type === 'Rectangle') &&
      geoJsonData.geometry.coordinates
    ) {
      // Add GeoJSON to the map
      const geoJsonLayer = L.geoJSON(geoJsonData).addTo(map);

      // Show the popup for the GeoJSON layer
      drawPopup(geoJsonLayer);
    } else {
      console.error('Invalid GeoJSON format. Please enter a valid Polygon or Rectangle GeoJSON.');
    }
  } catch (error) {
    console.error('Error parsing input data as JSON:', error);
  }
}



// Function to handle "Neues Model trainieren" button click
function trainNewModel() {
  // Zeige den Bereich an, wenn der Button geklickt wurde
  document.getElementById('training-data-section').style.display = 'block';
}

