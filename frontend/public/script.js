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
    remove: false,
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

    // Check if the drawn shape is a polygon
    if (layer instanceof L.Polygon) {
      // Get the coordinates of the polygon
      let coordinates = layer.getLatLngs()[0]; // Assuming it's a simple polygon, getLatLngs returns an array of LatLng

      // Convert coordinates to a string for display
      let coordinatesString = coordinates.map(coord => `[${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}]`).join(', ');

      // Open a popup with date input fields and polygon coordinates
      layer.bindPopup(`
        <label for="start-date">Start Date:</label>
        <input type="date" id="start-date"><br>
        <label for="end-date">End Date:</label>
        <input type="date" id="end-date"><br>
        <p>Polygon Coordinates: ${coordinatesString}</p>
        <button onclick="saveTime()">Save Time</button>
      `).openPopup();
    }
  }
});


// Function to save time range
function saveTime() {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;

  // You can save the start and end dates or perform any other action with them
  console.log('Start Date:', startDate);
  console.log('End Date:', endDate);

  // Close the popup after saving
  map.closePopup();
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

// Function to save time range
function saveTime() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // You can save the start and end dates or perform any other action with them
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

    // Close the popup after saving
    map.closePopup();
}

// Function to save data
function saveData() {
    const inputData = document.getElementById('data-input').value;
    // Save the data
    console.log('Data saved:', inputData);
}

// Function to download training data
function downloadTrainingData() {
    // You can add logic here to initiate the download of training data
    console.log('Downloading Training Data');
}

// Function to download prediction
function downloadPrediction() {
    // You can add logic here to initiate the download of prediction data
    console.log('Downloading Prediction');
}