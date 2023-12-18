import connectDB from './config/db.js';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Connect database
connectDB();

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('../frontend/public'));
app.use(bodyParser.json());

// Route to receive GeoJSON data
app.post('/uploadGeoJSON', (req, res) => {
  const geoJSONData = req.body;
  // Add logic here to work with the GeoJSON data
  console.log('Received GeoJSON data:', geoJSONData);
  res.status(200).json({ message: 'GeoJSON data received successfully' });
});

// Express.js listen method to run the project on http://localhost:3000
app.listen(PORT, () => {
  console.log(`App is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});