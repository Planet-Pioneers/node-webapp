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
let trainingItems = new L.FeatureGroup();
map.addLayer(drawnItems);
map.addLayer(trainingItems);


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

document.getElementById('geojson-file-input2').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    trainingdata = JSON.parse(event.target.result);
    job.trainingdata = trainingdata;
    console.log("after uploading trainingdata:")
    console.log(job)
  };

  reader.readAsText(file);
});

async function is_valid_geojson(geojson) {
  if (geojson.type !== 'FeatureCollection') {
    alert("has to be featurecollection")
    return false;
  }
  if (!geojson.features || !Array.isArray(geojson.features)) {
    alert("has to contain some features")
    return false;
  }
  if (!geojson.crs) {
    alert("needs a crs like : crs: { type: name, properties: { name: urn:ogc:def:crs:EPSG::32632 } } \n supported crs are : EPSG::32632, EPSG:4326, EPSG:4269, EPSG:3857")
    return false;
  }
  // Check each feature in 'features'
  for (const feature of geojson.features) {
    // Check if each feature is a dictionary
    if (typeof feature !== 'object' || feature === null) {
      return false;
    }

    // Check if each feature has the required properties
    if (!feature.type || !feature.properties || !feature.geometry) {
      return false;
    }
    // Check properties Label
    const properties = feature.properties;
    if (
      typeof properties.Label !== 'string'
    ) {
      alert("please a Label for each feature under properties")
      return false;
    }


    // Check if the geometry type is 'Polygon'
    if (feature.geometry.type !== 'Polygon') {
      return false;
    }
  }
  return true;
}

async function uploadTrainingData() {
  const geojson = job.trainingdata;
  const valid = await is_valid_geojson(geojson);
  console.log(valid)
  if (valid) {
    //upload normal trainingdata
    let crstring = geojson.crs.properties.name;
    const concatenatedNumber = Number((crstring.match(/\d+/g) || []).join(''));

    // Check if a match is found
    if (concatenatedNumber) {
      //Add some common crs codes here. That seems like a dumb way to do that tho
      proj4.defs("EPSG:32632", "+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs +type=crs");

      // Extract the crs
      console.log(concatenatedNumber);
      let crs = `EPSG:${concatenatedNumber}`;
      console.log("before:", geojson);

      // Function to alter coordinates (modify this according to your requirements)
      function convertCoordinates(coordinates, resultcrs) {
        return coordinates.map(coord => {
          // Convert coordinates to EPSG:4326
          const convertedCoord = proj4(crs, resultcrs, coord);
          return convertedCoord;
        });
      }

      // Create a new GeoJSON object with modified coordinates to display on the leaflet map.
      const modifiedGeojson = {
        type: 'FeatureCollection',
        features: geojson.features.map(feature => {
          const geometry = feature.geometry;

          // Check if the geometry is a Polygon
          if (geometry.type === 'Polygon') {
            // Clone the original feature and modify the coordinates
            const modifiedFeature = JSON.parse(JSON.stringify(feature));
            modifiedFeature.geometry.coordinates[0] = convertCoordinates(geometry.coordinates[0],'EPSG:4326');

            return modifiedFeature;
          } else {
            return feature;
          }
        })
      };
      console.log("after:", modifiedGeojson);



      //create a second modified geojson to push to the backend
      let i = 1;
      const labelToClassIdMap = {};
      let classIdCounter = 1; 
      const modifiedGeojson2 = {
        type: 'FeatureCollection',
        crs: { "type": "name", "properties": { "name": "EPSG:3857" } },
        features: geojson.features.map(feature => {

          const modifiedFeature = {
            type: "Feature",
            properties: {},
            geometry: feature.geometry
          };
          modifiedFeature.geometry.coordinates[0] = convertCoordinates(feature.geometry.coordinates[0],'EPSG:3857');
          modifiedFeature.properties.FID = i++;
          let label = feature.properties.Label
          let classId = labelToClassIdMap[label];
          if (!classId) {
            // If not, assign a new unique ClassId
            classId = classIdCounter++;
            labelToClassIdMap[label] = classId;
          }
          modifiedFeature.properties.ClassId = classId;
          modifiedFeature.properties.Label = `${classId}${label.replace(/\d/g, '')}`;
          return modifiedFeature;

        })
      };
      job.trainingdata = modifiedGeojson2;
      console.log("after:", modifiedGeojson2);
      // Add the modified GeoJSON to the Leaflet map
      const geoJsonLayer = L.geoJSON(modifiedGeojson).addTo(map);
      // Hier adde ich die trainingspolygone einfach zu all layers das ist zwar dumm aber mein Kopf funktioniert nichtmehr
      //vielleicht eine eigene feature layer für die erzeugen damit man die einzeln löschen (oder ausblenden kann)
      // Als ich die funktion confirmarea() geschrieben habe waren mir die AllLayers mit den geojson daten nicht aufgefallen
      // TODO: wenn polygone entfernt werden die auch aus all layers entfernen
      // und gucken dass es genau ein polygon gibt. Vielleicht auch allLayers auflösen und alle nur noch in drawnItems speichern? Not sure...
      allLayers.push(geoJsonLayer);


      // Optionally, fit the map bounds to the newly added GeoJSON layer
      map.fitBounds(geoJsonLayer.getBounds());
      alert("trainingdata is valid!")
    } else {
      console.log("No EPSG:: code found in the string.");
    }

  }else{
    console.log("jobtrainingdata = null")
    job.trainingdata = NULL;
  }
}

/*
// Load the Rivers GeoPackage and display the tile layer
L.geoPackageTileLayer({
  geoPackageUrl: 'http://ngageoint.github.io/GeoPackage/examples/rivers.gpkg',
  layerName: 'rivers_tiles'
}).addTo(map);
 
// Load the Rivers GeoPackage and display the feature layer
L.geoPackageFeatureLayer([], {
  geoPackageUrl: 'http://ngageoint.github.io/GeoPackage/examples/rivers.gpkg',
  layerName: 'rivers'
}).addTo(map);
*/

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
    const maxDuration = 2 * 4 * 7 * 24 * 60 * 60 * 1000;

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
        [7.712970, 51.997845], 
        [7.712970, 51.919142]
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
  const geoJSONLayerCount = Object.keys(allLayers).length;
  console.log(geoJSONLayerCount)
  console.log(drawnItems)

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
    calculation: calc,
    model_id: job.model_id,
    classes: job.classes,
    trainingdata: job.trainingdata
  }
  console.log(obj)
  let calculation;
  try {
    if(calc == 'Classification'){
      if(job.model_id == null){
        alert("please select a model first")
        return;
      }
    }
    if(calc == 'model'){
      document.getElementById('loading-spinner-model').style.display = 'block';
    }else{
      document.getElementById('loading-spinner').style.display = 'block';
    }
    const responseData = await api_call('jobs', 'POST', "/", obj);
    if(calc == 'model'){
      document.getElementById('loading-spinner-model').style.display = 'none';
    }else{
      document.getElementById('loading-spinner').style.display = 'none';
    }
    
    console.log("response: ", responseData)
    calculation = responseData.calculation; // This will log the response data to the console
    //Anzahl der classes wird aus dem job ausgelesen. Im moment noch in UseTrainedModel, später dann über die Auswahl von model
    classes = job.classes;
    console.log("selected Model has ", classes)
    // classes = responseData.classes
    //TODO: Existiert noch nicht aber diese Anzahl wäre dann wie viele Klassen es gibt. Daraufhin muss die Legende skaliert werden
  } catch (error) {
    console.error(error); // Handle errors here
  }
  if (calculation == "Classification") {
    //Initiate Legend
    L.Control.Legend = L.Control.extend({
      onAdd: function (map) {
        //create_legend Funktion unten wird aufgerufen
        return create_legend(classes);
      }
    });
    L.control.Legend = function (opts) {
      return new L.Control.Legend(opts);
    }
    L.control.Legend({ position: 'bottomright' }).addTo(map);

    var url_to_geotiff_file = "../results/prediction.tif"
    // Chroma color scale definition
    //TODO: Welche Farben nimmt man wenn man nicht weiß wie viele Klassen es gibt? Domain muss auch dynamisch gemacht werden
    const scale = chroma.scale([
      '#90EE90', '#0000FF', '#00FF00', '#8B0000', '#FF0000', '#F4A460', '#007500', '#89cff0', '#aa00bb','#fe4300'
    ]).domain([1, 2, 3, 4, 5, 6, 7,8,9,10]);


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
    alert("Classification done! Please view it on the map or download it below")
    document.getElementById('classification-download-button').removeAttribute('hidden');
  } else if (calculation == "composite") {
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
    alert("Composite calculation done! Please view it on the map or download it below")
    document.getElementById('composite-download-button').removeAttribute('hidden');
  } else if (calculation == "model") {
    alert("Model calculation done!")
    document.getElementById('model-download-button').removeAttribute('hidden');
    useTrainedModel();
  }

}

function create_legend(classes) {

  // Use regular expression to find all substrings within single quotes
  const matches = classes.match(/'([^']+)'/g);

  // Remove single quotes from each match
  const classnames = matches.map(match => match.replace(/'/g, ''));

  //TODO: Größe vom Canvas auf anzahl der Klassen anpassen?
  let cs = L.DomUtil.create('canvas');
  const legend_plane_width = 125;
  const legend_plane_height = 245;
  const div_num = 100;
  const margin_left = 10;
  const margin_top = 30;
  const legend_width = 30;
  const div_height = 2;
  const tick_length = 5;
  const margin_text_lengend = 30;
  cs.width = legend_plane_width;
  cs.height = legend_plane_height;
  if (cs.getContext) {
    let ctx = cs.getContext('2d');
    //TODO: Chroma scale an chroma scale oben anpassen
    let allchromas = [ '#90EE90', '#0000FF', '#00FF00', '#8B0000', '#FF0000', '#F4A460', '#007500', '#89cff0', '#aa00bb','#fe4300']
    let chromas = allchromas.slice(0, classnames.length)
    console.log(chromas)
    let scl = chroma.scale(chromas).classes(chromas.length);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, legend_plane_width, legend_plane_height);
    //Ich check nicht so genau was hier passiert warum ist div_num 100? aber es müssen jedenfalls die Rechtecke mit den Farben auf das große Rechteck skaliert werden
    for (let i = 0; i < div_num; i++) {
      ctx.fillStyle = scl((div_num - i) / div_num);
      ctx.fillRect(margin_left, margin_top + i * div_height, legend_width, div_height);
    }
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.textBaseline = 'center';
    ctx.textAlign = 'left';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText("Legende", 4, 20);
    const left_pos_top = 46;
    const top_pos = 45;
    ctx.textAlign = 'left';
    const left_pos_2nd = 45;
    //TODO Label ändern zu labels aus dem Model (das es noch nicht gibt hier)
    //TODO: Hier die Position vom Text anpassen. Warum nicht die gleiche Skalierung nehmen wie bei den Rechtecken?
    //Weil das aus irgend einem grund nicht klappt
    for (let i = 0; i < classnames.length; i++) {
      const label = classnames[classnames.length - i - 1]; // Remove leading digits
      const top_pos = 45 + i * 210 / classnames.length;
      ctx.fillText(label, left_pos_2nd, top_pos);
    }
  }
  return cs;
}



function downloadFile(filename) {
  const filePath = `../results/${filename}`;
  const link = document.createElement('a');
  link.href = filePath;
  link.download = filename;

  // Append the link to the body
  document.body.appendChild(link);

  // Trigger a click on the link to start the download
  link.click();

  // Remove the link from the DOM
  document.body.removeChild(link);
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
  window.location.href = "Trainingsdata.html";

}
function useTrainedModel() {
  const apiUrl = "http://ec2-54-201-136-219.us-west-2.compute.amazonaws.com:8000/models";
  //const apiUrl = "http://r-backend:8000/models";
  console.log("url = ", apiUrl)

  // Container, in den wir die Modelle einfügen werden
  const modelContainer = document.getElementById("model-container");

  // Make a GET request using the fetch API
  fetch(apiUrl)
    .then(response => {
      // Check if the response is successful (status code in the range 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Parse the JSON response
      return response.json();
    })
    .then(data => {
      // Check if a table with class 'model-table' already exists
      const existingTable = document.querySelector('.model-table');

      // If a table exists, remove it from the DOM
      if (existingTable) {
        existingTable.parentNode.removeChild(existingTable);
      }
      // Erstelle eine Tabelle
      const table = document.createElement("table");
      table.classList.add("model-table");

      // Erstelle eine Tabellenüberschrift
      const tableHeader = document.createElement("thead");
      const headerRow = document.createElement("tr");
      const headers = ["Model Name", "Algorithmus", "Anzahl Samples", "Klassen", "Resampling", ""];
      headers.forEach(headerText => {
        const header = document.createElement("th");
        header.textContent = headerText;
        headerRow.appendChild(header);
      });
      tableHeader.appendChild(headerRow);
      table.appendChild(tableHeader);

      // Loop durch die Modelle und füge sie der Tabelle hinzu
      const tableBody = document.createElement("tbody");
      data.forEach(model => {
        const row = document.createElement("tr");
        const modelName = document.createElement("td");
        modelName.textContent = model[0];
        const extraInfo1 = document.createElement("td");
        extraInfo1.textContent = model[4];
        const extraInfo2 = document.createElement("td");
        extraInfo2.textContent = model[6];
        const extraInfo3 = document.createElement("td");
        extraInfo3.textContent = model[8];
        const extraInfo4 = document.createElement("td");
        extraInfo4.textContent = model[11];
        const selectButtonCell = document.createElement("td");
        const selectButton = document.createElement("button");
        selectButton.textContent = "Select Model";
        selectButton.dataset.modelName = model[0];

        selectButton.addEventListener("click", function () {
          // Remove highlighting from previously selected row
          const previouslySelectedRow = document.querySelector('.selected-row');
          if (previouslySelectedRow) {
            previouslySelectedRow.classList.remove('selected-row');
          }

          // Highlight the current row
          row.classList.add('selected-row');

          const modelName = this.dataset.modelName;
          const model_name = modelName.match(/model(\d+)\./);
          job.model_id = model_name[1];
          console.log("model_id added");
          job.classes = model[8];
          console.log("classes added");
          console.log("job: ", job);
        });


        selectButtonCell.appendChild(selectButton);
        row.appendChild(modelName);
        row.appendChild(extraInfo1);
        row.appendChild(extraInfo2);
        row.appendChild(extraInfo3);
        row.appendChild(extraInfo4);
        row.appendChild(selectButtonCell);
        tableBody.appendChild(row);
      });
      table.appendChild(tableBody);
      modelContainer.appendChild(table);
      const lastRow = table.querySelector('tbody tr:last-child');
      if (lastRow) {
        lastRow.classList.add('selected-row');
        //trigger the click event on the "Select Model" button for the last row
        const selectButton = lastRow.querySelector('button');
        if (selectButton) {
          selectButton.click();
        }
      }
    })
    .catch(error => {
      // Handle errors during the fetch operation
      console.error("Error during fetch operation:", error);
    });
}

// Reformatting function


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