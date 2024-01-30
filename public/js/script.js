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
    polygon: false,
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
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  // Check if both start and end dates are selected
  if (startDate && endDate) {
    // Parse the selected dates
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();

    // Calculate the difference in milliseconds
    const timeDifference = endTimestamp - startTimestamp;

    // Define the maximum allowed duration (4 weeks in milliseconds)
    const maxDuration = 4 * 7 * 24 * 60 * 60 * 1000;

    // Check if the selected duration is within the allowed range
    if (timeDifference <= maxDuration) {
      // Valid time range, you can proceed with saving
      console.log('Start Date:', startDate);
      console.log('End Date:', endDate);

      // Save time in the job variable
      job.date = startDate;

      // Close the popup after saving
      map.closePopup();
    } else {
      // Display an error message to the user
      alert('Please select a time range within a 4-week period.');
    }
  } else {
    // Display an error message if either start or end date is missing
    alert('Please select both start and end dates.');
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
        [7.531695, 51.919142], 
        [7.531695, 51.997845], 
        [7.712970, 51.997845], [7.712970, 51.919142]
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
// Function for the "Continue" button in the "Confirmation of Area" section
function confirmArea() {
  const drawnLayerCount = Object.keys(drawnItems._layers).length;

  if (drawnLayerCount === 1 && job.date !== "") {
    showSection('algorithm-section');
    let coordinates = Object.values(drawnItems._layers)[0]._latlngs[0];
    let arrayOfArrays = coordinates.map(obj => [obj.lat, obj.lng]);
    job.coordinates = arrayOfArrays;
    console.log(job);
  } else {
    // Display an error message if there are not exactly one polygon and a date selected
    if (drawnLayerCount !== 1) {
      alert('Please draw exactly one polygon on the map.');
    }

    if (job.date === "") {
      alert('Please select a date.');
    }
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
  let calculation;
  try {
    const responseData = await api_call('jobs', 'POST', "/", obj);
    console.log("response: ", responseData)
    calculation = responseData.calculation; // This will log the response data to the console
    // You can now use the responseData as needed in your code
  } catch (error) {
    console.error(error); // Handle errors here
  }
  if (calculation == "NDVI") {
    var url_to_geotiff_file = "../results/result.tif"
    // Chroma color scale definition
    const scale = chroma.scale([
      '#640000',
      '#ff0000',
      '#ffff00',
      '#00c800',
      '#006400'
    ]).domain([
      0,
      0.2,
      0.4,
      0.6,
      0.8
    ]);


    fetch(url_to_geotiff_file)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
          console.log("georaster:", georaster);
          var pixelValuesToColorFn = values => {
            const ndviValue = values[0]; // Assuming NDVI is the first band in the GeoTIFF
            return scale(ndviValue).hex();
          };

          /*
              GeoRasterLayer is an extension of GridLayer,
              which means can use GridLayer options like opacity.
  
              Just make sure to include the georaster option!
  
              http://leafletjs.com/reference-1.2.0.html#gridlayer
          */
          var layer = new GeoRasterLayer({
            pixelValuesToColorFn,
            georaster: georaster,
            opacity: 1,
            resolution: 256
          });
          layer.addTo(map);

          map.fitBounds(layer.getBounds());

        });
      });
  } else {
    var url_to_geotiff_file = "../results/composite.tif"


    fetch(url_to_geotiff_file)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
          console.log("georaster:", georaster);
          // Function to map pixel values to colors
          const pixelValuesToColorFn = ([red, green, blue]) => {
            // Adjust these scaling factors based on the actual data range in your bands
            const minRed = georaster.mins[0];
            const maxRed = georaster.maxs[0];;
            const minGreen = georaster.mins[1];;
            const maxGreen = georaster.maxs[1];;
            const minBlue = georaster.mins[2];;
            const maxBlue = georaster.maxs[2];;
          
            // Scale the values to the 0-255 range
            red = Math.round(255 * (red - minRed) / (maxRed - minRed));
            green = Math.round(255 * (green - minGreen) / (maxGreen - minGreen));
            blue = Math.round(255 * (blue - minBlue) / (maxBlue - minBlue));
          
            // Ensure values are within the 0-255 range
            red = Math.min(Math.max(red, 0), 255);
            green = Math.min(Math.max(green, 0), 255);
            blue = Math.min(Math.max(blue, 0), 255);
          
            return `rgb(${red}, ${green}, ${blue})`;
          };
          

          /*
              GeoRasterLayer is an extension of GridLayer,
              which means can use GridLayer options like opacity.
  
              Just make sure to include the georaster option!
  
              http://leafletjs.com/reference-1.2.0.html#gridlayer
          */
          var layer = new GeoRasterLayer({
            pixelValuesToColorFn,
            georaster: georaster,
            opacity: 1,
            resolution: 256
          });
          layer.addTo(map);

          map.fitBounds(layer.getBounds());

        });
      });
  }

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