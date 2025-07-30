// File: server/index.js
// server/index.js
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import passport from 'passport'
// Import passport configuration (must be imported before routes)
import './config/passport.js'
import authRoute from './routes/auth.js'
import ghlRoutes from './routes/ghl.js' // Add this line
import locationRoute from './routes/location.js'
import notificationRoutes from './routes/notification.js'
import referralRoutes from './routes/referral.js'
import rewardsRouter from './routes/rewards.js'
import servicesRouter from './routes/services.js'
import spaUsersRouter from './routes/spaUsers.js'
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

// Routes
app.use('/api/auth', authRoute)
app.use('/api/locations', locationRoute)
app.use('/api/notifications', notificationRoutes)
app.use('/api/referral', referralRoutes)
app.use('/api/ghl', ghlRoutes)
app.use('/api/spa-users', spaUsersRouter)
app.use('/api/services', servicesRouter)
app.use('/api/rewards', rewardsRouter)
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
