// Initialize Leaflet map
const map = L.map('map').setView([51.96236, 7.62571], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Only allow markers and polygons
let drawControl = new L.Control.Draw({
  draw: {
    rectangle: true,
    polygon: true,
    circle: false,
    circlemarker: false,
    marker: false,
    polyline: false,
  }
});
map.addControl(drawControl);

// Event handler for when a shape is drawn
map.on('draw:created', function(event) {
  let layer = event.layer;

  // Add the drawn shape to the map
  map.addLayer(layer);

  // Check if the drawn shape is a polygon
  if (layer instanceof L.Polygon) {
    // Get the coordinates of the polygon's center
    let center = layer.getBounds().getCenter();

  // Get the coordinates of the polygon
  let coordinates = layer.getLatLngs()[0]; // Assuming it's a simple polygon, getLatLngs returns an array of LatLng

  // Convert coordinates to a string for display
  let coordinatesString = coordinates.map(coord => `[${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}]`).join(', ');

  // Open a popup at the center of the polygon with coordinates
  layer.bindPopup(`Polygon Coordinates: ${coordinatesString}`).openPopup();
}
});


// Event listener for when a GeoJSON file is uploaded
document.getElementById('geojson-file-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
      const geojsonData = JSON.parse(event.target.result);

      // Clear existing layers before adding new ones
      drawnItems.clearLayers();

      // Add GeoJSON to the map
      L.geoJSON(geojsonData, {
          onEachFeature: function (feature, layer) {
              if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                  // Assuming the GeoJSON contains polygons or multipolygons
                  drawnItems.addLayer(layer);

                  // Open a popup with date input fields for the time range
                  layer.bindPopup(`
                      <label for="start-date">Start Date:</label>
                      <input type="date" id="start-date"><br>
                      <label for="end-date">End Date:</label>
                      <input type="date" id="end-date"><br>
                      <button onclick="saveTime()">Save Time</button>
                  `).openPopup();
              }
          }
      }).addTo(map);
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
  
  // Function to visualize data on the map
  function visualizeData() {
    const resolution = document.getElementById('resolution-slider').value;
    
    // data on the map based on the selected resolution
    console.log('Visualizing data with resolution:', resolution);
  }
  
  // Function to save data
  function saveData() {
    const inputData = document.getElementById('data-input').value;
    // save the data
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
  