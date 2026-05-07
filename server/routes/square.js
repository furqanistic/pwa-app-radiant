// File: server/routes/square.js - Square Connect routes
import express from 'express'
import {
  createSquareAuthorizationUrl,
  disconnectSquareAccount,
  getSquareAccountStatus,
  getSquareDashboard,
  handleSquareCallback,
} from '../controller/squareController.js'
import { handleSquareCheckoutReturn } from '../controller/stripeController.js'
import { checkManagementAccess, verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// OAuth callback must be public (Square redirects here without user auth headers)
router.get('/connect/callback', handleSquareCallback)
router.get('/connect/checkout-return', handleSquareCheckoutReturn)

router.use(verifyToken)

router.get('/connect/oauth-url', checkManagementAccess, createSquareAuthorizationUrl)
router.get('/connect/status', getSquareAccountStatus)
router.delete('/connect/disconnect', checkManagementAccess, disconnectSquareAccount)
router.get('/connect/dashboard', checkManagementAccess, getSquareDashboard)

export default router
