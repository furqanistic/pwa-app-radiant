// File: server/routes/gameWheel.js - ENHANCED WITH SPA OWNER MANAGEMENT
import express from 'express'
import {
  createGame,
  deleteGame,
  getAllGames,
  getAvailableGames,
  getGame,
  getGameAnalytics,
  getGameRewardsForSpa,
  getUserGameHistory, // NEW: Get game rewards for spa owners
  playGame,
  toggleGamePublication,
  toggleGameStatus,
  updateGame,
} from '../controller/gameWheel.js'
import { restrictTo, verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// ===============================================
// PUBLIC ROUTES (for game players)
// ===============================================

// Get user's personal game history - MUST be before other routes
router.get('/my-history', getUserGameHistory)

// Get available games for customers to play
router.get('/available', getAvailableGames)

// Play a game - MUST be before generic /:gameId route
router.post('/:gameId/play', playGame)

// ===============================================
// SPA OWNER ROUTES (team role management)
// ===============================================

// Apply permission checking for spa management
router.use(restrictTo('admin', 'team'))

// NEW: Get game rewards that need spa owner attention
router.get('/spa/game-rewards', getGameRewardsForSpa)

// Admin can get game rewards for specific location
router.get(
  '/spa/:locationId/game-rewards',
  restrictTo('admin'),
  getGameRewardsForSpa
)

// ===============================================
// GAME MANAGEMENT ROUTES
// ===============================================

// Get all games (management view)
router.get('/', getAllGames)

// Create a new game
router.post('/', createGame)

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
