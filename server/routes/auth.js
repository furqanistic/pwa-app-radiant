// File: server/routes/auth.js
import express from 'express'
import passport from 'passport'
import {
    adjustUserCredits,
    adjustUserPoints,
    assignLocationToUser,
    bulkUpdateUsers,
    changePassword,
    changeUserRole,
    createSpaMember,
    deleteUser,
    forgotPassword,
    getAllUsers,
    getAssignableUsers,
    getCurrentUser,
    getOnboardingStatus,
    getUserProfile,
    regenerateReferralCode,
    resetPassword,
    selectSpa,
    signin,
    signup,
    unassignLocationFromUser,
    updateUser,
} from '../controller/auth.js'
import {
    auditLog,
    canChangeRoles,
    canManageUser,
    canPerformBulkOperations,
    canViewUsers,
    checkManagementAccess,
    requireAdminOrAbove,
    requireSpaOrAdminOrAbove,
    requireSuperAdmin,
    restrictTo,
    verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// Public user registration
router.post('/signup', signup)

// User login
router.post('/signin', signin)

// Password reset (public)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Google OAuth login initiation
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
)

// Protected routes - require authentication
router.use(verifyToken)

// Get current user profile
router.get('/me', getCurrentUser)

// Get specific user profile
router.get('/profile/:id', getUserProfile)

// Update user profile
// Update user profile
router.put('/update/:id', updateUser)

// Change user password
router.put('/change-password', changePassword)

// Get user onboarding status
router.get('/onboarding-status', getOnboardingStatus)

// Select spa location for user
router.post('/select-spa', selectSpa)

// Get all users with pagination and filters
router.get('/all-users', checkManagementAccess, canViewUsers, getAllUsers)

// Delete user account
router.delete(
  '/delete/:id',
  requireSuperAdmin,
  canManageUser,
  auditLog('user_delete'),
  deleteUser
)

// Adjust user points (add/remove/set)
router.post(
  '/users/:userId/points',
  requireSpaOrAdminOrAbove,
  canManageUser,
  auditLog('points_adjustment'),
  adjustUserPoints
)

router.post(
  '/users/:userId/credits',
  requireSpaOrAdminOrAbove,
  canManageUser,
  auditLog('credits_adjustment'),
  adjustUserCredits
)

// Regenerate referral code for any user
router.post(
  '/users/:userId/referral-code/regenerate',
  requireAdminOrAbove,
  auditLog('referral_code_regenerate'),
  regenerateReferralCode
)

// Create new spa member (admin only)
router.post('/create-spa-member', restrictTo('admin', 'super-admin'), auditLog('user_creation'), createSpaMember)

// Change user role
router.put(
  '/users/:userId/role',
  requireAdminOrAbove,
  canChangeRoles,
  auditLog('role_change'),
  changeUserRole
)

// Bulk operations on multiple users
router.post(
  '/bulk-operations',
  requireAdminOrAbove,
  canPerformBulkOperations,
  auditLog('bulk_operation'),
  bulkUpdateUsers
)

// Assign location to existing user
router.post(
  '/assign-location',
  requireAdminOrAbove,
  auditLog('location_assignment'),
  assignLocationToUser
)

router.post(
  '/unassign-location',
  requireAdminOrAbove,
  auditLog('location_unassignment'),
  unassignLocationFromUser
)

// Get users eligible for location assignment (admin/spa only)
router.get('/assignable-users', requireAdminOrAbove, getAssignableUsers)

// Create admin user (super-admin only)
router.post(
  '/create-admin',
  requireSuperAdmin,
  auditLog('admin_creation'),
  createSpaMember
)

export default router
