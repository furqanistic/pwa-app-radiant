// File: server/routes/auth.js
// server/routes/auth.js
import express from 'express'
import passport from 'passport'
import {
  adjustUserPoints,
  changePassword,
  completeOnboarding,
  createTeamMember, // ADD THIS IMPORT
  deleteUser,
  generateReferralCode,
  getAllUsers,
  getCurrentUser,
  getOnboardingStatus,
  getUserProfile,
  googleCallback,
  linkGoogleAccount,
  selectSpa,
  signin,
  signup,
  unlinkGoogleAccount,
  updateSelectedSpa,
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

// NEW: Onboarding and Spa Selection routes
router.get('/onboarding-status', getOnboardingStatus)
router.post('/select-spa', selectSpa)
router.put('/update-spa', updateSelectedSpa)
router.post('/complete-onboarding', completeOnboarding)

// Google account management routes
router.post('/link-google', linkGoogleAccount)
router.delete('/unlink-google', unlinkGoogleAccount)

// NEW: Generate referral code for existing users
router.post('/generate-referral-code', generateReferralCode)

// Routes that need permission checking (admin only)
router.use(checkPermission)

// User management routes
router.put('/update/:id', updateUser)
router.get('/all-users', getAllUsers)
router.delete('/delete/:id', deleteUser)
router.post('/users/:userId/points', adjustUserPoints)

// NEW: Team member creation route (admin only)
router.post('/create-team-member', createTeamMember)

export default router
