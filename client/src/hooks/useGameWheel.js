// File: client/src/hooks/useGameWheel.js
import { setPoints } from '@/redux/userSlice'
import { gameWheelService } from '@/services/gameWheelService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

// Query Keys
export const gameWheelQueryKeys = {
  all: ['gameWheel'],
  games: () => ['gameWheel', 'games'],
  gamesList: (params) => ['gameWheel', 'games', 'list', params],
  game: (gameId) => ['gameWheel', 'games', gameId],
  available: () => ['gameWheel', 'available'],
  availableList: (params) => ['gameWheel', 'available', 'list', params],
  analytics: (gameId) => ['gameWheel', 'analytics', gameId],
}

// =====================================
// QUERY HOOKS
// =====================================

// Get available games for user
export const useAvailableGames = (params = {}, options = {}) => {
  return useQuery({
    queryKey: gameWheelQueryKeys.availableList(params),
    queryFn: () => gameWheelService.getAvailableGames(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.data,
    ...options,
  })
}

// Get all games (management view)
export const useAllGames = (params = {}, options = {}) => {
  return useQuery({
    queryKey: gameWheelQueryKeys.gamesList(params),
    queryFn: () => gameWheelService.getAllGames(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    select: (data) => data.data,
    enabled: options.enabled !== false,
    ...options,
  })
}

// Get a specific game
export const useGame = (gameId, options = {}) => {
  return useQuery({
    queryKey: gameWheelQueryKeys.game(gameId),
    queryFn: () => gameWheelService.getGame(gameId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data.game,
    enabled: !!gameId && options.enabled !== false,
    ...options,
  })
}

// Get game analytics
export const useGameAnalytics = (gameId, options = {}) => {
  return useQuery({
    queryKey: gameWheelQueryKeys.analytics(gameId),
    queryFn: () => gameWheelService.getGameAnalytics(gameId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.data.analytics,
    enabled: !!gameId && options.enabled !== false,
    ...options,
  })
}

// =====================================
// MUTATION HOOKS
// =====================================

// Create a new game
export const useCreateGame = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: gameWheelService.createGame,
    onSuccess: (data, variables) => {
      // Invalidate games list
      queryClient.invalidateQueries({ queryKey: gameWheelQueryKeys.games() })
      // Invalidate available games
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.available(),
      })

      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      console.error('Error creating game:', error)
      options.onError?.(error)
    },
  })
}

// Update a game
export const useUpdateGame = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ gameId, gameData }) =>
      gameWheelService.updateGame(gameId, gameData),
    onSuccess: (data, variables) => {
      const { gameId } = variables

      // Update the specific game in cache
      queryClient.setQueryData(gameWheelQueryKeys.game(gameId), data)
      // Invalidate games list
      queryClient.invalidateQueries({ queryKey: gameWheelQueryKeys.games() })
      // Invalidate available games
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.available(),
      })

      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      console.error('Error updating game:', error)
      options.onError?.(error)
    },
  })
}

// Delete a game
export const useDeleteGame = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: gameWheelService.deleteGame,
    onSuccess: (data, gameId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: gameWheelQueryKeys.game(gameId) })
      // Invalidate games list
      queryClient.invalidateQueries({ queryKey: gameWheelQueryKeys.games() })
      // Invalidate available games
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.available(),
      })

      options.onSuccess?.(data, gameId)
    },
    onError: (error) => {
      console.error('Error deleting game:', error)
      options.onError?.(error)
    },
  })
}

// Play a game
export const usePlayGame = (options = {}) => {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: gameWheelService.playGame,
    onSuccess: (data, gameId) => {
      const newBalance = data?.data?.result?.newPointsBalance
      if (typeof newBalance === 'number') {
        dispatch(setPoints(newBalance))
        queryClient.setQueryData(['auth', 'me'], (old) => {
          if (old?.data?.user) {
            return {
              ...old,
              data: {
                ...old.data,
                user: {
                  ...old.data.user,
                  points: newBalance,
                },
              },
            }
          }
          return old
        })
      }

      // Invalidate game analytics
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.analytics(gameId),
      })
      // Invalidate the specific game (to update play count)
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.game(gameId),
      })
      // Invalidate available games so eligibility + plays remaining updates
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.available(),
      })

      options.onSuccess?.(data, gameId)
    },
    onError: (error) => {
      console.error('Error playing game:', error)
      options.onError?.(error)
    },
  })
}

// Toggle game status (active/inactive)
export const useToggleGameStatus = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: gameWheelService.toggleGameStatus,
    onSuccess: (data, gameId) => {
      // Invalidate games list
      queryClient.invalidateQueries({ queryKey: gameWheelQueryKeys.games() })
      // Invalidate available games
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.available(),
      })
      // Invalidate the specific game
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.game(gameId),
      })

      options.onSuccess?.(data, gameId)
    },
    onError: (error) => {
      console.error('Error toggling game status:', error)
      options.onError?.(error)
    },
  })
}

// Toggle game publication status
export const useToggleGamePublication = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: gameWheelService.toggleGamePublication,
    onSuccess: (data, gameId) => {
      // Invalidate games list
      queryClient.invalidateQueries({ queryKey: gameWheelQueryKeys.games() })
      // Invalidate available games
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.available(),
      })
      // Invalidate the specific game
      queryClient.invalidateQueries({
        queryKey: gameWheelQueryKeys.game(gameId),
      })

      options.onSuccess?.(data, gameId)
    },
    onError: (error) => {
      console.error('Error toggling game publication:', error)
      options.onError?.(error)
    },
  })
}

// =====================================
// UTILITY HOOKS
// =====================================

// Get games with filtering and sorting
export const useGamesWithFilters = (initialFilters = {}, options = {}) => {
  const { data: gamesData, ...queryResult } = useAllGames(
    initialFilters,
    options
  )

  const processedData = gamesData
    ? {
        ...gamesData,
        games:
          gamesData.games?.map((game) => ({
            ...game,
            // Add computed properties
            isCurrentlyActive: game.isActive && game.isPublished,
            totalProbability:
              game.type === 'scratch'
                ? game.items
                    ?.filter((item) => item.isActive)
                    .reduce((sum, item) => sum + (item.probability || 0), 0)
                : null,
            activeItemsCount:
              game.items?.filter((item) => item.isActive).length || 0,
          })) || [],
      }
    : null

  return {
    ...queryResult,
    data: processedData,
    games: processedData?.games || [],
    totalPages: processedData?.totalPages || 0,
    currentPage: processedData?.currentPage || 1,
    results: processedData?.results || 0,
  }
}

// Prefetch game data
export const usePrefetchGameData = () => {
  const queryClient = useQueryClient()

  return {
    prefetchGames: (params = {}) => {
      queryClient.prefetchQuery({
        queryKey: gameWheelQueryKeys.gamesList(params),
        queryFn: () => gameWheelService.getAllGames(params),
        staleTime: 1 * 60 * 1000,
      })
    },
    prefetchAvailableGames: (params = {}) => {
      queryClient.prefetchQuery({
        queryKey: gameWheelQueryKeys.availableList(params),
        queryFn: () => gameWheelService.getAvailableGames(params),
        staleTime: 2 * 60 * 1000,
      })
    },
    prefetchGame: (gameId) => {
      queryClient.prefetchQuery({
        queryKey: gameWheelQueryKeys.game(gameId),
        queryFn: () => gameWheelService.getGame(gameId),
        staleTime: 5 * 60 * 1000,
      })
    },
  }
}

// Get game statistics
export const useGameStats = (params = {}, options = {}) => {
  const { data: gamesData } = useAllGames(params, options)

  const stats = gamesData
    ? {
        totalGames: gamesData.results || 0,
        scratchCards:
          gamesData.games?.filter((game) => game.type === 'scratch').length ||
          0,
        spinWheels:
          gamesData.games?.filter((game) => game.type === 'spin').length || 0,
        activeGames:
          gamesData.games?.filter((game) => game.isActive).length || 0,
        publishedGames:
          gamesData.games?.filter((game) => game.isPublished).length || 0,
        totalPlays:
          gamesData.games?.reduce(
            (sum, game) => sum + (game.totalPlays || 0),
            0
          ) || 0,
        totalRewards:
          gamesData.games?.reduce(
            (sum, game) => sum + (game.totalRewardsGiven || 0),
            0
          ) || 0,
      }
    : null

  return {
    stats,
    isLoading: !gamesData,
  }
}
