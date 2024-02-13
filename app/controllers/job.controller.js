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
  date1 = req.body.date;

  console.log(coordinates);
  console.log(date1);
  let date = new Date(date1)
  var date2 = new Date(date.setMonth(date.getMonth() + 1));
  let date2string = date2.toISOString();
  date2 = date2string.split("T")[0];
  console.log(date2)

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


  //console.log("trying to connect to openeocubes on 0.0.0.0")
  //sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' CONTAINER ID 
  //and then use that ip adress instead of localhost!
  //const con = await OpenEO.connect("http://r-backend:8000/");
  const openeocubesUri = process.env.OPENEOCUBES_URI;
  console.log("connecting to: ", openeocubesUri)
  let con;
  try {
    con = await OpenEO.connect(openeocubesUri)
    await con.authenticateBasic("user", "password");
    var info = con.capabilities();
    console.log("API Version: ", info.apiVersion());
    console.log("Description: ", info.description());
  } catch (error) {
    console.error('error connecting to openeo:', error.message)
  }

  if (calculation == "Classification") {
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
    const filepath = "./public/results/prediction.tif"
    fs.unlink(filepath, async (err) => {
      if (err) {
        console.error('Error deleting the file:', err);
      }
    });
    try {
      await con.downloadResult(test, filepath);
    } catch (error) {
      console.error('Error calculating classification:', error.message);
    }

    console.log("prediction done!")



  } else if (calculation == "composite") {
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
      fs.unlink(filepath, async (err) => {
        if (err) {
          console.error('Error deleting the file:', err);
        }
      });
    } catch (error) {
      console.error('error creating process graph for calculation', error.message)
      res.send(0);
    }

   
    try {
      await con.downloadResult(datacube_agg, filepath);
    } catch (error) {
      console.error('Error calculating conposite:', error.message);
      res.sendStatus(0);
    }

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
      //Check if the bbox is too large
      const deltax = (bbox.east - bbox.west);
      const deltay = (bbox.north - bbox.south)
      console.log("deltax: ", deltax, " deltay: ", deltay)
      return bbox;
    }
    let bbox = getBounds(trainingdata)
    console.log(bbox);
    trainingdata = JSON.stringify(req.body.trainingdata);



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
