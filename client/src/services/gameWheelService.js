// File: client/src/services/gameWheelService.js - FIXED
import { axiosInstance } from '@/config'

export const gameWheelService = {
  // Get available games for user's location
  getAvailableGames: async (params = {}) => {
    try {
      const { type } = params
      console.log('Fetching available games with params:', params)

      const response = await axiosInstance.get('/games/available', {
        params: { type },
      })

      console.log('Available games response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error fetching available games:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Get all games (admin/management view)
  getAllGames: async (params = {}) => {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        locationId,
        isActive,
        isPublished,
        category,
      } = params

      console.log('Fetching all games with params:', params)

      const response = await axiosInstance.get('/games', {
        params: {
          page,
          limit,
          type,
          locationId,
          isActive,
          isPublished,
          category,
        },
      })

      console.log('All games response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error fetching all games:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Get a specific game by ID
  getGame: async (gameId) => {
    try {
      console.log('Fetching game:', gameId)
      const response = await axiosInstance.get(`/games/${gameId}`)
      console.log('Game response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error fetching game:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Create a new game
  createGame: async (gameData) => {
    try {
      console.log('Creating game with data:', gameData)
      const response = await axiosInstance.post('/games', gameData)
      console.log('Create game response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error creating game:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Update a game
  updateGame: async (gameId, gameData) => {
    try {
      console.log('Updating game:', gameId, 'with data:', gameData)
      const response = await axiosInstance.put(`/games/${gameId}`, gameData)
      console.log('Update game response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error updating game:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Delete a game
  deleteGame: async (gameId) => {
    try {
      console.log('Deleting game:', gameId)
      const response = await axiosInstance.delete(`/games/${gameId}`)
      console.log('Delete game response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error deleting game:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Play a game
  playGame: async (gameId) => {
    try {
      console.log('Playing game:', gameId)
      const response = await axiosInstance.post(`/games/${gameId}/play`)
      console.log('Play game response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error playing game:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Toggle game active status
  toggleGameStatus: async (gameId) => {
    try {
      console.log('Toggling game status:', gameId)
      const response = await axiosInstance.patch(
        `/games/${gameId}/toggle-status`
      )
      console.log('Toggle status response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error toggling game status:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Toggle game publication status
  toggleGamePublication: async (gameId) => {
    try {
      console.log('Toggling game publication:', gameId)
      const response = await axiosInstance.patch(
        `/games/${gameId}/toggle-publication`
      )
      console.log('Toggle publication response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error toggling game publication:',
        error.response?.data || error.message
      )
      throw error
    }
  },

  // Get game analytics
  getGameAnalytics: async (gameId) => {
    try {
      console.log('Fetching game analytics:', gameId)
      const response = await axiosInstance.get(`/games/${gameId}/analytics`)
      console.log('Analytics response:', response.data)
      return response.data
    } catch (error) {
      console.error(
        'Error fetching game analytics:',
        error.response?.data || error.message
      )
      throw error
    }
  },
}
