import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  DollarSign,
  Gift,
  Loader2,
  Mail,
  Percent,
  Phone,
  Search,
  User,
  Users,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

const GiveRewardModal = ({ isOpen, onClose, onSuccess }) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [rewardData, setRewardData] = useState({
    rewardType: 'credit',
    value: '',
    description: '',
    reason: '',
    validDays: 30,
    notifyUsers: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showBulkMode, setShowBulkMode] = useState(false)

  // Mock search function - replace with actual API call
  const searchUsers = async (term) => {
    if (term.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Simulate API call - replace with actual service call
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Mock data - replace with actual API response
      const mockResults = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          avatar: null,
          points: 450,
          selectedLocation: { locationName: 'Downtown Spa' },
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+0987654321',
          avatar: null,
          points: 320,
          selectedLocation: { locationName: 'Westside Spa' },
        },
      ].filter(
        (user) =>
          user.name.toLowerCase().includes(term.toLowerCase()) ||
          user.email.toLowerCase().includes(term.toLowerCase())
      )

      setSearchResults(mockResults)
    } catch (error) {
      console.error('Error searching users:', error)
      setError('Failed to search users')
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Handle user selection
  const toggleUserSelection = (user) => {
    if (showBulkMode) {
      setSelectedUsers((prev) => {
        const exists = prev.find((u) => u.id === user.id)
        if (exists) {
          return prev.filter((u) => u.id !== user.id)
        }
        return [...prev, user]
      })
    } else {
      setSelectedUsers([user])
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (selectedUsers.length === 0) {
      setError('Please select at least one user')
      return
    }

    if (!rewardData.value || rewardData.value <= 0) {
      setError('Please enter a valid reward value')
      return
    }

    if (!rewardData.description.trim()) {
      setError('Please enter a description')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Simulate API call - replace with actual service call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Call success callback
      onSuccess?.({
        users: selectedUsers,
        reward: rewardData,
        isBulk: showBulkMode,
      })

      // Reset form
      setSelectedUsers([])
      setRewardData({
        rewardType: 'credit',
        value: '',
        description: '',
        reason: '',
        validDays: 30,
        notifyUsers: true,
      })
      setSearchTerm('')
      setSearchResults([])

      onClose()
    } catch (error) {
      console.error('Error giving reward:', error)
      setError('Failed to give reward. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className='bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden'
          >
            {/* Header */}
            <div className='bg-gradient-to-r from-purple-500 to-pink-500 p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center'>
                    <Gift className='w-6 h-6 text-white' />
                  </div>
                  <h2 className='text-2xl font-bold text-white'>Give Reward</h2>
                </div>
                <button
                  onClick={onClose}
                  className='p-2 hover:bg-white/20 rounded-lg transition-colors'
                >
                  <X className='w-6 h-6 text-white' />
                </button>
              </div>

              {/* Bulk Mode Toggle */}
              <div className='mt-4 flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setShowBulkMode(!showBulkMode)}
                  className='flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-white hover:bg-white/30 transition-colors'
                >
                  <Users className='w-4 h-4' />
                  {showBulkMode ? 'Single User Mode' : 'Bulk Mode'}
                </button>
                {showBulkMode && selectedUsers.length > 0 && (
                  <span className='px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm text-white'>
                    {selectedUsers.length} selected
                  </span>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className='p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]'
            >
              {/* User Search Section */}
              <div className='space-y-4'>
                <label className='block text-sm font-semibold text-gray-700'>
                  Select User(s)
                </label>

                {/* Search Input */}
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='text'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Search by name, email, or phone...'
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                  />
                  {isSearching && (
                    <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-spin' />
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className='border border-gray-200 rounded-xl overflow-hidden'>
                    <div className='max-h-60 overflow-y-auto'>
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => toggleUserSelection(user)}
                          className={`flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedUsers.find((u) => u.id === user.id)
                              ? 'bg-purple-50'
                              : ''
                          }`}
                        >
                          <div className='relative'>
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className='w-10 h-10 rounded-full'
                              />
                            ) : (
                              <div className='w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center'>
                                <User className='w-5 h-5 text-white' />
                              </div>
                            )}
                            {selectedUsers.find((u) => u.id === user.id) && (
                              <div className='absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center'>
                                <Check className='w-3 h-3 text-white' />
                              </div>
                            )}
                          </div>

                          <div className='flex-1'>
                            <div className='font-medium text-gray-900'>
                              {user.name}
                            </div>
                            <div className='text-sm text-gray-500 flex items-center gap-3'>
                              <span className='flex items-center gap-1'>
                                <Mail className='w-3 h-3' />
                                {user.email}
                              </span>
                              {user.phone && (
                                <span className='flex items-center gap-1'>
                                  <Phone className='w-3 h-3' />
                                  {user.phone}
                                </span>
                              )}
                            </div>
                            {user.selectedLocation && (
                              <div className='text-xs text-purple-600 mt-1'>
                                {user.selectedLocation.locationName}
                              </div>
                            )}
                          </div>

                          <div className='text-right'>
                            <div className='text-sm font-medium text-gray-900'>
                              {user.points} pts
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Users Display */}
                {selectedUsers.length > 0 && (
                  <div className='p-4 bg-purple-50 rounded-xl'>
                    <div className='text-sm font-medium text-purple-900 mb-2'>
                      Selected {showBulkMode ? 'Users' : 'User'}:
                    </div>
                    <div className='space-y-2'>
                      {selectedUsers.map((user) => (
                        <div
                          key={user.id}
                          className='flex items-center justify-between'
                        >
                          <span className='text-sm text-purple-700'>
                            {user.name} ({user.email})
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              setSelectedUsers((prev) =>
                                prev.filter((u) => u.id !== user.id)
                              )
                            }
                            className='text-red-500 hover:text-red-600'
                          >
                            <X className='w-4 h-4' />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reward Details Section */}
              <div className='space-y-4'>
                <label className='block text-sm font-semibold text-gray-700'>
                  Reward Details
                </label>

                {/* Reward Type */}
                <div>
                  <label className='block text-sm text-gray-600 mb-2'>
                    Type
                  </label>
                  <select
                    value={rewardData.rewardType}
                    onChange={(e) =>
                      setRewardData({
                        ...rewardData,
                        rewardType: e.target.value,
                      })
                    }
                    className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500'
                  >
                    <option value='credit'>Service Credit</option>
                    <option value='discount'>Discount</option>
                    <option value='service'>Free Service</option>
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className='block text-sm text-gray-600 mb-2'>
                    Value {rewardData.rewardType === 'discount' ? '(%)' : '($)'}
                  </label>
                  <div className='relative'>
                    <div className='absolute left-3 top-1/2 -translate-y-1/2'>
                      {rewardData.rewardType === 'discount' ? (
                        <Percent className='w-5 h-5 text-gray-400' />
                      ) : (
                        <DollarSign className='w-5 h-5 text-gray-400' />
                      )}
                    </div>
                    <input
                      type='number'
                      value={rewardData.value}
                      onChange={(e) =>
                        setRewardData({ ...rewardData, value: e.target.value })
                      }
                      placeholder={
                        rewardData.rewardType === 'discount'
                          ? 'Enter percentage'
                          : 'Enter amount'
                      }
                      className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500'
                      min='0'
                      step={rewardData.rewardType === 'discount' ? '1' : '0.01'}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className='block text-sm text-gray-600 mb-2'>
                    Description *
                  </label>
                  <textarea
                    value={rewardData.description}
                    onChange={(e) =>
                      setRewardData({
                        ...rewardData,
                        description: e.target.value,
                      })
                    }
                    placeholder='What is this reward for?'
                    className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500'
                    rows='3'
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className='block text-sm text-gray-600 mb-2'>
                    Reason (Optional)
                  </label>
                  <input
                    type='text'
                    value={rewardData.reason}
                    onChange={(e) =>
                      setRewardData({ ...rewardData, reason: e.target.value })
                    }
                    placeholder='e.g., Loyalty appreciation, Birthday gift'
                    className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500'
                  />
                </div>

                {/* Valid Days */}
                <div>
                  <label className='block text-sm text-gray-600 mb-2'>
                    Valid for (days)
                  </label>
                  <div className='relative'>
                    <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                    <input
                      type='number'
                      value={rewardData.validDays}
                      onChange={(e) =>
                        setRewardData({
                          ...rewardData,
                          validDays: parseInt(e.target.value),
                        })
                      }
                      className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500'
                      min='1'
                      max='365'
                    />
                  </div>
                </div>

                {/* Notify Users */}
                <div className='flex items-center gap-3'>
                  <input
                    type='checkbox'
                    id='notifyUsers'
                    checked={rewardData.notifyUsers}
                    onChange={(e) =>
                      setRewardData({
                        ...rewardData,
                        notifyUsers: e.target.checked,
                      })
                    }
                    className='w-4 h-4 text-purple-600 rounded focus:ring-purple-500'
                  />
                  <label
                    htmlFor='notifyUsers'
                    className='text-sm text-gray-700'
                  >
                    Send notification to user(s)
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className='flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl'>
                  <AlertCircle className='w-5 h-5 shrink-0' />
                  <span className='text-sm'>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className='flex gap-3'>
                <button
                  type='button'
                  onClick={onClose}
                  className='flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting || selectedUsers.length === 0}
                  className='flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-medium transition-all flex items-center justify-center gap-2'
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Giving Reward...
                    </>
                  ) : (
                    <>
                      <Gift className='w-5 h-5' />
                      Give Reward
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default GiveRewardModal
