// File: server/routes/auth.js - ENHANCED WITH ROLE MANAGEMENT AND PAGINATION
import express from 'express'
import passport from 'passport'
import {
  adjustUserPoints,
  bulkUpdateUsers,
  changePassword,
  changeUserRole,
  completeOnboarding,
  createTeamMember,
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
  auditLog,
  canChangeRoles,
  canManageUser,
  canPerformBulkOperations,
  canViewUsers,
  checkManagementAccess,
  checkPermission,
  requireAdminOrAbove,
  requireSuperAdmin,
  restrictTo,
  verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Authentication routes
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

// ============================================================================
// PROTECTED ROUTES (Require Authentication)
// ============================================================================

// Apply authentication middleware to all routes below
router.use(verifyToken)

// Basic user profile routes
router.get('/me', getCurrentUser)
router.get('/profile/:id', getUserProfile)
router.put('/profile/:id', updateUser)
router.put('/change-password', changePassword)

// Onboarding and Spa Selection routes
router.get('/onboarding-status', getOnboardingStatus)
router.post('/select-spa', selectSpa)
router.put('/update-spa', updateSelectedSpa)
router.post('/complete-onboarding', completeOnboarding)

// Google account management routes
router.post('/link-google', linkGoogleAccount)
router.delete('/unlink-google', unlinkGoogleAccount)

// Referral system
router.post('/generate-referral-code', generateReferralCode)

// ============================================================================
// MANAGEMENT ROUTES (Require Management Access)
// ============================================================================

// User management routes with role-based access
router.get('/all-users', checkManagementAccess, canViewUsers, getAllUsers)

router.delete(
  '/delete/:id',
  requireAdminOrAbove,
  canManageUser,
  auditLog('user_delete'),
  deleteUser
)

// ============================================================================
// ADMIN+ ROUTES (Admin or Super-Admin Required)
// ============================================================================

// Points management
router.post(
  '/users/:userId/points',
  requireAdminOrAbove,
  canManageUser,
  auditLog('points_adjustment'),
  adjustUserPoints
)

// Team member creation
router.post(
  '/create-team-member',
  requireAdminOrAbove,
  auditLog('team_member_creation'),
  createTeamMember
)

// ============================================================================
// ROLE MANAGEMENT ROUTES
// ============================================================================

// Single user role change
router.put(
  '/users/:userId/role',
  requireAdminOrAbove,
  canChangeRoles,
  auditLog('role_change'),
  changeUserRole
)

// ============================================================================
// BULK OPERATIONS ROUTES
// ============================================================================

// Bulk operations for multiple users
router.post(
  '/bulk-operations',
  requireAdminOrAbove,
  canPerformBulkOperations,
  auditLog('bulk_operation'),
  bulkUpdateUsers
)

// ============================================================================
// SUPER-ADMIN ONLY ROUTES
// ============================================================================

// Routes that only super-admins can access
router.post(
  '/create-admin',
  requireSuperAdmin,
  auditLog('admin_creation'),
  createTeamMember // Can be reused with role parameter
)

// System-level operations (if needed)
router.get('/system-stats', requireSuperAdmin, (req, res) => {
  // Implement system statistics endpoint
  res.json({ message: 'System statistics endpoint - TODO' })
})

// ============================================================================
// DEPRECATED ROUTES (Keep for backward compatibility)
// ============================================================================

// Legacy notification route (consider moving to separate notification routes)
router.post(
  '/send-notifications',
  requireAdminOrAbove,
  auditLog('bulk_notification'),
  (req, res) => {
    // Implement notification sending or redirect to notification service
    res.json({ message: 'Use /api/notifications/send instead' })
  }
)

export default router
