const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();


app.use(cors());

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


require("./app/routes/job.routes")(app);

// set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
