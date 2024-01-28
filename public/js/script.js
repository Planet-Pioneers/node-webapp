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




let job = {
  "date": "",
  "coordinates": [],
  "resolution": 30
}
















// Initialize Leaflet map
const map = L.map('map').setView([51.96236, 7.62571], 15);
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

// Event listener for when a GeoJSON file is uploaded
document.getElementById('geojson-file-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    geojsonData = JSON.parse(event.target.result);
    // Add GeoJSON to the map and the allLayers array
    const geoJsonLayer = L.geoJSON(geojsonData).addTo(map);
    allLayers.push(geoJsonLayer);

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

// Function to save time range
function saveTime() {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;

  // You can save the start and end dates or perform any other action with them
  console.log('Start Date:', startDate);
  console.log('End Date:', endDate);

  // Close the popup after saving
  map.closePopup();

  //save time in job variable
  job.date = startDate;
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

// Event listener for the visualization button
/* document.getElementById('resolution-slider').addEventListener('change', function () {
  visualizeData();
});
 */
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



// Function to handle the "Train New Model" button click
function trainNewModel() {
  document.getElementById('training-data-section').style.display = 'block';
}

// Initially display
showSection('upload-section');

// Function to display the respective section
function showSection(sectionId) {
  // Display the selected section
  const selectedSection = document.getElementById(sectionId);
  if (selectedSection) {
    selectedSection.style.display = 'block';
  }
}

// Function for the "Continue" button in the "Confirmation of Area" section
function confirmArea() {
  if (Object.keys(drawnItems._layers).length == 1 && job.date != "") {
    showSection('algorithm-section');
    let coordinates = Object.values(drawnItems._layers)[0]._latlngs[0];
    let arrayOfArrays = coordinates.map(obj => [obj.lat, obj.lng]);
    job.coordinates = arrayOfArrays;
    console.log(job);
  }

}

// Function for the "Calculate" button in the "Calculation Section"
async function startDownload(calc) {
  showSection('download-section');
  console.log(job)
  let obj = {
    date: job.date,
    coordinates: job.coordinates,
    resolution: job.resolution,
    calculation: calc
  }
  console.log(obj)
  await api_call('jobs', 'POST', "/", obj);
  var url_to_geotiff_file = "../results/result.tif"


  fetch(url_to_geotiff_file)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => {
      parseGeoraster(arrayBuffer).then(georaster => {
        console.log("georaster:", georaster);

        /*
            GeoRasterLayer is an extension of GridLayer,
            which means can use GridLayer options like opacity.

            Just make sure to include the georaster option!

            http://leafletjs.com/reference-1.2.0.html#gridlayer
        */
        var layer = new GeoRasterLayer({
          georaster: georaster,
          opacity: 1
        });
        layer.addTo(map);

        map.fitBounds(layer.getBounds());

      });
    });
}

function showTrainButton() {
  // Hier könnte der Code für den Upload der Trainingsdaten stehen

  // Annahme: Der Upload war erfolgreich
  // Zeige den Button "Modell trainieren" an

}

// Event listener for the "Upload" button
document.getElementById('upload-training-data-btn').addEventListener('click', function () {
  // Code for handling upload functionality
  // ...

  // Show the "Modell trainieren" button
  document.getElementById('train-model-btn').style.display = 'block';
});


function trainModel() {
  // Hier könnte der Code für das Modelltraining stehen

  // Annahme: Das Modelltraining war erfolgreich
  alert('Modell erfolgreich trainiert');
}


function trainManually() {
  // Code für eigenes neues Modell selbst trainieren

  // Annahme: Das manuelle Training war erfolgreich
  alert('Modell erfolgreich trainiert');
}

const resolutionSlider = document.getElementById('resolution-slider');
const resolutionValue = document.getElementById('resolution-value');

// Mapping values to resolutions
const resolutions = {
  1: { label: '200 Meter pro Pixel', resolution: 200 },
  2: { label: '170 Meter pro Pixel', resolution: 170 },
  3: { label: '150 Meter pro Pixel', resolution: 150 },
  4: { label: '130 Meter pro Pixel', resolution: 130 },
  5: { label: '110 Meter pro Pixel', resolution: 110 },
  6: { label: '90 Meter pro Pixel', resolution: 90 },
  7: { label: '70 Meter pro Pixel', resolution: 70 },
  8: { label: '50 Meter pro Pixel', resolution: 50 },
  9: { label: '30 Meter pro Pixel', resolution: 30 },
  10: { label: '10 Meter pro Pixel', resolution: 10 }
};

// Event listener for slider changes
resolutionSlider.addEventListener('input', function () {
  const value = parseInt(resolutionSlider.value);
  const selectedResolution = resolutions[value];
  job.resolution = (selectedResolution.resolution)


  // Update the displayed resolution value
  resolutionValue.textContent = selectedResolution.label;
});