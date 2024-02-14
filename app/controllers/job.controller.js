const db = require("../models");
const Job = db.jobs;
const { OpenEO } = require('@openeo/js-client');
const fs = require('fs');
const proj4 = require('proj4');
const turf = require('@turf/turf')


// Create and Save a new Job
exports.create = async (req, res) => {
  const job = new Job({
    calculation: req.body.calculation,
    date: req.body.date,
    coordinates: req.body.coordinates,
    resolution: req.body.resolution
  });
  let calculation = req.body.calculation;
  let coordinates = req.body.coordinates;
  resolution = req.body.resolution;
  trainingdata = req.body.trainingdata;
  date1 = req.body.date;

  //Format date
  let date = new Date(date1)
  var date2 = new Date(date.setMonth(date.getMonth() + 1));
  let date2string = date2.toISOString();
  date2 = date2string.split("T")[0];



  //switch coordinates for proj4
  function switchCoordinatesOrder(coordinates) {
    return coordinates.map(coord => [coord[1], coord[0]]);
  }

  //change coords to 3857 for the R-backend
  let switchedCoordinates = switchCoordinatesOrder(coordinates)
  const coordinates3857 = switchedCoordinates.map(coord => proj4('EPSG:4326', 'EPSG:3857', coord));
  let switchedCoordinates3857 = switchCoordinatesOrder(coordinates3857);

  let west = switchedCoordinates3857[0][1];
  let south = switchedCoordinates3857[0][0];
  let east = switchedCoordinates3857[2][1];
  let north = switchedCoordinates3857[1][0];

  //create json object for the area of interest
  cordjson = {
    crs: 3857
  }

  cordjson.west = west;
  cordjson.south = south;
  cordjson.east = east;
  cordjson.north = north;
  console.log(cordjson);


  //connect to the url provided in the docker-compose file
  const openeocubesUri = process.env.OPENEOCUBES_URI;
  console.log("connecting to: ", openeocubesUri)
  let con;
  //set up the connection
  try {
    con = await OpenEO.connect(openeocubesUri)
    await con.authenticateBasic("user", "password");
    var info = con.capabilities();
    console.log("API Version: ", info.apiVersion());
    console.log("Description: ", info.description());
  } catch (error) {
    console.error('error connecting to openeo:', error.message)
  }



  //If the job is a classification
  if (calculation == "Classification") {
    //create the process graph
    console.log("model selected:")
    console.log(req.body.model_id);
    model_id = req.body.model_id;
    var builder = await con.buildProcess();
    var datacube_init2 = builder.load_collection(
      "sentinel-s2-l2a-cogs",
      cordjson,
      [date1, date2],
      undefined,
      resolution
    );
    datacube_filtered2 = builder.filter_bands(datacube_init2, ["B02", "B03", "B04", "B08", "B06", "B07", "B11"]);
    datacube_agg2 = builder.aggregate_temporal_period(datacube_filtered2, "month", "median")
    datacube_ndvi2 = builder.ndvi(datacube_agg2, "B08", "B04", true)
    test = builder.classify(datacube_ndvi2, model_id)


    result = builder.save_result(test, "GTiff");
    //remove old prediction file to make sure it gets replaced
    const filepath = "./public/results/prediction.tif"
    fs.unlink(filepath, async (err) => {
      if (err) {
        console.error('Error deleting the file:', err);
      }
    });
    try {
      //download result
      await con.downloadResult(test, filepath);
    } catch (error) {
      console.error('Error calculating classification:', error.message);
    }

    console.log("prediction done!")


    //If the job is a color composite
  } else if (calculation == "composite") {
    //create process graph
    var filepath = "./public/results/composite.tif"
    try {
      console.log("calculate Composite!")
      //calculates cloud free composite:
      var builder = await con.buildProcess();
      var datacube_init = builder.load_collection(
        "sentinel-s2-l2a-cogs",
        cordjson,
        [date1, date2],
        undefined,
        resolution
      );
      datacube_filtered = builder.filter_bands(datacube_init, ["B02", "B03", "B04"]);
      datacube_agg = builder.aggregate_temporal_period(datacube_filtered, "month", "median")
      result = builder.save_result(datacube_agg, "GTiff", {
        red: "B02",
        blue: "B03",
        greeen: "B04"
      });
      //remove old prediction file to make sure it gets replaced
      fs.unlink(filepath, async (err) => {
        if (err) {
          console.error('Error deleting the file:', err);
        }
      });
    } catch (error) {
      console.error('error creating process graph for calculation', error.message)
      res.status(500).send({
        message:
          err.message || "Some error occurred while calculating the composite."
      });
    }


    try {
      //download result
      await con.downloadResult(datacube_agg, filepath);
    } catch (error) {
      console.error('Error calculating composite:', error.message);
      res.status(500).send({
        message:
          err.message || "Some error occurred while downloading the composite."
      });
    }

    console.log("done!")

    //If the calculation is a model
  } else if (calculation == "model") {
    //create uid for model
    const uid = Date.now().toString() + Math.floor(Math.random() * 1000000).toString();
    console.log(uid)

    //then get minmax bounds of the trainingdata here. 
    function getBounds(geojson) {
      //get the name of the crs
      let crstring = geojson.crs.properties.name;
      const concatenatedNumber = Number((crstring.match(/\d+/g) || []).join(''));

      if (!geojson || !geojson.features || geojson.features.length === 0) {
        // Return a default or error value if the GeoJSON is empty or invalid
        return { west: 0, south: 0, east: 0, north: 0, crs: 0 };
      }

      // Initialize bounding box with values from the first feature
      let bbox = {
        west: Infinity,
        south: Infinity,
        east: -Infinity,
        north: -Infinity,
        crs: concatenatedNumber, 
      };

      // Iterate through features to find the bounding box
      geojson.features.forEach((feature) => {
        if (feature.geometry && feature.geometry.coordinates) {
          feature.geometry.coordinates.forEach((coordinate) => {
            coordinate.forEach((point) => {
              bbox.west = Math.min(bbox.west, point[0]);
              bbox.south = Math.min(bbox.south, point[1]);
              bbox.east = Math.max(bbox.east, point[0]);
              bbox.north = Math.max(bbox.north, point[1]);
            });
          });
        }
      });

      //function that calculates the perimeter of a boundinbox
      function calculatePolygonPerimeter(bbox) {
        const coordinates = [
          [bbox.west, bbox.south],
          [bbox.west, bbox.north],
          [bbox.east, bbox.north],
          [bbox.east, bbox.south],
          [bbox.west, bbox.south] // closing the polygon
        ];

        // Convert coordinates to a turf polygon feature in EPSG:4326
        const polygonFeature = turf.polygon([coordinates]);

        // Calculate the perimeter in kilometers
        const perimeterKm = turf.length(polygonFeature, { units: 'kilometers' });

        return perimeterKm;
      }


      //convert bbox to 4326 to check perimeter
      const convertedBbox = {
        west: proj4('EPSG:3857', 'EPSG:4326', [bbox.west, bbox.south])[0],
        south: proj4('EPSG:3857', 'EPSG:4326', [bbox.west, bbox.south])[1],
        east: proj4('EPSG:3857', 'EPSG:4326', [bbox.east, bbox.north])[0],
        north: proj4('EPSG:3857', 'EPSG:4326', [bbox.east, bbox.north])[1]
      };



      const perimeter = calculatePolygonPerimeter(convertedBbox);
      //if perimeter around trainingdata is larger then 300km stop calculation 
      if (perimeter > 300) {
        console.log('error creating bounding box around trainingdata. Area too large')
        res.status(500).send({
          message:
            "error creating bounding box around trainingdata. Area too large."
        });
      }

      console.log("perimeter: ", perimeter)
      return bbox;
    }
    //create bbox
    let bbox = getBounds(trainingdata)
    console.log(bbox);
    trainingdata = JSON.stringify(req.body.trainingdata);

    //create the process graph
    var builder = await con.buildProcess();
    var datacube_init = builder.load_collection(
      "sentinel-s2-l2a-cogs",
      bbox,
      [date1, date2],
      undefined,
      resolution
    );
    datacube_filtered = builder.filter_bands(datacube_init, ["B02", "B03", "B04", "B08", "B06", "B07", "B11"]);
    datacube_agg = builder.aggregate_temporal_period(datacube_filtered, "month", "median")
    datacube_ndvi = builder.ndvi(datacube_agg, "B08", "B04", true)
    model = builder.train_model(datacube_ndvi, trainingdata, uid)



    result = builder.save_result(model, "RDS");
    const filepath = "./public/results/model.rds"
    fs.unlink(filepath, async (err) => {
      if (err) {
        console.error('Error deleting the file:', err);
      }
    });
    try {
      //download result
      await con.downloadResult(datacube_agg, filepath);
    } catch (error) {
      console.error('Error calculating model:', error.message);
    }
    console.log("model trained!")


  }
  // Save Job in the database
  job
    .save(job)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the Job."
      });
    });


};

// Retrieve all Jobs from the database.
exports.findAll = (req, res) => {
  const title = req.query.title;
  var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  Job.find(condition)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving jobs."
      });
    });
};

// Find a single Job with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Job.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ message: "Not found Job with id " + id });
      else res.send(data);
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error retrieving Job with id=" + id });
    });
};


// Delete all Jobs from the database.
exports.deleteAll = (req, res) => {
  Job.deleteMany({})
    .then(data => {
      res.send({
        message: `${data.deletedCount} Joben were deleted successfully!`
      });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all jobs."
      });
    });
};
