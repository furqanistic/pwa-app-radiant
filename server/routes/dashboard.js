// File: server/routes/dashboard.js
// server/routes/dashboard.js (or wherever your routes are defined)
import express from 'express'
import {
  getDashboardData,
  resetRecentCheckIns,
} from '../controller/dashboard.js'
import {
  checkManagementAccess,
  verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// Make sure verifyToken is applied before the controller
router.get('/data', verifyToken, getDashboardData)
router.post('/recent-checkins/reset', verifyToken, checkManagementAccess, resetRecentCheckIns)

export default router
