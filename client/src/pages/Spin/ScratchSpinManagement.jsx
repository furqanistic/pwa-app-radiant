// File: client/src/pages/Spin/ScratchSpinManagement.jsx - FIXED WITH PROPER UPDATES AND NOTIFICATIONS
import {
    useAllGames,
    useCreateGame,
    useDeleteGame,
    useUpdateGame,
} from '@/hooks/useGameWheel';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Calendar,
    Check,
    Clock,
    Edit3,
    Info,
    Loader2,
    MapPin,
    Palette,
    Plus,
    RotateCcw,
    Save,
    Settings,
    Sparkles,
    Ticket,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner'; // Add this import for notifications
import Layout from '../Layout/Layout';

const ScratchSpinManagement = () => {
  const [activeTab, setActiveTab] = useState('spin')
  const [userData, setUserData] = useState({})
  const [isTeamUser, setIsTeamUser] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsGameType, setSettingsGameType] = useState(null)

  const [games, setGames] = useState({ spin: null, scratch: null })
  const [editingItem, setEditingItem] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({
    title: '',
    value: '',
    probability: 10,
    color: '#6366F1',
    valueType: 'points',
  })

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setUserData(user)
    setIsTeamUser(user.role === 'spa')
  }, [])

  const {
    data: gamesData,
    isLoading,
    error,
    refetch,
  } = useAllGames({ limit: 100 })

  // FIXED: Enhanced mutation with proper success handling
  const createGameMutation = useCreateGame({
    onSuccess: (data) => {
      refetch()
      toast.success('Game created successfully!', {
        description: 'Your new game has been set up and is ready to use.',
        duration: 3000,
      })
    },
    onError: (error) => {
      toast.error('Failed to create game', {
        description: error.response?.data?.message || error.message,
        duration: 4000,
      })
    },
  })

  const updateGameMutation = useUpdateGame({
    onSuccess: (data) => {
      refetch()
      toast.success('Game updated successfully!', {
        description: 'Your game settings have been saved.',
        duration: 3000,
      })
    },
    onError: (error) => {
      toast.error('Failed to update game', {
        description: error.response?.data?.message || error.message,
        duration: 4000,
      })
    },
  })

  const deleteGameMutation = useDeleteGame({
    onSuccess: () => {
      refetch()
      toast.success('Game deleted successfully!', {
        description: 'The game has been removed.',
        duration: 3000,
      })
    },
    onError: (error) => {
      toast.error('Failed to delete game', {
        description: error.response?.data?.message || error.message,
        duration: 4000,
      })
    },
  })

  useEffect(() => {
    if (gamesData?.games) {
      const spinGame = gamesData.games.find((game) => game.type === 'spin')
      const scratchGame = gamesData.games.find(
        (game) => game.type === 'scratch'
      )

      setGames({
        spin: spinGame
          ? {
              ...spinGame,
              items:
                spinGame.items?.filter((item) => item?.title && item?.value) ||
                [],
            }
          : null,
        scratch: scratchGame
          ? {
              ...scratchGame,
              items:
                scratchGame.items?.filter(
                  (item) => item?.title && item?.value
                ) || [],
            }
          : null,
      })
    }
  }, [gamesData])

  // FIXED: Improved saveGame function with better error handling
  const saveGame = async (gameType, items, gameSettings = null) => {
    try {
      const validItems = items
        .filter((item) => item?.title?.trim() && item?.value?.trim())
        .map((item) => ({
          title: item.title.trim(),
          value: item.value.trim(),
          valueType: item.valueType || 'points',
          color: item.color || '#6366F1',
          isActive: item.isActive !== false,
          ...(gameType === 'scratch' && {
            probability: item.probability || 10,
          }),
          ...(item._id && { _id: item._id }),
        }))

      if (validItems.length === 0) {
        toast.error('Please add at least one valid item')
        return false
      }

      if (gameType === 'scratch') {
        const totalProbability = validItems.reduce(
          (sum, item) => sum + (item.probability || 0),
          0
        )
        if (totalProbability > 100) {
          toast.error('Total probability cannot exceed 100%')
          return false
        }
      }

      // FIXED: Properly merge settings with existing settings
      const existingGame = games[gameType]
      let finalSettings = gameSettings

      if (!finalSettings && existingGame?.settings) {
        // Use existing settings if no new settings provided
        finalSettings = existingGame.settings
      } else if (!finalSettings) {
        // Create default settings
        finalSettings =
          gameType === 'scratch'
            ? {
                scratchSettings: {
                  maxPlaysPerUser: 1,
                  resetPeriod: 'daily',
                  requirePoints: 10,
                },
              }
            : {
                spinSettings: {
                  maxSpinsPerUser: 1,
                  resetPeriod: 'daily',
                  requirePoints: 10,
                  spinDuration: 3000,
                },
              }
      } else {
        // Merge new settings with existing settings structure
        if (existingGame?.settings) {
          finalSettings = {
            ...existingGame.settings,
            ...finalSettings,
          }
        }
      }

      const gameData = {
        title: `${gameType === 'spin' ? 'Spin Wheel' : 'Scratch Card'} Game`,
        description: `${
          gameType === 'spin' ? 'Spin wheel' : 'Scratch card'
        } game for ${
          userData.spaLocation?.locationName ||
          userData.selectedLocation?.locationName ||
          'your spa'
        }`,
        type: gameType,
        items: validItems,
        settings: finalSettings,
        isActive: true,
        isPublished: true,
      }

      if (existingGame) {
        await updateGameMutation.mutateAsync({
          gameId: existingGame.id || existingGame._id,
          gameData,
        })
      } else {
        await createGameMutation.mutateAsync(gameData)
      }

      return true
    } catch (error) {
      console.error('Error saving game:', error)
      toast.error('Failed to save game', {
        description: error.response?.data?.message || error.message,
        duration: 4000,
      })
      return false
    }
  }

  const handleAddItem = async () => {
    if (!newItem.title?.trim() || !newItem.value?.trim()) {
      toast.error('Title and value are required')
      return
    }

    const currentItems = games[activeTab]?.items || []
    const updatedItems = [
      ...currentItems,
      {
        title: newItem.title.trim(),
        value: newItem.value.trim(),
        valueType: newItem.valueType || 'points',
        color: newItem.color || '#6366F1',
        isActive: true,
        ...(activeTab === 'scratch' && {
          probability: newItem.probability || 10,
        }),
      },
    ]

    const success = await saveGame(activeTab, updatedItems)
    if (success) {
      setNewItem({
        title: '',
        value: '',
        probability: 10,
        color: '#6366F1',
        valueType: 'points',
      })
      setShowAddForm(false)
    }
  }

  const handleEditItem = (item) => {
    setEditingItem({ ...item })
  }

  const handleSaveEdit = async () => {
    if (!editingItem?.title?.trim() || !editingItem?.value?.trim()) {
      toast.error('Title and value are required')
      return
    }

    const currentItems = games[activeTab]?.items || []
    const updatedItems = currentItems.map((item) =>
      item._id === editingItem._id || item.id === editingItem.id
        ? editingItem
        : item
    )

    const success = await saveGame(activeTab, updatedItems)
    if (success) {
      setEditingItem(null)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const currentItems = games[activeTab]?.items || []
    const updatedItems = currentItems.filter(
      (item) => item._id !== itemId && item.id !== itemId
    )

    await saveGame(activeTab, updatedItems)
  }

  // FIXED: Enhanced handleSaveSettings with proper success feedback
  const handleSaveSettings = async (gameType, newSettings) => {
    try {
      const currentItems = games[gameType]?.items || []

      // FIXED: Properly structure the settings object
      const settingsWrapper =
        gameType === 'scratch'
          ? { scratchSettings: newSettings }
          : { spinSettings: newSettings }

      const success = await saveGame(gameType, currentItems, settingsWrapper)

      if (success) {
        setShowSettingsModal(false)
        setSettingsGameType(null)

        // Additional success notification for settings
        toast.success(
          `${
            gameType === 'scratch' ? 'Scratch Card' : 'Spin Wheel'
          } Settings Updated!`,
          {
            description: `Play frequency and limits have been configured successfully.`,
            duration: 3000,
            action: {
              label: 'View',
              onClick: () => {
                // Optionally scroll to or highlight the updated settings
                console.log('Settings updated for', gameType)
              },
            },
          }
        )
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings', {
        description: error.response?.data?.message || error.message,
        duration: 4000,
      })
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4' />
            <p className='text-gray-600 text-lg'>Loading games...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Handle error - like when team user doesn't have location configured
  if (error) {
    return (
      <Layout>
        <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
          <div className='text-center max-w-md mx-auto'>
            <div className='w-16 h-16 bg-red-100 rounded-2xl mx-auto mb-4 flex items-center justify-center'>
              <AlertTriangle className='w-8 h-8 text-red-600' />
            </div>
            <h3 className='text-xl font-semibold text-gray-900 mb-2'>
              Configuration Required
            </h3>
            <p className='text-gray-600 mb-6 text-sm'>
              Your spa location needs to be configured before you can manage
              games. Please contact support to set up your location.
            </p>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className='inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors'
            >
              <MapPin className='w-4 h-4' />
              Go to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const currentItems = games[activeTab]?.items || []
  const totalProbability =
    activeTab === 'scratch'
      ? currentItems.reduce((sum, item) => sum + (item.probability || 0), 0)
      : 0

  const isSaving =
    createGameMutation.isPending ||
    updateGameMutation.isPending ||
    deleteGameMutation.isPending

  const location = gamesData?.location

  return (
    <Layout>
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='mb-8'>
            <div className='flex items-center gap-3 mb-4'>
              <div>
                <h1 className='text-3xl font-bold text-gray-900'>
                  Game Management
                </h1>
                <p className='text-gray-600 mt-1'>
                  Configure your spin wheel and scratch card games
                </p>
              </div>
            </div>

            {/* Location Info */}
            {location && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
                <div className='flex items-center gap-2 text-blue-800'>
                  <MapPin className='w-4 h-4' />
                  <span className='font-medium'>Managing games for:</span>
                  <span className='font-semibold'>{location.locationName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile tab selector */}
          <div className='flex bg-white rounded-xl border border-gray-200 p-1 mb-6 lg:hidden'>
            <button
              onClick={() => setActiveTab('spin')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'spin'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              <RotateCcw className='w-4 h-4' />
              Spin Wheel
            </button>
            <button
              onClick={() => setActiveTab('scratch')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'scratch'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              <Ticket className='w-4 h-4' />
              Scratch Card
            </button>
          </div>

          {/* Game sections */}
          <div className='lg:grid lg:grid-cols-2 lg:gap-8'>
            <GameSection
              gameType='spin'
              icon={<RotateCcw className='w-6 h-6 text-indigo-600' />}
              title='Spin Wheel Items'
              items={games.spin?.items || []}
              settings={games.spin?.settings?.spinSettings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              editingItem={editingItem}
              showAddForm={showAddForm}
              setShowAddForm={setShowAddForm}
              newItem={newItem}
              setNewItem={setNewItem}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onSaveEdit={handleSaveEdit}
              onDeleteItem={handleDeleteItem}
              setEditingItem={setEditingItem}
              isSaving={isSaving}
              showProbability={false}
              onOpenSettings={() => {
                setSettingsGameType('spin')
                setShowSettingsModal(true)
              }}
            />

            <GameSection
              gameType='scratch'
              icon={<Ticket className='w-6 h-6 text-indigo-600' />}
              title='Scratch Card Items'
              items={games.scratch?.items || []}
              settings={games.scratch?.settings?.scratchSettings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              editingItem={editingItem}
              showAddForm={showAddForm}
              setShowAddForm={setShowAddForm}
              newItem={newItem}
              setNewItem={setNewItem}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onSaveEdit={handleSaveEdit}
              onDeleteItem={handleDeleteItem}
              setEditingItem={setEditingItem}
              isSaving={isSaving}
              showProbability={true}
              totalProbability={totalProbability}
              onOpenSettings={() => {
                setSettingsGameType('scratch')
                setShowSettingsModal(true)
              }}
            />
          </div>
        </div>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettingsModal && settingsGameType && (
            <SettingsModal
              gameType={settingsGameType}
              currentSettings={
                games[settingsGameType]?.settings?.[
                  `${settingsGameType}Settings`
                ]
              }
              onSave={handleSaveSettings}
              onClose={() => {
                setShowSettingsModal(false)
                setSettingsGameType(null)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  )
}

// Keep all other components (GameSection, SettingsModal, etc.) exactly the same...
const GameSection = ({
  gameType,
  icon,
  title,
  items,
  settings,
  activeTab,
  setActiveTab,
  editingItem,
  showAddForm,
  setShowAddForm,
  newItem,
  setNewItem,
  onAddItem,
  onEditItem,
  onSaveEdit,
  onDeleteItem,
  setEditingItem,
  isSaving,
  showProbability,
  totalProbability = 0,
  onOpenSettings,
}) => {
  const isActive = activeTab === gameType
  const shouldShow = isActive || window.innerWidth >= 1024

  if (!shouldShow) return null

  const formatResetPeriod = (period) => {
    switch (period) {
      case 'daily':
        return 'Daily'
      case 'weekly':
        return 'Weekly'
      case 'monthly':
        return 'Monthly'
      case 'never':
        return 'No Limit'
      default:
        return period
    }
  }

  return (
    <div className={`${isActive ? 'block' : 'hidden'} lg:block`}>
      <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            {icon}
            <h2 className='text-xl font-semibold text-gray-900'>{title}</h2>
            <span className='px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm font-medium'>
              {items.length} items
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            className='flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors'
          >
            <Settings className='w-4 h-4' />
            Play Settings
          </button>
        </div>

        {/* Current Settings Display */}
        {settings && (
          <div className='bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6'>
            <div className='flex items-center gap-2 mb-3'>
              <Clock className='w-4 h-4 text-indigo-600' />
              <h3 className='font-medium text-indigo-900'>
                Current Play Settings
              </h3>
            </div>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-indigo-700 font-medium'>
                  Plays per user:
                </span>
                <span className='ml-2 text-indigo-600'>
                  {gameType === 'spin'
                    ? settings.maxSpinsPerUser
                    : settings.maxPlaysPerUser}
                </span>
              </div>
              <div>
                <span className='text-indigo-700 font-medium'>Reset:</span>
                <span className='ml-2 text-indigo-600'>
                  {formatResetPeriod(settings.resetPeriod)}
                </span>
              </div>
              <div>
                <span className='text-indigo-700 font-medium'>
                  Points required:
                </span>
                <span className='ml-2 text-indigo-600'>
                  {settings.requirePoints}
                </span>
              </div>
              {gameType === 'spin' && settings.spinDuration && (
                <div>
                  <span className='text-indigo-700 font-medium'>
                    Spin duration:
                  </span>
                  <span className='ml-2 text-indigo-600'>
                    {settings.spinDuration}ms
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {showProbability && totalProbability > 100 && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 text-red-500' />
              <p className='text-red-800 text-sm font-medium'>
                Total probability is {totalProbability}%. Should be 100% or
                less.
              </p>
            </div>
          </div>
        )}

        <div className='space-y-3 mb-6'>
          {items.map((item, index) => (
            <motion.div
              key={item._id || item.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-gray-200 transition-colors'
            >
              {editingItem?.id === (item._id || item.id) &&
              activeTab === gameType ? (
                <EditItemForm
                  item={editingItem}
                  setItem={setEditingItem}
                  onSave={onSaveEdit}
                  onCancel={() => setEditingItem(null)}
                  showProbability={showProbability}
                />
              ) : (
                <ItemDisplay
                  item={item}
                  onEdit={() => {
                    setActiveTab(gameType)
                    onEditItem({ ...item, id: item._id || item.id })
                  }}
                  onDelete={() => {
                    setActiveTab(gameType)
                    onDeleteItem(item._id || item.id)
                  }}
                  showProbability={showProbability}
                />
              )}
            </motion.div>
          ))}
        </div>

        {showAddForm && activeTab === gameType ? (
          <AddItemForm
            item={newItem}
            setItem={setNewItem}
            onAdd={onAddItem}
            onCancel={() => setShowAddForm(false)}
            showProbability={showProbability}
            totalProbability={totalProbability}
            isSaving={isSaving}
          />
        ) : (
          <button
            onClick={() => {
              setActiveTab(gameType)
              setShowAddForm(true)
            }}
            className='w-full py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2'
          >
            <Plus className='w-5 h-5' />
            Add {gameType === 'spin' ? 'Spin' : 'Scratch'} Item
          </button>
        )}

        {showProbability && (
          <div className='mt-6 flex justify-center'>
            <span
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                totalProbability === 100
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : totalProbability < 100
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              Total Probability: {totalProbability}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Enhanced Settings Modal - PWA Responsive Design
const SettingsModal = ({ gameType, currentSettings, onSave, onClose }) => {
  // FIXED: Initialize settings with correct field names based on game type
  const [settings, setSettings] = useState(() => {
    if (gameType === 'spin') {
      return {
        maxSpinsPerUser:
          currentSettings?.maxSpinsPerUser ||
          currentSettings?.maxPlaysPerUser ||
          1,
        resetPeriod: currentSettings?.resetPeriod || 'daily',
        requirePoints: currentSettings?.requirePoints || 10,
        spinDuration: currentSettings?.spinDuration || 3000,
      }
    } else {
      return {
        maxPlaysPerUser: currentSettings?.maxPlaysPerUser || 1,
        resetPeriod: currentSettings?.resetPeriod || 'daily',
        requirePoints: currentSettings?.requirePoints || 10,
      }
    }
  })

  const handleSave = () => {
    console.log('Saving settings for', gameType, ':', settings)
    onSave(gameType, settings)
  }

  const resetPeriodOptions = [
    { value: 'daily', label: 'Daily', icon: '📅' },
    { value: 'weekly', label: 'Weekly', icon: '📆' },
    { value: 'monthly', label: 'Monthly', icon: '🗓️' },
    { value: 'never', label: 'Unlimited', icon: '♾️' },
  ]

  const formatResetDescription = (period) => {
    switch (period) {
      case 'daily':
        return 'Resets every day at midnight'
      case 'weekly':
        return 'Resets every Sunday at midnight'
      case 'monthly':
        return 'Resets on the 1st of each month'
      case 'never':
        return 'No reset - one-time play limit'
      default:
        return period
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className='bg-white w-full h-[85vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl flex flex-col overflow-hidden border-t sm:border border-gray-200'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className='flex justify-center pt-3 pb-2 sm:hidden'>
          <div className='w-12 h-1 bg-gray-300 rounded-full'></div>
        </div>

        {/* Header */}
        <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gray-50 sm:bg-white'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center'>
              {gameType === 'spin' ? (
                <RotateCcw className='w-4 h-4 sm:w-5 sm:h-5 text-indigo-600' />
              ) : (
                <Ticket className='w-4 h-4 sm:w-5 sm:h-5 text-indigo-600' />
              )}
            </div>
            <div>
              <h2 className='text-lg sm:text-xl font-semibold text-gray-900'>
                {gameType === 'spin' ? '🎯 Spin' : '🎫 Scratch'} Settings
              </h2>
              <p className='text-xs sm:text-sm text-gray-600'>
                Control play frequency
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className='flex-1 overflow-y-auto p-4 sm:p-6 space-y-6'>
          {/* Plays per User - FIXED: Use correct field name based on game type */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Users className='w-4 h-4 text-gray-500' />
              <label className='text-sm font-medium text-gray-700'>
                Plays per customer
              </label>
            </div>
            <div className='flex items-center gap-3 bg-gray-50 p-3 rounded-lg'>
              <input
                type='range'
                min='1'
                max='10'
                value={
                  gameType === 'spin'
                    ? settings.maxSpinsPerUser
                    : settings.maxPlaysPerUser
                }
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (gameType === 'spin') {
                    setSettings({ ...settings, maxSpinsPerUser: value })
                  } else {
                    setSettings({ ...settings, maxPlaysPerUser: value })
                  }
                }}
                className='flex-1 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer'
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${
                    (gameType === 'spin'
                      ? settings.maxSpinsPerUser
                      : settings.maxPlaysPerUser) * 10
                  }%, #e5e7eb ${
                    (gameType === 'spin'
                      ? settings.maxSpinsPerUser
                      : settings.maxPlaysPerUser) * 10
                  }%, #e5e7eb 100%)`,
                }}
              />
              <div className='min-w-[3rem] text-center'>
                <span className='text-lg font-bold text-indigo-600'>
                  {gameType === 'spin'
                    ? settings.maxSpinsPerUser
                    : settings.maxPlaysPerUser}
                </span>
                <div className='text-xs text-gray-500'>plays</div>
              </div>
            </div>
            <p className='text-xs text-gray-500 px-1'>
              How many times each customer can play per period
            </p>
          </div>

          {/* Reset Period */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Calendar className='w-4 h-4 text-gray-500' />
              <label className='text-sm font-medium text-gray-700'>
                Reset frequency
              </label>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {resetPeriodOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    settings.resetPeriod === option.value
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <input
                    type='radio'
                    value={option.value}
                    checked={settings.resetPeriod === option.value}
                    onChange={(e) =>
                      setSettings({ ...settings, resetPeriod: e.target.value })
                    }
                    className='sr-only'
                  />
                  <span className='text-lg mb-1'>{option.icon}</span>
                  <span className='font-medium text-sm'>{option.label}</span>
                </label>
              ))}
            </div>
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
              <p className='text-xs text-blue-700'>
                <Clock className='w-3 h-3 inline mr-1' />
                {formatResetDescription(settings.resetPeriod)}
              </p>
            </div>
          </div>

          {/* Points Required */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Sparkles className='w-4 h-4 text-gray-500' />
              <label className='text-sm font-medium text-gray-700'>
                Points cost
              </label>
            </div>
            <div className='flex items-center gap-3 bg-gray-50 p-3 rounded-lg'>
              <span className='text-sm text-gray-600'>Free</span>
              <input
                type='range'
                min='0'
                max='100'
                step='5'
                value={settings.requirePoints}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    requirePoints: parseInt(e.target.value),
                  })
                }
                className='flex-1 h-2 bg-pink-200 rounded-lg appearance-none cursor-pointer'
                style={{
                  background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${settings.requirePoints}%, #e5e7eb ${settings.requirePoints}%, #e5e7eb 100%)`,
                }}
              />
              <span className='text-sm text-gray-600'>100</span>
            </div>
            <div className='text-center'>
              <span className='text-2xl font-bold text-pink-600'>
                {settings.requirePoints}
              </span>
              <span className='text-sm text-gray-500 ml-1'>
                points per play
              </span>
            </div>
          </div>

          {/* Spin Duration (Spin Wheel Only) */}
          {gameType === 'spin' && (
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <RotateCcw className='w-4 h-4 text-gray-500' />
                <label className='text-sm font-medium text-gray-700'>
                  Spin duration
                </label>
              </div>
              <div className='flex items-center gap-3 bg-gray-50 p-3 rounded-lg'>
                <span className='text-xs text-gray-600'>1s</span>
                <input
                  type='range'
                  min='1000'
                  max='8000'
                  step='500'
                  value={settings.spinDuration}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      spinDuration: parseInt(e.target.value),
                    })
                  }
                  className='flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer'
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${
                      ((settings.spinDuration - 1000) / 7000) * 100
                    }%, #e5e7eb ${
                      ((settings.spinDuration - 1000) / 7000) * 100
                    }%, #e5e7eb 100%)`,
                  }}
                />
                <span className='text-xs text-gray-600'>8s</span>
              </div>
              <div className='text-center'>
                <span className='text-lg font-bold text-green-600'>
                  {settings.spinDuration / 1000}s
                </span>
                <span className='text-sm text-gray-500 ml-1'>spin time</span>
              </div>
            </div>
          )}

          {/* Preview Summary */}
          <div className='bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <Info className='w-4 h-4 text-indigo-600' />
              <span className='font-medium text-indigo-900 text-sm'>
                Quick Summary
              </span>
            </div>
            <div className='space-y-2 text-sm text-indigo-700'>
              <div className='flex justify-between'>
                <span>Plays allowed:</span>
                <span className='font-medium'>
                  {gameType === 'spin'
                    ? settings.maxSpinsPerUser
                    : settings.maxPlaysPerUser}{' '}
                  per{' '}
                  {settings.resetPeriod === 'never'
                    ? 'total'
                    : settings.resetPeriod}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Cost per play:</span>
                <span className='font-medium'>
                  {settings.requirePoints} points
                </span>
              </div>
              {gameType === 'spin' && (
                <div className='flex justify-between'>
                  <span>Spin duration:</span>
                  <span className='font-medium'>
                    {settings.spinDuration / 1000}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className='flex gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 sm:bg-white'>
          <button
            onClick={onClose}
            className='flex-1 py-3 px-4 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className='flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base'
          >
            <Save className='w-4 h-4' />
            Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Keep existing ItemDisplay, EditItemForm, and AddItemForm components...
const ItemDisplay = ({ item, onEdit, onDelete, showProbability }) => {
  if (!item?.title || !item?.value) {
    return (
      <div className='flex items-center gap-4 text-red-500 text-sm'>
        <div className='w-5 h-5 rounded-md bg-red-200 flex-shrink-0' />
        <div className='flex-1'>
          <p>Invalid item - missing title or value</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex items-center gap-4'>
      <div
        className='w-5 h-5 rounded-md border-2 border-white ring-1 ring-gray-200 flex-shrink-0'
        style={{ backgroundColor: item.color || '#6366F1' }}
      />
      <div className='flex-1 min-w-0'>
        <h3 className='font-medium text-gray-900 truncate'>{item.title}</h3>
        <div className='flex items-center gap-3 mt-1'>
          <span className='text-sm text-gray-600'>
            {item.value} {item.valueType || 'points'}
          </span>
          {showProbability && (
            <span className='px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium'>
              {item.probability || 0}%
            </span>
          )}
        </div>
      </div>
      <div className='flex gap-2'>
        <button
          onClick={onEdit}
          className='p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
        >
          <Edit3 className='w-4 h-4' />
        </button>
        <button
          onClick={onDelete}
          className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
        >
          <Trash2 className='w-4 h-4' />
        </button>
      </div>
    </div>
  )
}

const EditItemForm = ({ item, setItem, onSave, onCancel, showProbability }) => {
  return (
    <div className='space-y-4'>
      <input
        type='text'
        value={item.title || ''}
        onChange={(e) => setItem({ ...item, title: e.target.value })}
        className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
        placeholder='Item name'
      />
      <div className='grid grid-cols-3 gap-3'>
        <input
          type='text'
          value={item.value || ''}
          onChange={(e) => setItem({ ...item, value: e.target.value })}
          className='col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
          placeholder='Value'
        />
        <select
          value={item.valueType || 'points'}
          onChange={(e) => setItem({ ...item, valueType: e.target.value })}
          className='px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white'
        >
          <option value='points'>Points</option>
          <option value='discount'>Discount</option>
          <option value='service'>Service</option>
          <option value='prize'>Prize</option>
        </select>
      </div>
      {showProbability && (
        <input
          type='number'
          min='0'
          max='100'
          value={item.probability || 0}
          onChange={(e) =>
            setItem({ ...item, probability: parseInt(e.target.value) || 0 })
          }
          className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
          placeholder='Probability %'
        />
      )}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Palette className='w-4 h-4 text-gray-500' />
          <input
            type='color'
            value={item.color || '#6366F1'}
            onChange={(e) => setItem({ ...item, color: e.target.value })}
            className='w-10 h-8 border border-gray-300 rounded cursor-pointer'
          />
        </div>
        <div className='flex gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className='px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors'
          >
            <Save className='w-3 h-3' />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

const AddItemForm = ({
  item,
  setItem,
  onAdd,
  onCancel,
  showProbability,
  totalProbability = 0,
  isSaving,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4'
    >
      <div className='flex items-center justify-between'>
        <h3 className='font-medium text-gray-900'>Add New Item</h3>
        <button
          onClick={onCancel}
          className='p-1 text-gray-400 hover:text-gray-600 rounded'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      <input
        type='text'
        value={item.title || ''}
        onChange={(e) => setItem({ ...item, title: e.target.value })}
        className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
        placeholder='Item name (e.g., "50 Points")'
      />

      <div className='grid grid-cols-3 gap-3'>
        <input
          type='text'
          value={item.value || ''}
          onChange={(e) => setItem({ ...item, value: e.target.value })}
          className='col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
          placeholder='Value (e.g., "50")'
        />
        <select
          value={item.valueType || 'points'}
          onChange={(e) => setItem({ ...item, valueType: e.target.value })}
          className='px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white'
        >
          <option value='points'>Points</option>
          <option value='discount'>Discount</option>
          <option value='service'>Service</option>
          <option value='prize'>Prize</option>
        </select>
      </div>

      {showProbability && (
        <div>
          <label className='block text-xs font-medium text-gray-700 mb-2'>
            Probability % (Current total: {totalProbability}%)
          </label>
          <input
            type='number'
            min='0'
            max='100'
            value={item.probability || 0}
            onChange={(e) =>
              setItem({ ...item, probability: parseInt(e.target.value) || 0 })
            }
            className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
            placeholder='e.g., 25'
          />
        </div>
      )}

      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-3'>
          <Palette className='w-4 h-4 text-gray-500' />
          <input
            type='color'
            value={item.color || '#6366F1'}
            onChange={(e) => setItem({ ...item, color: e.target.value })}
            className='w-10 h-8 border border-gray-300 rounded cursor-pointer'
          />
        </div>
        <button
          onClick={onAdd}
          disabled={!item.title || !item.value || isSaving}
          className='flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors'
        >
          {isSaving ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <Plus className='w-4 h-4' />
          )}
          {isSaving ? 'Saving...' : 'Add Item'}
        </button>
      </div>
    </motion.div>
  )
}

export default ScratchSpinManagement
