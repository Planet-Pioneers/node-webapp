/**
 * 
 * @param {*} collection - routes/jobs
 * @param {*} method - one of the methods provided for the collections routes
 * @param {*} route - one of the routes also provided in the collections routes
 * @param {*} body - if necessary a body 
 * @returns - data or error
 */
async function api_call(collection, method, route, body) {
    try {
      const response = await fetch(`/api/${collection}` + route, {
        method: method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
  
      if (!response.ok) {
        let errorMessage = `API request failed with status: ${response.status}`;
        let responseBody = null;
  
        try {
          // Try to parse the response body as JSON to get an error message
          responseBody = await response.json();
          if (responseBody.message) {
            errorMessage = responseBody.message;
            alert(errorMessage);
          }
        } catch (jsonError) {
          // If parsing as JSON fails, use the default error message
        }
  
        throw new Error(errorMessage);
      }
  
      const data = await response.json();
      return data; // Return the JSON data received from the API
    } catch (error) {
      throw error;
    }
  }
  
  
  let trainingdata;
  
  let job = {
    "date": "",
    "coordinates": [],
    "resolution": 30
  }
  
  
  // Initialize Leaflet map
  const map = L.map('map').setView([51.96236, 7.62571], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  
  // Variables to store drawn layers
  let drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  
  // Initialize an array to store drawn and GeoJSON layers
  let allLayers = [];
  
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
      // Add the drawn layer to the map and the allLayers array
      drawnItems.addLayer(layer);
      allLayers.push(layer);
  
      // Show the popup for the drawn layer
      drawPopup(layer);
    }
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
  
        // Open a popup with input fields for ID and Category
        layer.bindPopup(`
          <label for="area-id">Area ID:</label>
          <input type="text" id="area-id"><br>
          <label for="area-category">Area Category:</label>
          <input type="text" id="area-category"><br>
          <p>Layer Coordinates: ${coordinatesString}</p>
          <button onclick="saveArea()">Save Area</button>
          <button onclick="deleteLayer()">Delete</button>
        `).openPopup();
      }
    }
  }
  
  // Function to handle Save Area button click
  function saveArea() {
    const selectedLayer = map._popup._source; // Get the layer associated with the popup
    const areaId = document.getElementById('area-id').value;
    const areaCategory = document.getElementById('area-category').value;
  
    if (areaId && areaCategory) {
      // Save the ID and Category to the layer (you can modify this part based on your requirements)
      selectedLayer.areaId = areaId;
      selectedLayer.areaCategory = areaCategory;
  
      // Close the popup after saving
      map.closePopup();
    } else {
      alert('Please enter both Area ID and Area Category before saving.');
    }
  }
  
  
  // Function to handle delete button click
  function deleteLayer() {
    const selectedLayer = map._popup._source; // Get the layer associated with the popup
    if (selectedLayer) {
      // Check if the selected layer is from drawnItems or a GeoJSON layer
      if (drawnItems.hasLayer(selectedLayer)) {
        drawnItems.removeLayer(selectedLayer);
      } else {
        // Handle GeoJSON layer deletion
        map.removeLayer(selectedLayer);
  
        // Remove the layer from the allLayers array
        const index = allLayers.indexOf(selectedLayer);
        if (index !== -1) {
          allLayers.splice(index, 1);
        }
      }
    }
  
    map.closePopup(); // Close the popup after deletion
  }
  
  function confirmArea() {
    window.location.href = "classify.html";
}
