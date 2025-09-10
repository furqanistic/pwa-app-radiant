// File: server/routes/gameWheel.js - COMPLETE WITH USER GAME HISTORY ROUTES
import express from 'express'
import {
  createGame,
  deleteGame,
  getAllGames,
  getAnyUserGameHistory,
  getAvailableGames,
  getGame,
  getGameAnalytics,
  getGameRewardsForSpa,
  getUserGameHistory, // NEW: For admin/team to view user's game history
  playGame,
  toggleGamePublication,
  toggleGameStatus,
  updateGame,
} from '../controller/gameWheel.js'
import {
  checkGameManagementAccess,
  checkLocationAccess,
  restrictTo,
  verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// ===============================================
// PUBLIC ROUTES (for game players - role: user)
// ===============================================

// Get user's personal game history
router.get('/my-history', restrictTo('user'), getUserGameHistory)

// Get available games for customers to play (only for role: user)
router.get('/available', restrictTo('user'), getAvailableGames)

// Play a game (only for role: user)
router.post('/:gameId/play', restrictTo('user'), playGame)

// ===============================================
// ADMIN/TEAM ROUTES - View user game history
// ===============================================

// Get any user's game history (admin/team can view)
router.get(
  '/user/:userId/history',
  restrictTo('admin', 'super-admin', 'team'),
  getAnyUserGameHistory
)

// ===============================================
// GAME MANAGEMENT ROUTES
// (admin, super-admin, team roles)
// ===============================================

// Apply game management permission checking
router.use(checkGameManagementAccess)

// Get all games (management view)
router.get('/', getAllGames)

// Create a new game
router.post('/', createGame)

// Get game rewards that need spa owner attention
router.get('/spa/game-rewards', getGameRewardsForSpa)

// Admin can get game rewards for specific location
router.get(
  '/spa/:locationId/game-rewards',
  restrictTo('admin', 'super-admin'),
  getGameRewardsForSpa
)

// Toggle game active status
router.patch('/:gameId/toggle-status', toggleGameStatus)

// Toggle game publication status
router.patch('/:gameId/toggle-publication', toggleGamePublication)

// Get game analytics (includes play history and reward data)
router.get('/:gameId/analytics', getGameAnalytics)

// Get a specific game
router.get('/:gameId', getGame)

// Update a game
router.put('/:gameId', updateGame)

// Delete a game
router.delete('/:gameId', deleteGame)

export default router
