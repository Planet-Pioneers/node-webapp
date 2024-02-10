const db = require("../models");
const Job = db.jobs;
const { OpenEO } = require('@openeo/js-client');
const fs = require('fs');
const proj4 = require('proj4');


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
  console.log(coordinates);


  function switchCoordinatesOrder(coordinates) {
    return coordinates.map(coord => [coord[1], coord[0]]);
  }


  let switchedCoordinates = switchCoordinatesOrder(coordinates)
  const coordinates3857 = switchedCoordinates.map(coord => proj4('EPSG:4326', 'EPSG:3857', coord));
  let switchedCoordinates3857 = switchCoordinatesOrder(coordinates3857);

  let west = switchedCoordinates3857[0][1];
  let south = switchedCoordinates3857[0][0];
  let east = switchedCoordinates3857[2][1];
  let north = switchedCoordinates3857[1][0];
  cordjson = {
    crs: 3857
  }

  cordjson.west = west;
  cordjson.south = south;
  cordjson.east = east;
  cordjson.north = north;
  console.log(cordjson);


  console.log("trying to connect to openeocubes on http://r-backend:8000")
  //sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' CONTAINER ID 
  //and then use that ip adress instead of localhost!
  const con = await OpenEO.connect("http://r-backend:8000/");
  //const con = await OpenEO.connect("http://r-backend:8000")



  // Connect to the back-end when deployed on AWS
  //const con = await OpenEO.connect("http://ec2-54-201-136-219.us-west-2.compute.amazonaws.com:8000");

  // Basic login with default params
  await con.authenticateBasic("user", "password");

  var info = con.capabilities();
  console.log("API Version: ", info.apiVersion());
  console.log("Description: ", info.description());
  console.log("Available Processes:");
  var response = await con.listProcesses();
  response.processes.forEach(process => {
    console.log(`${process.id}: ${process.summary}`);
  });



  if (calculation == "NDVI") {
    console.log("model selected:")
    console.log(req.body.model_id);
    model_id = req.body.model_id;
    var builder = await con.buildProcess();
    var datacube_init2 = builder.load_collection(
      "sentinel-s2-l2a-cogs",
      cordjson,
      ["2018-06-01", "2018-06-30"],
      undefined,
      resolution
    );
    datacube_filtered2 = builder.filter_bands(datacube_init2, ["B02", "B03", "B04", "B08", "B06", "B07", "B11"]);
    datacube_agg2 = builder.aggregate_temporal_period(datacube_filtered2, "month", "median")
    datacube_ndvi2 = builder.ndvi(datacube_agg2, "B08", "B04", true)
    test = builder.classify(datacube_ndvi2, model_id)


    result = builder.save_result(test, "GTiff");
    await con.downloadResult(test, "./public/results/prediction.tif");
    console.log("prediction done!")



  } else if (calculation == "composite") {
    console.log("calculate Composite!")
    //calculates cloud free composite:
    var builder = await con.buildProcess();
    var datacube_init = builder.load_collection(
      "sentinel-s2-l2a-cogs",
      cordjson,
      ["2020-06-01", "2020-06-30"],
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
    await con.downloadResult(datacube_agg, "./public/results/composite.tif");
    console.log("done!")


  } else if (calculation == "model") {
    //create uid for model
    const uid = Date.now().toString() + Math.floor(Math.random() * 1000000).toString();
    console.log(uid)

    //then get minmax bounds of the trainingdata here. 
    function getBounds(geojson) {
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
        crs: concatenatedNumber, // Change this to the appropriate CRS code
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

      return bbox;
    }
    let bbox = getBounds(trainingdata)
    console.log(bbox);
    trainingdata = JSON.stringify(req.body.trainingdata);



    var builder = await con.buildProcess();
    var datacube_init = builder.load_collection(
      "sentinel-s2-l2a-cogs",
      bbox,

      /* {
        west: 829265.3071,
        south: 6726936.2588,
        east: 851279.1817,
        north: 6743733.2687,
        crs: 3857
      },
     {
        west: 837596.9559,
        south: 6785525.2027,
        east: 857222.1630,
        north: 6798404.8420,
        crs: 3857
      },*/
      ["2020-06-01", "2020-06-30"],
      undefined,
      resolution
    );
    datacube_filtered = builder.filter_bands(datacube_init, ["B02", "B03", "B04", "B08", "B06", "B07", "B11"]);
    datacube_agg = builder.aggregate_temporal_period(datacube_filtered, "month", "median")
    datacube_ndvi = builder.ndvi(datacube_agg, "B08", "B04", true)
    //console.log(geojsonContent)
    model = builder.train_model(datacube_ndvi, trainingdata, uid)
    //classification = builder.classify(datacube_ndvi, model)


    result = builder.save_result(model, "RDS");
    await con.downloadResult(model, "./public/results/model.rds");
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
