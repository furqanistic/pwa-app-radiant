// File: client/src/components/Management/NotificationSender.jsx
import { notificationService } from '@/services/notificationService'
import { useMutation } from '@tanstack/react-query'
import { Bell, ChevronDown, Send, Users, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../ui/button'

const NotificationSender = ({ isOpen, onClose, users = [], currentUser }) => {
  const [formData, setFormData] = useState({
    type: 'individual',
    subject: '',
    message: '',
    userIds: [],
    priority: 'normal',
    category: 'general',
    channels: ['app', 'push'],
  })

  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [showUserList, setShowUserList] = useState(false)

  // Detect mobile for responsive design
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevent background scroll on mobile when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: notificationService.sendNotification,
    onSuccess: (data) => {
      toast.success(data.data?.message || 'Notification sent successfully!')
      handleClose()
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || 'Failed to send notification'
      )
    },
  })

  const handleClose = () => {
    setFormData({
      type: 'individual',
      subject: '',
      message: '',
      userIds: [],
      priority: 'normal',
      category: 'general',
      channels: ['app', 'push'],
    })
    setSelectedUsers(new Set())
    setSearchTerm('')
    setShowUserList(false)
    onClose()
  }

  const handleUserToggle = (userId) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map((user) => user._id)))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Subject and message are required')
      return
    }

    let payload = {
      type: formData.type,
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      priority: formData.priority,
      category: formData.category,
      channels: formData.channels,
    }

    // Add userIds for individual notifications
    if (formData.type === 'individual') {
      if (selectedUsers.size === 0) {
        toast.error('Please select at least one user')
        return
      }
      payload.userIds = Array.from(selectedUsers)
    }

    await sendNotificationMutation.mutateAsync(payload)
  }

  const handleTypeChange = (type) => {
    setFormData({ ...formData, type })
    setSelectedUsers(new Set()) // Clear selected users when type changes
    setShowUserList(false) // Collapse user list
  }

  const getRecipientCount = () => {
    switch (formData.type) {
      case 'individual':
        return selectedUsers.size
      case 'broadcast':
        return 'All users'
      case 'admin':
        return 'All admins'
      case 'enterprise':
        return 'All enterprise users'
      default:
        return 0
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex ${
        isMobile ? 'items-end' : 'items-center justify-center'
      } p-0 ${isMobile ? '' : 'p-4'}`}
    >
      <div
        className={`bg-white shadow-2xl w-full ${
          isMobile
            ? 'rounded-t-3xl max-h-[90vh]'
            : 'rounded-xl max-w-4xl max-h-[90vh]'
        } overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0'>
          <div className='flex items-center space-x-2'>
            <Bell className='w-5 h-5 text-orange-600' />
            <h2 className='text-lg sm:text-xl font-semibold text-gray-900'>
              Send Notification
            </h2>
          </div>
          <button
            onClick={handleClose}
            className='p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0'>
          <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6'>
            {/* Notification Type */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-3'>
                Recipient Type
              </label>
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
                {[
                  { value: 'individual', label: 'Specific Users', icon: Users },
                  { value: 'broadcast', label: 'All Users', icon: Users },
                  { value: 'admin', label: 'All Admins', icon: Users },
                  { value: 'enterprise', label: 'Enterprise', icon: Users },
                ].map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => handleTypeChange(option.value)}
                    className={`p-3 rounded-lg border-2 transition-all touch-manipulation ${
                      formData.type === option.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <option.icon className='w-5 h-5 mx-auto mb-1' />
                    <div className='text-sm font-medium'>{option.label}</div>
                  </button>
                ))}
              </div>
              <div className='mt-2 text-sm text-gray-600'>
                Recipients: {getRecipientCount()}
              </div>
            </div>

            {/* User Selection - Only show for individual notifications */}
            {formData.type === 'individual' && (
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <label className='block text-sm font-medium text-gray-700'>
                    Select Users
                  </label>
                  <button
                    type='button'
                    onClick={() => setShowUserList(!showUserList)}
                    className='flex items-center text-sm text-orange-600 hover:text-orange-700 font-medium touch-manipulation'
                  >
                    {showUserList ? 'Hide' : 'Show'} User List
                    <ChevronDown
                      className={`w-4 h-4 ml-1 transition-transform ${
                        showUserList ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {showUserList && (
                  <div className='space-y-3'>
                    {/* Search and Select All */}
                    <div className='space-y-3'>
                      <input
                        type='text'
                        placeholder='Search users...'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 touch-manipulation'
                      />
                      <button
                        type='button'
                        onClick={handleSelectAll}
                        className='text-sm text-orange-600 hover:text-orange-700 font-medium touch-manipulation'
                      >
                        {selectedUsers.size === filteredUsers.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>

                    {/* User List */}
                    <div className='border border-gray-200 rounded-lg max-h-48 overflow-y-auto'>
                      {filteredUsers.length === 0 ? (
                        <div className='p-4 text-center text-gray-500'>
                          No users found
                        </div>
                      ) : (
                        <div className='divide-y divide-gray-200'>
                          {filteredUsers.map((user) => (
                            <label
                              key={user._id}
                              className='flex items-center p-3 hover:bg-gray-50 cursor-pointer touch-manipulation'
                            >
                              <input
                                type='checkbox'
                                checked={selectedUsers.has(user._id)}
                                onChange={() => handleUserToggle(user._id)}
                                className='w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500'
                              />
                              <div className='ml-3 flex-1 min-w-0'>
                                <div className='flex items-center'>
                                  <div className='w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0'>
                                    <span className='text-white text-sm font-medium'>
                                      {user.name?.charAt(0)?.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className='min-w-0 flex-1'>
                                    <div className='text-sm font-medium text-gray-900 truncate'>
                                      {user.name}
                                    </div>
                                    <div className='text-sm text-gray-500 truncate'>
                                      {user.email}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${
                                  user.role === 'super-admin'
                                    ? 'bg-red-100 text-red-800'
                                    : user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : user.role === 'team'
                                    ? 'bg-blue-100 text-blue-800'
                                    : user.role === 'enterprise'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {user.role}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subject */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Subject *
              </label>
              <input
                type='text'
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder='Enter notification subject...'
                className='w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base touch-manipulation'
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder='Enter your notification message...'
                rows={4}
                className='w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-base touch-manipulation'
                required
              />
            </div>

            {/* Options Row */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              {/* Priority */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className='w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base touch-manipulation'
                >
                  <option value='low'>Low</option>
                  <option value='normal'>Normal</option>
                  <option value='high'>High</option>
                  <option value='urgent'>Urgent</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className='w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base touch-manipulation'
                >
                  <option value='general'>General</option>
                  <option value='points'>Points</option>
                  <option value='promotion'>Promotion</option>
                  <option value='alert'>Alert</option>
                  <option value='game_reward'>Game Reward</option>
                </select>
              </div>

              {/* Channels */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Delivery Channels
                </label>
                <div className='space-y-2'>
                  {[
                    { value: 'app', label: 'In-App' },
                    { value: 'push', label: 'Push Notification' },
                  ].map((channel) => (
                    <label
                      key={channel.value}
                      className='flex items-center touch-manipulation'
                    >
                      <input
                        type='checkbox'
                        checked={formData.channels.includes(channel.value)}
                        onChange={(e) => {
                          const newChannels = e.target.checked
                            ? [...formData.channels, channel.value]
                            : formData.channels.filter(
                                (c) => c !== channel.value
                              )
                          setFormData({ ...formData, channels: newChannels })
                        }}
                        className='w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500'
                      />
                      <span className='ml-2 text-sm text-gray-700'>
                        {channel.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className='px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-end flex-shrink-0'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={sendNotificationMutation.isLoading}
              className='w-full sm:w-auto h-12 touch-manipulation'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={sendNotificationMutation.isLoading}
              className='w-full sm:w-auto h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 touch-manipulation'
            >
              {sendNotificationMutation.isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' />
                  Sending...
                </>
              ) : (
                <>
                  <Send className='w-4 h-4 mr-2' />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NotificationSender
