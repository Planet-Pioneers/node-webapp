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


require("./app/routes/job.routes")(app);

// set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
