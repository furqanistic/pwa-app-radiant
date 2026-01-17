// File: server/index.js
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import passport from 'passport'
import './config/passport.js'
import authRoute from './routes/auth.js'
import bookingsRouter from './routes/bookings.js'; // NEW
import dashboardRouter from './routes/dashboard.js'; // NEW
import gameWheelRoutes from './routes/gameWheel.js'
import ghlRoutes from './routes/ghl.js'
import locationRoute from './routes/location.js'
import notificationRoutes from './routes/notification.js'
import qrCodeRoutes from "./routes/qrCode.js"
import referralRoutes from './routes/referral.js'
import rewardsRouter from './routes/rewards.js'
import servicesRouter from './routes/services.js'
import spaUsersRouter from './routes/spaUsers.js'
import stripeRoutes from './routes/stripe.js'; // STRIPE INTEGRATION
import userRewardsRouter from './routes/userRewards.js'


const app = express()

// Load environment variables first
dotenv.config()

// Function to check if origin is allowed
const isOriginAllowed = (origin) => {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) return true

  // List of specific allowed origins (NO TRAILING SLASHES)
  const allowedOrigins = [
    'http://localhost:5173', // Dev
    'https://api.cxrsystems.com',
    'https://app.cxrsystems.com',
  ]

  // Check if origin is in the specific allowed list
  if (allowedOrigins.includes(origin)) {
    return true
  }

  // Check if origin is a subdomain of radiantmdconsulting.com
  const subdomainPattern = /^https:\/\/[\w-]+\.radiantmdconsulting\.com$/
  if (subdomainPattern.test(origin)) {
    return true
  }

  return false
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions))
app.use(cookieParser())

// Stripe webhook needs raw body - mount before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))

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
app.use('/api/games', gameWheelRoutes)
app.use('/api/bookings', bookingsRouter) // NEW
app.use('/api/dashboard', dashboardRouter) // NEW
app.use('/api/user-rewards', userRewardsRouter)
app.use('/api/stripe', stripeRoutes) // STRIPE INTEGRATION
app.use("/api/qr-codes", qrCodeRoutes);

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
