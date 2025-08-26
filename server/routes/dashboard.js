// File: server/routes/dashboard.js
import express from 'express'
import { getDashboardData } from '../controller/dashboard.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// Get complete dashboard data
router.get('/data', getDashboardData)

export default router
