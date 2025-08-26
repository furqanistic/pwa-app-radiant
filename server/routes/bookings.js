// File: server/routes/bookings.js
import express from 'express'
import {
  createBooking,
  getUserBookingStats,
  getUserPastVisits,
  getUserUpcomingAppointments,
  rateVisit,
} from '../controller/bookings.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// User routes
router.get('/upcoming', getUserUpcomingAppointments)
router.get('/past', getUserPastVisits)
router.get('/stats', getUserBookingStats)
router.post('/create', createBooking)
router.post('/rate/:bookingId', rateVisit)

export default router
