// File: client/src/components/Management/NotificationSender.jsx
import { notificationService } from '@/services/notificationService'
import { useMutation } from '@tanstack/react-query'
import { Bell, Check, ChevronDown, Search, Send, Users, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'

const NotificationSender = ({
  isOpen,
  onClose,
  users = [],
  currentUser,
  preSelectedUser = null, // NEW: Pre-selected user from dropdown action
}) => {
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
  const [step, setStep] = useState(1) // Step-based flow for better UX

  // Handle pre-selected user
  useEffect(() => {
    if (preSelectedUser && isOpen) {
      setSelectedUsers(new Set([preSelectedUser._id]))
      setFormData((prev) => ({ ...prev, type: 'individual' }))
      setStep(2) // Skip user selection if pre-selected
    } else if (isOpen) {
      setStep(1) // Start from type selection
    }
  }, [preSelectedUser, isOpen])

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
    setStep(1)
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

  const handleSubmit = async () => {
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
    setSelectedUsers(new Set())
    if (type === 'individual') {
      setStep(2) // Go to user selection
    } else {
      setStep(3) // Skip user selection for broadcast types
    }
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

  const renderStepIndicator = () => (
    <div className='flex justify-center mb-6'>
      <div className='flex items-center space-x-2'>
        {[1, 2, 3].map((stepNum) => (
          <React.Fragment key={stepNum}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                stepNum <= step
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {stepNum < step ? <Check className='w-4 h-4' /> : stepNum}
            </div>
            {stepNum < 3 && (
              <div
                className={`w-8 h-1 rounded-full transition-colors ${
                  stepNum < step ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )

  const renderRecipientTypeStep = () => (
    <div className='space-y-6'>
      <div className='text-center'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          Who do you want to notify?
        </h3>
        <p className='text-gray-600'>Select the type of recipients</p>
      </div>

      <div className='grid grid-cols-1 gap-4'>
        {[
          {
            value: 'individual',
            label: 'Specific Users',
            description: 'Send to selected users',
            icon: Users,
          },
          {
            value: 'broadcast',
            label: 'All Users',
            description: 'Send to everyone',
            icon: Users,
          },
          {
            value: 'admin',
            label: 'All Admins',
            description: 'Send to admin users only',
            icon: Users,
          },
          {
            value: 'enterprise',
            label: 'Enterprise Users',
            description: 'Send to enterprise users',
            icon: Users,
          },
        ].map((option) => (
          <button
            key={option.value}
            type='button'
            onClick={() => handleTypeChange(option.value)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              formData.type === option.value
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
            }`}
          >
            <div className='flex items-center'>
              <option.icon
                className={`w-6 h-6 mr-3 ${
                  formData.type === option.value
                    ? 'text-orange-600'
                    : 'text-gray-400'
                }`}
              />
              <div>
                <div
                  className={`font-medium ${
                    formData.type === option.value
                      ? 'text-orange-900'
                      : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </div>
                <div
                  className={`text-sm ${
                    formData.type === option.value
                      ? 'text-orange-700'
                      : 'text-gray-500'
                  }`}
                >
                  {option.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderUserSelectionStep = () => (
    <div className='space-y-6'>
      <div className='text-center'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          Select Users
        </h3>
        <p className='text-gray-600'>
          {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}{' '}
          selected
        </p>
      </div>

      {/* Pre-selected user display */}
      {preSelectedUser && (
        <div className='bg-orange-50 border border-orange-200 rounded-lg p-4'>
          <div className='flex items-center'>
            <div className='w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mr-3'>
              <span className='text-white text-sm font-medium'>
                {preSelectedUser.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className='flex-1'>
              <div className='font-medium text-orange-900'>
                {preSelectedUser.name}
              </div>
              <div className='text-sm text-orange-700'>
                {preSelectedUser.email}
              </div>
            </div>
            <Check className='w-5 h-5 text-orange-600' />
          </div>
          <div className='mt-3 text-sm text-orange-700'>
            This user was automatically selected. You can add more users below.
          </div>
        </div>
      )}

      {/* Search */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
        <input
          type='text'
          placeholder='Search users...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base'
        />
      </div>

      {/* User List */}
      <div className='border border-gray-200 rounded-lg max-h-64 overflow-y-auto'>
        {filteredUsers.length === 0 ? (
          <div className='p-6 text-center text-gray-500'>No users found</div>
        ) : (
          <div className='divide-y divide-gray-200'>
            {filteredUsers.map((user) => (
              <label
                key={user._id}
                className='flex items-center p-4 hover:bg-gray-50 cursor-pointer'
              >
                <input
                  type='checkbox'
                  checked={selectedUsers.has(user._id)}
                  onChange={() => handleUserToggle(user._id)}
                  className='w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500'
                />
                <div className='ml-3 flex-1 flex items-center'>
                  <div className='w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center mr-3'>
                    <span className='text-white text-sm font-medium'>
                      {user.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='font-medium text-gray-900 truncate'>
                      {user.name}
                    </div>
                    <div className='text-sm text-gray-500 truncate'>
                      {user.email}
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${
                      user.role === 'super-admin'
                        ? 'bg-red-100 text-red-800'
                        : user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'spa'
                        ? 'bg-blue-100 text-blue-800'
                        : user.role === 'enterprise'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderMessageStep = () => (
    <div className='space-y-6'>
      <div className='text-center'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          Compose Message
        </h3>
        <p className='text-gray-600'>
          Sending to: {getRecipientCount()} recipient
          {getRecipientCount() !== 1 ? 's' : ''}
        </p>
      </div>

      <div className='space-y-4'>
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
            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base'
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
            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-base'
            required
          />
        </div>

        {/* Quick Options */}
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className='w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base'
            >
              <option value='low'>Low</option>
              <option value='normal'>Normal</option>
              <option value='high'>High</option>
              <option value='urgent'>Urgent</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className='w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base'
            >
              <option value='general'>General</option>
              <option value='points'>Points</option>
              <option value='promotion'>Promotion</option>
              <option value='alert'>Alert</option>
              <option value='game_reward'>Game Reward</option>
            </select>
          </div>
        </div>

        {/* Delivery Channels */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-3'>
            Delivery Methods
          </label>
          <div className='grid grid-cols-2 gap-3'>
            {[
              { value: 'app', label: 'In-App Notification' },
              { value: 'push', label: 'Push Notification' },
            ].map((channel) => (
              <label
                key={channel.value}
                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.channels.includes(channel.value)
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type='checkbox'
                  checked={formData.channels.includes(channel.value)}
                  onChange={(e) => {
                    const newChannels = e.target.checked
                      ? [...formData.channels, channel.value]
                      : formData.channels.filter((c) => c !== channel.value)
                    setFormData({ ...formData, channels: newChannels })
                  }}
                  className='w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mr-3'
                />
                <span
                  className={`text-sm font-medium ${
                    formData.channels.includes(channel.value)
                      ? 'text-orange-900'
                      : 'text-gray-700'
                  }`}
                >
                  {channel.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center'>
      <div className='bg-white w-full max-w-lg sm:rounded-xl max-h-[90vh] overflow-hidden flex flex-col sm:max-h-[85vh] rounded-t-3xl sm:rounded-t-xl'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0'>
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center'>
              <Bell className='w-5 h-5 text-orange-600' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-gray-900'>
                Send Notification
              </h2>
              {preSelectedUser && (
                <p className='text-sm text-gray-600'>
                  To: {preSelectedUser.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto px-6 py-6'>
          {renderStepIndicator()}

          {step === 1 && renderRecipientTypeStep()}
          {step === 2 &&
            formData.type === 'individual' &&
            renderUserSelectionStep()}
          {step === 3 && renderMessageStep()}
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0'>
          {step > 1 && (
            <Button
              variant='outline'
              onClick={() => setStep(step - 1)}
              disabled={sendNotificationMutation.isLoading}
              className='flex-1 h-12'
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && formData.type !== 'individual') {
                  setStep(3) // Skip user selection for broadcast
                } else {
                  setStep(step + 1)
                }
              }}
              disabled={
                step === 2 &&
                formData.type === 'individual' &&
                selectedUsers.size === 0
              }
              className='flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={
                sendNotificationMutation.isLoading ||
                !formData.subject.trim() ||
                !formData.message.trim()
              }
              className='flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
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
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationSender
