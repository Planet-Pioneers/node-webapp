import connectDB from './config/db.js'
import express from 'express'
import dotenv  from 'dotenv'

//connect database
connectDB()

//dotenv config
dotenv.config()

const app = express()

// Serve static files from the 'public' directory
app.use(express.static('../frontend/public'));



const PORT = process.env.PORT || 3000

//Express js listen method to run project on http://localhost:3000
app.listen(PORT, console.log(`App is running in ${process.env.NODE_ENV} mode on port ${PORT}`))
