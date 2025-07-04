import express from 'express'
import passport from 'passport'
import {
  changePassword,
  deleteUser,
  getAllUsers,
  getConfiguredLocationIds,
  getCurrentUser,
  getGHLLocation,
  getGHLSubaccounts,
  getUserProfile,
  googleAuth,
  googleCallback,
  linkGoogleAccount,
  signin,
  signup,
  unlinkGoogleAccount,
  updateUser,
} from '../controller/auth.js'
import {
  checkPermission,
  restrictTo,
  verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.post('/signup', signup)
router.post('/signin', signin)

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
)
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=authentication_failed`,
    session: false,
  }),
  googleCallback
)

// Protected routes
router.use(verifyToken)

// Basic user profile routes
router.get('/profile/:id', getUserProfile)
router.put('/change-password', changePassword)
router.get('/me', getCurrentUser)

// Google account management routes
router.post('/link-google', linkGoogleAccount)
router.delete('/unlink-google', unlinkGoogleAccount)

// GHL Integration routes (Admin only)
router.get('/ghl/subaccounts', getGHLSubaccounts)
router.get('/ghl/location/:locationId', getGHLLocation)
router.get('/ghl/configured-locations', getConfiguredLocationIds)

// Routes that need permission checking
router.use(checkPermission)

// User management routes
router.put('/update/:id', updateUser)
router.get('/all-users', getAllUsers)
router.delete('/delete/:id', deleteUser)

export default router
