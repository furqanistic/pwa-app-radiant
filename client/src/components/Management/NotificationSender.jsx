import { useBranding } from '@/context/BrandingContext'
import { authService } from '@/services/authService'
import { locationService } from '@/services/locationService'
import { notificationService } from '@/services/notificationService'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Bell,
  Check,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'

const adjustHex = (hex, amount) => {
  const cleaned = (hex || '').replace('#', '')
  if (cleaned.length !== 6) return '#be185d'
  const num = parseInt(cleaned, 16)
  const clamp = (value) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0xff) + amount)
  const b = clamp((num & 0xff) + amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`
}

const NotificationSender = ({
  isOpen,
  onClose,
  currentUser,
  preSelectedUser = null,
  scopeRole = 'all',
  scopeLocationId = '',
}) => {
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [step, setStep] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState(scopeRole || 'all')
  const [locationFilter, setLocationFilter] = useState(scopeLocationId || '')

  const isSuperAdmin = currentUser?.role === 'super-admin'
  const userScopeLocationId =
    scopeLocationId ||
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    ''
  const effectiveLocationFilter = isSuperAdmin ? locationFilter : userScopeLocationId

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (!isOpen) return
    if (preSelectedUser?._id) {
      setSelectedUsers(new Set([preSelectedUser._id]))
      setFormData((prev) => ({ ...prev, type: 'individual' }))
      setStep(2)
    } else {
      setStep(1)
      setSelectedUsers(new Set())
    }
  }, [preSelectedUser, isOpen])

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

  const roleFilterOptions = isSuperAdmin
    ? ['all', 'user', 'spa', 'admin']
    : ['all', 'user']

  const { data: locationsData } = useQuery({
    queryKey: ['notification-locations'],
    queryFn: () => locationService.getAllLocations({ limit: 200 }),
    enabled: isOpen && isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const {
    data: recipientsData,
    isLoading: isLoadingRecipients,
    isFetching: isFetchingRecipients,
  } = useQuery({
    queryKey: [
      'notification-recipients',
      currentPage,
      debouncedSearchTerm,
      roleFilter,
      effectiveLocationFilter,
      currentUser?.role,
    ],
    queryFn: () =>
      authService.getAllUsers({
        page: currentPage,
        limit: 20,
        search: debouncedSearchTerm,
        role: roleFilter,
        sortBy: 'name',
        sortOrder: 'asc',
        ...(effectiveLocationFilter && { locationId: effectiveLocationFilter }),
      }),
    enabled: isOpen && formData.type === 'individual',
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const recipients = recipientsData?.data?.users || []
  const pagination = recipientsData?.data?.pagination || {}

  const sendNotificationMutation = useMutation({
    mutationFn: notificationService.sendNotification,
    onSuccess: (data) => {
      toast.success(data?.message || 'Notification sent successfully!')
      handleClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send notification')
    },
  })

  const recipientCountText = useMemo(() => {
    switch (formData.type) {
      case 'individual':
        return `${selectedUsers.size} selected`
      case 'broadcast':
        return 'All visible users'
      case 'admin':
        return 'All admins'
      case 'enterprise':
        return 'All enterprise users'
      default:
        return '0 selected'
    }
  }, [formData.type, selectedUsers.size])

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
    setDebouncedSearchTerm('')
    setCurrentPage(1)
    setStep(1)
    setRoleFilter(scopeRole || 'all')
    setLocationFilter(scopeLocationId || '')
    onClose()
  }

  const handleUserToggle = (userId) => {
    const next = new Set(selectedUsers)
    if (next.has(userId)) {
      next.delete(userId)
    } else {
      next.add(userId)
    }
    setSelectedUsers(next)
  }

  const selectAllOnPage = () => {
    const next = new Set(selectedUsers)
    recipients.forEach((user) => next.add(user._id))
    setSelectedUsers(next)
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
  }

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Subject and message are required')
      return
    }

    if (formData.channels.length === 0) {
      toast.error('Select at least one delivery channel')
      return
    }

    const payload = {
      type: formData.type,
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      priority: formData.priority,
      category: formData.category,
      channels: formData.channels,
    }

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
    setFormData((prev) => ({ ...prev, type }))
    setCurrentPage(1)
    setSearchTerm('')
    setDebouncedSearchTerm('')
    if (type === 'individual') {
      setStep(2)
    } else {
      setStep(3)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/55 backdrop-blur-sm z-[80] flex items-end sm:items-center sm:justify-center'>
      <div className='bg-white w-full max-w-3xl sm:rounded-2xl max-h-[92vh] overflow-hidden flex flex-col rounded-t-3xl'>
        <div
          className='px-6 py-4 text-white'
          style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})` }}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center'>
                <Bell className='w-5 h-5 text-white' />
              </div>
              <div>
                <h2 className='text-lg font-semibold'>Send Notification</h2>
                <p className='text-sm text-white/85'>Professional bulk messaging with targeting</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className='p-2 rounded-lg hover:bg-white/20 transition-colors'
            >
              <X className='w-5 h-5 text-white' />
            </button>
          </div>
        </div>

        <div className='px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-sm'>
          <div className='flex items-center gap-2 text-gray-700'>
            <Users className='w-4 h-4' />
            <span className='font-medium'>Recipients:</span>
            <span>{recipientCountText}</span>
          </div>
          <div className='text-gray-500'>Step {step} of 3</div>
        </div>

        <div className='flex-1 overflow-y-auto p-6'>
          {step === 1 && (
            <div className='space-y-4'>
              <h3 className='text-lg font-semibold text-gray-900'>Select recipient type</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {[
                  { value: 'individual', label: 'Specific Users', description: 'Search and choose exact users' },
                  { value: 'broadcast', label: 'All Users', description: 'Send to all users in your scope' },
                  ...(currentUser?.role === 'super-admin' || currentUser?.role === 'admin'
                    ? [{ value: 'admin', label: 'Admins', description: 'Send only to admin users' }]
                    : []),
                ].map((option) => {
                  const active = formData.type === option.value
                  return (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => handleTypeChange(option.value)}
                      className='rounded-xl border p-4 text-left transition-all'
                      style={{
                        borderColor: active ? brandColor : '#e5e7eb',
                        background: active ? `${brandColor}12` : '#fff',
                      }}
                    >
                      <div className='font-semibold text-gray-900'>{option.label}</div>
                      <div className='text-sm text-gray-600 mt-1'>{option.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 2 && formData.type === 'individual' && (
            <div className='space-y-4'>
              <div className='flex flex-col md:flex-row gap-3'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <input
                    type='text'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Search recipients by name or email...'
                    className='w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none text-sm'
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className='px-3 py-2.5 border border-gray-300 rounded-lg text-sm'
                >
                  {roleFilterOptions.map((role) => (
                    <option key={role} value={role}>
                      {role === 'all' ? 'All roles' : role}
                    </option>
                  ))}
                </select>
                {isSuperAdmin && (
                  <select
                    value={locationFilter}
                    onChange={(e) => {
                      setLocationFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className='px-3 py-2.5 border border-gray-300 rounded-lg text-sm'
                  >
                    <option value=''>All locations</option>
                    {(locationsData?.data?.locations || []).map((location) => (
                      <option key={location._id || location.locationId} value={location.locationId}>
                        {location.name || location.locationId}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className='flex items-center justify-between text-sm'>
                <div className='text-gray-600'>
                  {pagination.totalUsers || 0} users found
                </div>
                <div className='flex items-center gap-2'>
                  <Button type='button' variant='outline' size='sm' onClick={selectAllOnPage}>
                    Select Page
                  </Button>
                  <Button type='button' variant='outline' size='sm' onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className='border border-gray-200 rounded-xl overflow-hidden'>
                {isLoadingRecipients || (isFetchingRecipients && recipients.length === 0) ? (
                  <div className='p-8 text-center text-gray-500'>Loading recipients...</div>
                ) : recipients.length === 0 ? (
                  <div className='p-8 text-center text-gray-500'>No users match your search</div>
                ) : (
                  <div className='max-h-72 overflow-y-auto divide-y divide-gray-100'>
                    {recipients.map((user) => {
                      const checked = selectedUsers.has(user._id)
                      return (
                        <label
                          key={user._id}
                          className='flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer'
                        >
                          <input
                            type='checkbox'
                            checked={checked}
                            onChange={() => handleUserToggle(user._id)}
                            className='w-4 h-4'
                          />
                          <div
                            className='w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold'
                            style={{ background: `linear-gradient(120deg, ${brandColor}, ${brandColorDark})` }}
                          >
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className='min-w-0 flex-1'>
                            <div className='font-medium text-gray-900 truncate'>{user.name}</div>
                            <div className='text-xs text-gray-500 truncate'>{user.email}</div>
                          </div>
                          <span className='text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700'>
                            {user.role}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {(pagination.totalPages || 1) > 1 && (
                <div className='flex items-center justify-between'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <div className='text-sm text-gray-600'>
                    Page {pagination.currentPage || currentPage} of {pagination.totalPages || 1}
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(p + 1, pagination.totalPages || p)
                      )
                    }
                    disabled={currentPage >= (pagination.totalPages || 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className='space-y-4'>
              <h3 className='text-lg font-semibold text-gray-900'>Compose message</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Subject</label>
                  <input
                    type='text'
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    className='w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm'
                    placeholder='Service update, promotion, reminder...'
                  />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                    className='px-3 py-2.5 border border-gray-300 rounded-lg text-sm'
                  >
                    <option value='low'>Low</option>
                    <option value='normal'>Normal</option>
                    <option value='high'>High</option>
                    <option value='urgent'>Urgent</option>
                  </select>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className='px-3 py-2.5 border border-gray-300 rounded-lg text-sm'
                  >
                    <option value='general'>General</option>
                    <option value='points'>Points</option>
                    <option value='promotion'>Promotion</option>
                    <option value='alert'>Alert</option>
                    <option value='game_reward'>Game Reward</option>
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Message</label>
                <textarea
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none'
                  placeholder='Write a clear, concise notification...'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                {[
                  { value: 'app', label: 'In-App' },
                  { value: 'push', label: 'Push' },
                ].map((channel) => {
                  const active = formData.channels.includes(channel.value)
                  return (
                    <label
                      key={channel.value}
                      className='border rounded-lg px-3 py-2.5 text-sm cursor-pointer flex items-center gap-2'
                      style={{
                        borderColor: active ? brandColor : '#d1d5db',
                        background: active ? `${brandColor}10` : '#fff',
                      }}
                    >
                      <input
                        type='checkbox'
                        checked={active}
                        onChange={(e) => {
                          const nextChannels = e.target.checked
                            ? [...formData.channels, channel.value]
                            : formData.channels.filter((c) => c !== channel.value)
                          setFormData((prev) => ({ ...prev, channels: nextChannels }))
                        }}
                      />
                      {channel.label}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className='px-6 py-4 border-t border-gray-200 bg-white flex gap-3'>
          {step > 1 && (
            <Button
              variant='outline'
              onClick={() => {
                if (step === 3 && formData.type !== 'individual') {
                  setStep(1)
                } else {
                  setStep((s) => Math.max(1, s - 1))
                }
              }}
              disabled={sendNotificationMutation.isPending}
              className='flex-1 h-11'
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && formData.type !== 'individual') {
                  setStep(3)
                  return
                }
                if (step === 2 && formData.type === 'individual' && selectedUsers.size === 0) {
                  toast.error('Select at least one user')
                  return
                }
                setStep((s) => Math.min(3, s + 1))
              }}
              className='flex-1 h-11 text-white'
              style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})` }}
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={
                sendNotificationMutation.isPending ||
                !formData.subject.trim() ||
                !formData.message.trim()
              }
              className='flex-1 h-11 text-white'
              style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})` }}
            >
              {sendNotificationMutation.isPending ? (
                'Sending...'
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
