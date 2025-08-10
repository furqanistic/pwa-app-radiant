// File: server/routes/gameWheel.js - UPDATED WITH GAME HISTORY
import express from 'express'
import {
  createGame,
  deleteGame,
  getAllGames,
  getAvailableGames,
  getGame,
  getGameAnalytics,
  getUserGameHistory, // NEW: Import game history function
  playGame,
  toggleGamePublication,
  toggleGameStatus,
  updateGame,
} from '../controller/gameWheel.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// NEW: Get user's game history - MUST be before other routes
router.get('/my-history', getUserGameHistory)

// Get available games for customers
router.get('/available', getAvailableGames)

// Play a game - MUST be before generic /:gameId route
router.post('/:gameId/play', playGame)

// Get all games (management view)
router.get('/', getAllGames)

// Create a new game
router.post('/', createGame)

// Toggle game active status
router.patch('/:gameId/toggle-status', toggleGameStatus)

// Toggle game publication status
router.patch('/:gameId/toggle-publication', toggleGamePublication)

// Get game analytics (includes play history)
router.get('/:gameId/analytics', getGameAnalytics)

// Get a specific game
router.get('/:gameId', getGame)

// Update a game
router.put('/:gameId', updateGame)

// Delete a game
router.delete('/:gameId', deleteGame)

export default router
