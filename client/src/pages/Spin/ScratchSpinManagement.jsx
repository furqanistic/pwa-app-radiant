// File: client/src/pages/Spin/ScratchSpinManagement.jsx - SIMPLE VERSION
import {
  useAllGames,
  useCreateGame,
  useDeleteGame,
  useUpdateGame,
} from '@/hooks/useGameWheel'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Edit3,
  Loader2,
  MapPin,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Ticket,
  Trash2,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Layout from '../Layout/Layout'

const ScratchSpinManagement = () => {
  const [activeTab, setActiveTab] = useState('spin')
  const [userData, setUserData] = useState({})
  const [isTeamUser, setIsTeamUser] = useState(false)

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
    setIsTeamUser(user.role === 'team')
  }, [])

  const { data: gamesData, isLoading, refetch } = useAllGames({ limit: 100 })
  const createGameMutation = useCreateGame({ onSuccess: () => refetch() })
  const updateGameMutation = useUpdateGame({ onSuccess: () => refetch() })
  const deleteGameMutation = useDeleteGame({ onSuccess: () => refetch() })

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

  const saveGame = async (gameType, items) => {
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
        alert('Please add at least one valid item')
        return
      }

      if (gameType === 'scratch') {
        const totalProbability = validItems.reduce(
          (sum, item) => sum + (item.probability || 0),
          0
        )
        if (totalProbability > 100) {
          alert('Total probability cannot exceed 100%')
          return
        }
      }

      const gameData = {
        title: `${gameType === 'spin' ? 'Spin Wheel' : 'Scratch Card'} Game`,
        description: `${
          gameType === 'spin' ? 'Spin wheel' : 'Scratch card'
        } game`,
        type: gameType,
        items: validItems,
        settings:
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
              },
        isActive: true,
        isPublished: true,
      }

      const existingGame = games[gameType]
      if (existingGame) {
        await updateGameMutation.mutateAsync({
          gameId: existingGame.id || existingGame._id,
          gameData,
        })
      } else {
        await createGameMutation.mutateAsync(gameData)
      }
    } catch (error) {
      console.error('Error saving game:', error)
      alert(
        `Failed to save game: ${error.response?.data?.message || error.message}`
      )
    }
  }

  const handleAddItem = async () => {
    if (!newItem.title?.trim() || !newItem.value?.trim()) {
      alert('Title and value are required')
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

    await saveGame(activeTab, updatedItems)

    setNewItem({
      title: '',
      value: '',
      probability: 10,
      color: '#6366F1',
      valueType: 'points',
    })
    setShowAddForm(false)
  }

  const handleEditItem = (item) => {
    setEditingItem({ ...item })
  }

  const handleSaveEdit = async () => {
    if (!editingItem?.title?.trim() || !editingItem?.value?.trim()) {
      alert('Title and value are required')
      return
    }

    const currentItems = games[activeTab]?.items || []
    const updatedItems = currentItems.map((item) =>
      item._id === editingItem._id || item.id === editingItem.id
        ? editingItem
        : item
    )

    await saveGame(activeTab, updatedItems)
    setEditingItem(null)
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const currentItems = games[activeTab]?.items || []
    const updatedItems = currentItems.filter(
      (item) => item._id !== itemId && item.id !== itemId
    )

    await saveGame(activeTab, updatedItems)
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

  return (
    <Layout>
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='mb-8'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center'>
                <Settings className='w-5 h-5 text-white' />
              </div>
              <div>
                <h1 className='text-3xl font-bold text-gray-900'>
                  Game Management
                </h1>
                <p className='text-gray-600 mt-1'>
                  Configure your spin wheel and scratch card games
                </p>
              </div>
            </div>

            {/* Show spa info for team users */}
            {isTeamUser && userData.ghlContactId && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
                <div className='flex items-center gap-2 text-blue-800'>
                  <MapPin className='w-4 h-4' />
                  <span className='font-medium'>Your Spa Location:</span>
                  <span>{userData.ghlContactId}</span>
                </div>
              </div>
            )}

            {/* Warning if team user doesn't have ghlContactId */}
            {isTeamUser && !userData.ghlContactId && (
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4'>
                <div className='flex items-center gap-2 text-yellow-800'>
                  <AlertTriangle className='w-4 h-4' />
                  <span>
                    Your spa location is not configured. Please contact support
                    to set up your GHL Contact ID.
                  </span>
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
            />

            <GameSection
              gameType='scratch'
              icon={<Ticket className='w-6 h-6 text-indigo-600' />}
              title='Scratch Card Items'
              items={games.scratch?.items || []}
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
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}

const GameSection = ({
  gameType,
  icon,
  title,
  items,
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
}) => {
  const isActive = activeTab === gameType
  const shouldShow = isActive || window.innerWidth >= 1024

  if (!shouldShow) return null

  return (
    <div className={`${isActive ? 'block' : 'hidden'} lg:block`}>
      <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
        <div className='flex items-center gap-3 mb-6'>
          {icon}
          <h2 className='text-xl font-semibold text-gray-900'>{title}</h2>
          <span className='px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm font-medium'>
            {items.length} items
          </span>
        </div>

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
