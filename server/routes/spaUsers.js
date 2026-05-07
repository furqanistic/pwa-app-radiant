// File: server/routes/spaUsers.js
// server/routes/spaUsers.js
import express from 'express'
import { getSpaUserActivity, getSpaUsers } from '../controller/spaUsers.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// Get users from the same spa
router.get('/', getSpaUsers)

// Get spa user activity/analytics
router.get('/activity', getSpaUserActivity)

export default router
