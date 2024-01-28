module.exports = app => {
  const jobs = require("../controllers/job.controller.js");

  var router = require("express").Router();

  // Create a new Job
  router.post("/", jobs.create);

  // Retrieve all Joben
  router.get("/", jobs.findAll);

  // Retrieve a single Job with id
  router.get("/:id", jobs.findOne);

  // Delete all Jobs
  router.delete("/", jobs.deleteAll);

  app.use("/api/jobs", router);
};
