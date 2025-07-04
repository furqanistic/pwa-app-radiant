import axios from 'axios'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import passport from 'passport'
// Import passport configuration (must be imported before routes)
import './config/passport.js'
import authRoute from './routes/auth.js'
import locationRoute from './routes/location.js'

const app = express()

// Load environment variables first
dotenv.config()

const corsOptions = {
  origin: [
    'http://localhost:5173', // Dev
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json())

// Initialize Passport middleware
app.use(passport.initialize())

mongoose.set('strictQuery', true)

// GHL Location Info Route (Using Location API Key)
app.get('/api/ghl/location-info', async (req, res) => {
  try {
    // Check if required environment variables are present
    if (!process.env.GHL_LOCATION_ID || !process.env.GHL_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'Missing GHL_LOCATION_ID or GHL_API_KEY environment variables',
      })
    }

    console.log('Fetching location info with Location API Key...')

    // Try different endpoints that work with location API keys
    const apiConfigs = [
      // Try location business profile endpoint
      {
        name: 'Business Profile',
        url: `https://rest.gohighlevel.com/v1/locations/${process.env.GHL_LOCATION_ID}/business-profile`,
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
      // Try general location info endpoint
      {
        name: 'Location Info',
        url: `https://rest.gohighlevel.com/v1/locations/${process.env.GHL_LOCATION_ID}`,
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
      // Try calendars endpoint as a test
      {
        name: 'Calendars (Test)',
        url: `https://rest.gohighlevel.com/v1/calendars`,
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
      // Try contacts endpoint to verify API key works
      {
        name: 'Contacts (Verify)',
        url: `https://rest.gohighlevel.com/v1/contacts?locationId=${process.env.GHL_LOCATION_ID}&limit=1`,
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    ]

    let successfulResponse = null
    let errors = []

    // Try each configuration
    for (const config of apiConfigs) {
      try {
        console.log(`Trying ${config.name}: ${config.url}`)
        const response = await axios.get(config.url, {
          headers: config.headers,
        })

        console.log(`✅ Success with ${config.name}`)
        successfulResponse = {
          endpoint: config.name,
          url: config.url,
          data: response.data,
        }
        break // Stop on first success
      } catch (error) {
        const errorInfo = {
          endpoint: config.name,
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          data: error.response?.data,
        }
        errors.push(errorInfo)
        console.log(
          `❌ Failed with ${config.name}:`,
          errorInfo.status,
          errorInfo.message
        )
      }
    }

    if (successfulResponse) {
      // Return successful response
      return res.json({
        success: true,
        result: successfulResponse,
        message: `Successfully retrieved data using ${successfulResponse.endpoint} endpoint`,
      })
    } else {
      // All endpoints failed
      return res.status(401).json({
        success: false,
        message:
          'All API endpoints failed. Please check your API key and location ID.',
        errors: errors,
        troubleshooting: {
          check: [
            'Verify your API key is correct and active',
            'Confirm your location ID is correct',
            'Ensure your GHL plan supports API access',
            'Check if your API key needs to be regenerated',
          ],
        },
      })
    }
  } catch (error) {
    console.error('GHL API Error:', error.response?.data || error.message)

    // Handle different types of errors
    if (error.response) {
      // API returned an error response
      const status = error.response.status
      const message = error.response.data?.message || 'GHL API Error'

      return res.status(status).json({
        success: false,
        message: message,
        error: error.response.data,
      })
    } else if (error.request) {
      // Network error
      return res.status(503).json({
        success: false,
        message: 'Unable to connect to GoHighLevel API',
      })
    } else {
      // Other error
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }
})

// Routes
app.use('/api/auth', authRoute)
app.use('/api/locations', locationRoute)

const connect = () => {
  mongoose
    .connect(process.env.MONGO)
    .then(() => {
      console.log('Connected to MongoDB')
    })
    .catch((err) => console.log(err))
}

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500
  const message = err.message || 'Something went wrong'
  return res.status(status).json({
    success: false,
    status,
    message,
  })
})

app.listen(8800, () => {
  connect()
  console.log('Server running at 8800')
})
