// File: server/routes/bookings.js
import express from 'express'
import {
    getAvailability,
    updateAvailability,
} from '../controller/availability.js'
import {
    createBooking,
    getBookedTimes,
    getUserBookingStats,
    getUserPastVisits,
    getUserUpcomingAppointments,
    rateVisit,
} from '../controller/bookings.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// Availability routes
router.get('/availability', getAvailability)
router.put('/availability', updateAvailability)

// User routes
router.get('/upcoming', getUserUpcomingAppointments)
router.get('/past', getUserPastVisits)
router.get('/stats', getUserBookingStats)
router.post('/create', createBooking)
router.post('/rate/:bookingId', rateVisit)
router.get("/booked-times", getBookedTimes);
export default router
