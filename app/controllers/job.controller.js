const db = require("../models");
const Job = db.jobs;
const { OpenEO } = require('@openeo/js-client');
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
  console.log(coordinates)


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
  console.log("trying to connect to openeocubes on http://ec2-54-201-136-219.us-west-2.compute.amazonaws.com:8000")
  //docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' r-backend and then use that ip adress instead of localhost!

  //const con = await OpenEO.connect("http://172.18.0.2:8000")
  //const con = await OpenEO.connect("http://localhost:8000")
  // Connect to the back-end when deployed on AWS
  const con = await OpenEO.connect("http://ec2-54-201-136-219.us-west-2.compute.amazonaws.com:8000");

  // Basic login with default params
  await con.authenticateBasic("user", "password");

  var info = con.capabilities();
  console.log("API Version: ", info.apiVersion());
  console.log("Description: ", info.description());
  var builder = await con.buildProcess();
  var datacube_init = builder.load_collection(
    "sentinel-s2-l2a-cogs",
    cordjson,
    ["2018-06-01", "2018-06-30"],
    undefined,
    resolution
  );

  if (calculation == "NDVI") {
    //calculates ndvi
    console.log("calculate NDVI!")
    datacube_filtered = builder.filter_bands(datacube_init, ["B04", "B08"]);
    datacube_agg = builder.aggregate_temporal_period(datacube_filtered, "month", "median")
    datacube_ndvi = builder.ndvi(datacube_agg, "B08", "B04")


    result = builder.save_result(datacube_ndvi, "GTiff");
    await con.downloadResult(datacube_ndvi, "./public/results/result.tif");
    console.log("maybe done?");
  } else if (calculation == "composite"){
    console.log("calculate Composite!")
    //calculates cloud free composite:
    datacube_filtered = builder.filter_bands(datacube_init, ["B02", "B03", "B04"]);
    datacube_agg = builder.aggregate_temporal_period(datacube_filtered, "month", "median")
    result = builder.save_result(datacube_agg, "GTiff", {
      red: "B02",
      blue: "B03",
      greeen: "B04"
    });
    await con.downloadResult(datacube_agg, "./public/results/composite.tif");
    console.log("done!")
  }


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
