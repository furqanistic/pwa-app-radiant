// File: server/routes/dashboard.js
// server/routes/dashboard.js (or wherever your routes are defined)
import express from 'express'
import { getDashboardData } from '../controller/dashboard.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// Make sure verifyToken is applied before the controller
router.get('/data', verifyToken, getDashboardData)

export default router
