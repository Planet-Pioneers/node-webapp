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

// Event listener for when a GeoJSON file is uploaded
document.getElementById('geojson-file-input').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();
  
    reader.onload = function (event) {
      geojsonData = JSON.parse(event.target.result);
    };
  
    reader.readAsText(file);
  });