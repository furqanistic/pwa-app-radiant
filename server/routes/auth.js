// File: server/routes/auth.js
import express from 'express'
import passport from 'passport'
import {
  adjustUserPoints,
  assignLocationToUser,
  bulkUpdateUsers,
  changePassword,
  changeUserRole,
  createTeamMember,
  deleteUser,
  getAllUsers,
  getAssignableUsers,
  getCurrentUser,
  getOnboardingStatus,
  getUserProfile,
  selectSpa,
  signin,
  signup,
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
  requireSuperAdmin,
  verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// Public user registration
router.post('/signup', signup)

// User login
router.post('/signin', signin)

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
router.put('/profile/:id', updateUser)

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
  requireAdminOrAbove,
  canManageUser,
  auditLog('user_delete'),
  deleteUser
)

// Adjust user points (add/remove/set)
router.post(
  '/users/:userId/points',
  requireAdminOrAbove,
  canManageUser,
  auditLog('points_adjustment'),
  adjustUserPoints
)

// Create new team member or user
router.post(
  '/create-team-member',
  requireAdminOrAbove,
  auditLog('user_creation'),
  createTeamMember
)

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

// Get users eligible for location assignment (admin/team only)
router.get('/assignable-users', requireAdminOrAbove, getAssignableUsers)

// Create admin user (super-admin only)
router.post(
  '/create-admin',
  requireSuperAdmin,
  auditLog('admin_creation'),
  createTeamMember
)

export default router
