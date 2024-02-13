const express = require("express");
const cors = require("cors");
const fetch = require('node-fetch');
require("dotenv").config();

const app = express();

var corsOptions = {
  origin: "http://localhost:3000"
};
app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json())

app.use(express.static('public'))


// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

const db = require("./app/models");
db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

//starting route
app.get("/", (req, res) => {
  res.set({
    "Allow-access-Allow-Origin": '*'
  })
  return res.redirect('index.html');
});
app.get('/models', async (req, res) => {
  try {
    const response = await fetch('http://r-backend:8000/models');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/Stac_Call', (req, res) => {
  console.log("stac call called...")
  if (req.body.date == '' || req.body.coordinates == '') {
    console.log('Fehler Felder nicht gefüllt');
    return;
  }
  let startdate = req.body.date;
  let coordinates = req.body.coordinates;
  function switchCoordinatesOrder(coordinates) {
    return coordinates.map(coord => [coord[1], coord[0]]);
  }
  coordinates = switchCoordinatesOrder(coordinates);
  coordinates.push(coordinates[0]);
  let geojson = {
    "type": "Polygon",
    "coordinates": [coordinates]
  }
  let date= new Date(startdate)
  var enddate = new Date(date.setMonth(date.getMonth() + 1));
  let enddatestring = enddate.toISOString();
  enddate = enddatestring.split("T")[0];
  let fulldate = startdate + 'T00:00:00Z' + '/' + enddate + 'T23:59:59Z';
  
  let body = {
    collection : ['sentinel-2-l2a'],
    intersects : geojson,
    limit: 100,
    datetime: fulldate,
    query: {
      "eo:cloud_cover": {
        lt: 30
      }
    }
  }
  console.log(body)

  fetch(`https://earth-search.aws.element84.com/v1/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })
  .then(response => response.json())
  .then(data => {
    //console.log(data)
    const features = data.features;
    //console.log(features);
    console.log(features.length);
    res.json(features.length);
  })

 
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // You may want to perform some cleanup or logging here
  // ...
  process.exit(1); // Terminate the application with a non-zero exit code
});

require("./app/routes/job.routes")(app);

// set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
