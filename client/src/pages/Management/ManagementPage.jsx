// client/src/pages/Management/ManagementPage.jsx
import { axiosInstance } from '@/config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  Eye,
  Filter,
  Gift,
  GiftIcon,
  Loader2,
  MapPin,
  Megaphone,
  Minus,
  Package,
  Plus,
  Search,
  Send,
  Settings,
  Star,
  UserCheck,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import Layout from '../Layout/Layout'

// shadcn/ui components
import AddUserForm from '@/components/Management/AddUserForm'
import LocationForm from '@/components/Management/LocationForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useNavigate } from 'react-router-dom'

// API functions
const fetchAllUsers = async (token) => {
  const response = await axiosInstance.get('/auth/all-users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  console.log('API Response:', response.data)
  return response.data?.data?.users || response.data || []
}

const createTeamMember = async (userData, token) => {
  const response = await axiosInstance.post(
    '/auth/create-team-member',
    userData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}

const adjustUserPoints = async ({
  userId,
  adjustmentType,
  amount,
  reason,
  token,
}) => {
  const response = await axiosInstance.post(
    `/auth/users/${userId}/points`,
    {
      type: adjustmentType,
      amount: parseInt(amount),
      reason,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}

const sendNotification = async ({
  userIds,
  notificationType,
  message,
  subject,
  channels,
  token,
}) => {
  const response = await axiosInstance.post(
    '/notifications/send', // Changed from '/auth/notifications/send'
    {
      userIds,
      type: notificationType,
      message,
      subject,
      channels,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}

// Reusable Components
const UserAvatar = ({ name, role, className = '' }) => {
  const getStatusColor = () => {
    switch (role) {
      case 'admin':
        return 'from-purple-400 to-pink-500'
      case 'enterprise':
        return 'from-blue-400 to-purple-500'
      case 'team':
        return 'from-green-400 to-blue-500'
      case 'user':
      default:
        return 'from-gray-400 to-gray-500'
    }
  }

  const initials = name?.substring(0, 2)?.toUpperCase() || '??'

  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getStatusColor()} flex items-center justify-center text-white font-semibold text-sm relative ${className}`}
    >
      {initials}
      {role === 'admin' && (
        <div className='absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center'>
          <Star className='w-2 h-2 text-yellow-800' />
        </div>
      )}
    </div>
  )
}

const PointsAdjustmentDialog = ({ user, isOpen, onClose }) => {
  const [adjustmentType, setAdjustmentType] = useState('add')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()
  const token = useSelector((state) => state.user.token)

  const pointsAdjustmentMutation = useMutation({
    mutationFn: adjustUserPoints,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
      setAmount('')
      setReason('')
    },
    onError: (error) => {
      console.error('Points adjustment failed:', error)
      alert('Failed to adjust points. Please try again.')
    },
  })

  const handleSubmit = () => {
    if (!amount || !user || !token) return

    pointsAdjustmentMutation.mutate({
      userId: user._id || user.id,
      adjustmentType,
      amount,
      reason,
      token,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Zap className='w-5 h-5 text-purple-500' />
            Adjust Points - {user?.name}
          </DialogTitle>
          <DialogDescription>
            Current Points: {user?.points || 0}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='adjustment-type'>Action</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='add'>Add Points</SelectItem>
                <SelectItem value='remove'>Remove Points</SelectItem>
                <SelectItem value='set'>Set Points</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='amount'>Points Amount</Label>
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  setAmount((prev) =>
                    Math.max(0, parseInt(prev || 0) - 50).toString()
                  )
                }
                className='px-3'
              >
                <Minus className='w-4 h-4' />
              </Button>
              <Input
                id='amount'
                type='number'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder='Enter points'
                className='text-center'
              />
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  setAmount((prev) => (parseInt(prev || 0) + 50).toString())
                }
                className='px-3'
              >
                <Plus className='w-4 h-4' />
              </Button>
            </div>
            <div className='flex gap-2 mt-2'>
              {[50, 100, 250, 500].map((preset) => (
                <Button
                  key={preset}
                  size='sm'
                  variant='outline'
                  onClick={() => setAmount(preset.toString())}
                  className='text-xs'
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='reason'>Reason</Label>
            <Textarea
              id='reason'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Enter reason for adjustment...'
              className='min-h-[80px]'
            />
          </div>

          {adjustmentType !== 'set' && (
            <div className='p-3 bg-gray-50 rounded-lg'>
              <p className='text-sm text-gray-600'>
                New Balance: {user?.points || 0}{' '}
                {adjustmentType === 'add' ? '+' : '-'} {amount || 0} ={' '}
                {adjustmentType === 'add'
                  ? (user?.points || 0) + parseInt(amount || 0)
                  : Math.max(0, (user?.points || 0) - parseInt(amount || 0))}
              </p>
            </div>
          )}
        </div>

        <div className='flex gap-2 justify-end'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pointsAdjustmentMutation.isPending}
            className='bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
          >
            {pointsAdjustmentMutation.isPending && (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            )}
            Apply Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const NotificationDialog = ({ selectedUsers, isOpen, onClose }) => {
  const [notificationType, setNotificationType] = useState('individual')
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    push: true,
  })
  const token = useSelector((state) => state.user.token)

  const notificationMutation = useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      onClose()
      setMessage('')
      setSubject('')
    },
    onError: (error) => {
      console.error('Notification send failed:', error)
      alert('Failed to send notification. Please try again.')
    },
  })

  const handleSend = () => {
    if (!token) {
      alert('Authentication required')
      return
    }

    notificationMutation.mutate({
      userIds: selectedUsers,
      notificationType,
      message,
      subject,
      channels,
      token,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Send className='w-5 h-5 text-purple-500' />
            Send Notification
          </DialogTitle>
          <DialogDescription>
            {notificationType === 'broadcast'
              ? 'Send to all users'
              : `Send to ${selectedUsers?.length || 0} selected user(s)`}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label>Notification Type</Label>
            <Select
              value={notificationType}
              onValueChange={setNotificationType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='individual'>Selected Users</SelectItem>
                <SelectItem value='broadcast'>Broadcast to All</SelectItem>
                <SelectItem value='admin'>Admin Users Only</SelectItem>
                <SelectItem value='enterprise'>
                  Enterprise Users Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='subject'>Subject</Label>
            <Input
              id='subject'
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder='Enter notification subject...'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='message'>Message</Label>
            <Textarea
              id='message'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Enter your message...'
              className='min-h-[100px]'
            />
          </div>
        </div>

        <div className='flex gap-2 justify-end'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={notificationMutation.isPending}
            className='bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
          >
            {notificationMutation.isPending ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Send className='w-4 h-4 mr-2' />
            )}
            Send Notification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const BulkActionsPanel = ({
  selectedUsers,
  onPointsAdjust,
  onNotification,
  onDismiss,
  onShow,
}) => {
  const [showBottomSheet, setShowBottomSheet] = useState(false)

  const handleShow = () => {
    setShowBottomSheet(true)
    onShow?.()
  }

  const handleClose = () => {
    setShowBottomSheet(false)
    onDismiss?.()
  }

  return (
    <>
      {/* Floating Action Button */}
      {selectedUsers.length > 0 && !showBottomSheet && (
        <div className='fixed bottom-6 right-6 z-40'>
          <button
            onClick={handleShow}
            className='relative bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl border-4 border-white transition-all hover:scale-110'
          >
            <UserCheck className='w-6 h-6' />
            {/* Badge with count */}
            <div className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center'>
              {selectedUsers.length}
            </div>
            {/* Ripple effect */}
            <div className='absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 animate-ping opacity-20'></div>
          </button>
        </div>
      )}

      {/* Bottom Sheet */}
      {showBottomSheet && selectedUsers.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 bg-black/20 backdrop-blur-sm z-40'
            onClick={handleClose}
          />

          {/* Bottom Sheet */}
          <div className='fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 transform transition-transform duration-300'>
            {/* Handle bar */}
            <div className='flex justify-center pt-3 pb-2'>
              <div className='w-12 h-1 bg-gray-300 rounded-full'></div>
            </div>

            {/* Content */}
            <div className='px-6 pb-8 pt-4'>
              {/* Header */}
              <div className='text-center mb-6'>
                <div className='flex items-center justify-center gap-2 mb-2'>
                  <div className='w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center'>
                    <UserCheck className='w-5 h-5 text-white' />
                  </div>
                </div>
                <h3 className='text-lg font-semibold text-gray-900'>
                  {selectedUsers.length} user
                  {selectedUsers.length !== 1 ? 's' : ''} selected
                </h3>
                <p className='text-sm text-gray-500'>
                  Choose an action to perform
                </p>
              </div>

              {/* Action Buttons */}
              <div className='space-y-3'>
                <button
                  onClick={() => {
                    onPointsAdjust(selectedUsers)
                    handleClose()
                  }}
                  className='w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-2xl border border-purple-100 transition-all hover:scale-102'
                >
                  <div className='w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center'>
                    <Zap className='w-6 h-6 text-white' />
                  </div>
                  <div className='flex-1 text-left'>
                    <p className='font-medium text-gray-900'>Adjust Points</p>
                    <p className='text-sm text-gray-500'>
                      Add, remove, or set points for selected users
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onNotification(selectedUsers)
                    handleClose()
                  }}
                  className='w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-2xl border border-blue-100 transition-all hover:scale-102'
                >
                  <div className='w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center'>
                    <Send className='w-6 h-6 text-white' />
                  </div>
                  <div className='flex-1 text-left'>
                    <p className='font-medium text-gray-900'>Send Message</p>
                    <p className='text-sm text-gray-500'>
                      Send push notifications
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    // Handle issue rewards
                    handleClose()
                  }}
                  className='w-full flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 rounded-2xl border border-green-100 transition-all hover:scale-102'
                >
                  <div className='w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center'>
                    <Gift className='w-6 h-6 text-white' />
                  </div>
                  <div className='flex-1 text-left'>
                    <p className='font-medium text-gray-900'>Issue Rewards</p>
                    <p className='text-sm text-gray-500'>
                      Grant special rewards or bonuses
                    </p>
                  </div>
                </button>

                {/* Clear Selection Button */}
                <button
                  onClick={handleClose}
                  className='w-full flex items-center justify-center gap-2 p-3 mt-4 text-gray-600 hover:text-gray-800 transition-colors'
                >
                  <span className='text-sm'>Clear Selection</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

const ManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPointsDialog, setShowPointsDialog] = useState(false)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const navigate = useNavigate()
  // Get token from Redux
  const token = useSelector((state) => state.user.token)
  const currentUser = useSelector((state) => state.user.currentUser)
  const queryClient = useQueryClient()

  // React Query for fetching users
  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', token],
    queryFn: () => fetchAllUsers(token),
    enabled: !!token, // Only run query if token exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  })

  // Mutation for creating team members
  const createTeamMemberMutation = useMutation({
    mutationFn: (userData) => createTeamMember(userData, token),
    onSuccess: (data) => {
      // Refresh the users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
      console.log('✅ Team member created successfully:', data)
      alert(`Team member "${data.data.user.name}" created successfully!`)
    },
    onError: (error) => {
      console.error('❌ Error creating team member:', error)
      const errorMessage =
        error.response?.data?.message ||
        'Failed to create team member. Please try again.'
      alert(errorMessage)
    },
  })

  // Check if user has permission to access this page
  const hasAdminAccess = currentUser?.role === 'admin'

  // Redirect if no access
  useEffect(() => {
    if (!token) {
      window.location.href = '/login'
      return
    }

    if (currentUser && !hasAdminAccess) {
      window.location.href = '/dashboard'
      return
    }
  }, [token, currentUser, hasAdminAccess])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter =
      filterStatus === 'all' ||
      user.role?.toLowerCase() === filterStatus.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((user) => user._id || user.id))
    }
  }

  const handleIndividualPointsAdjust = (user) => {
    setSelectedUser(user)
    setShowPointsDialog(true)
  }

  const handleBulkNotification = (users) => {
    setShowNotificationDialog(true)
  }

  const handleLocationSuccess = (newLocation) => {
    console.log('Location created successfully:', newLocation)
    // You can add additional logic here, like showing a success message
  }

  const handleTeamMemberSubmit = async (userData) => {
    try {
      await createTeamMemberMutation.mutateAsync(userData)
      setShowAddUserDialog(false)
    } catch (error) {
      // Error is already handled in the mutation
      console.error('Team member creation failed:', error)
    }
  }

  // Don't render if no token or access
  if (!token || !currentUser) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-3 md:p-6 pb-20 flex items-center justify-center'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 animate-spin mx-auto mb-4 text-purple-500' />
            <p className='text-gray-600'>Checking authentication...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!hasAdminAccess) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-3 md:p-6 pb-20 flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-red-600 mb-4'>
              Access Denied. Admin rights required.
            </p>
            <Button onClick={() => (window.location.href = '/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-3 md:p-6 pb-20 flex items-center justify-center'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 animate-spin mx-auto mb-4 text-purple-500' />
            <p className='text-gray-600'>Loading users...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (isError) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-3 md:p-6 pb-20 flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-red-600 mb-4'>
              Error loading users:{' '}
              {error?.response?.data?.message || error?.message}
            </p>
            <Button onClick={() => refetch()} variant='outline'>
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-3 md:p-6 pb-20'>
        {/* Header */}
        <div className='mb-6'>
          <div className='flex flex-col gap-4'>
            <div className='text-center md:text-left'>
              <h1 className='text-2xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'>
                Admin Panel
              </h1>
              <p className='text-gray-600 mt-1 text-sm md:text-base'>
                Manage users, points & notifications
              </p>
            </div>
            <div className='flex flex-col sm:flex-row gap-3'>
              <div className='flex-1 sm:flex-none'>
                <Button
                  onClick={() => setShowNotificationDialog(true)}
                  variant='outline'
                  className='w-full sm:w-auto border-purple-200 px-4 hover:scale-105 transition-transform'
                >
                  <Megaphone className='w-4 h-4 mr-2' />
                  Broadcast to All
                </Button>
              </div>
              <div className='flex-1 sm:flex-none'>
                <Button
                  onClick={() => (window.location.href = '/session')}
                  variant='outline'
                  className='w-full sm:w-auto px-4 hover:scale-105 transition-transform'
                >
                  <Package className='w-4 h-4 mr-2' />
                  Session Tracker
                </Button>
              </div>
              <div className='flex-1 sm:flex-none'>
                <Button
                  onClick={() => navigate('/management/rewards')}
                  className='w-full sm:w-auto bg-blue-600 px-4 hover:scale-105 transition-transform hover:bg-blue-700'
                >
                  <GiftIcon className='w-4 h-4 mr-2' />
                  Manage Rewards
                </Button>
              </div>
              <div className='flex-1 sm:flex-none'>
                <Button
                  onClick={() => navigate('/management/services')}
                  className='w-full sm:w-auto bg-yellow-600 px-4 hover:scale-105 transition-transform hover:bg-yellow-700'
                >
                  <Briefcase className='w-4 h-4 mr-2' />
                  Manage Services
                </Button>
              </div>
              <div className='flex-1 sm:flex-none'>
                <Button
                  onClick={() => setShowLocationDialog(true)}
                  className='w-full sm:w-auto bg-green-600 px-4 hover:scale-105 transition-transform hover:bg-green-700'
                >
                  <MapPin className='w-4 h-4 mr-2' />
                  Add Location
                </Button>
              </div>
              <div className='flex-1 sm:flex-none'>
                <Button
                  onClick={() => setShowAddUserDialog(true)}
                  className='w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-4 hover:scale-105 transition-transform'
                >
                  <Plus className='w-4 h-4 mr-2' />
                  Add New Sub-Account
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main User Management */}
        <div>
          <Card className='border-0 shadow-lg bg-white/80 backdrop-blur-sm'>
            <CardHeader>
              <div className='flex flex-col gap-4'>
                <CardTitle className='flex items-center gap-2 text-lg md:text-xl'>
                  <Settings className='w-5 h-5 text-purple-500' />
                  User Management ({users.length} users)
                </CardTitle>

                {/* Search and Filter */}
                <div className='flex flex-col sm:flex-row gap-3'>
                  <div className='relative flex-1'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                    <Input
                      placeholder='Search users...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className='w-full sm:w-40'>
                      <Filter className='w-4 h-4 mr-2' />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Roles</SelectItem>
                      <SelectItem value='admin'>Admin</SelectItem>
                      <SelectItem value='enterprise'>Enterprise</SelectItem>
                      <SelectItem value='team'>Team</SelectItem>
                      <SelectItem value='user'>User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile Card Layout */}
              <div className='block md:hidden space-y-4'>
                <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <span className='text-sm font-medium text-gray-700'>
                    Select All
                  </span>
                  <Checkbox
                    checked={
                      selectedUsers.length === filteredUsers.length &&
                      filteredUsers.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </div>
                {filteredUsers.map((user, index) => (
                  <div
                    key={user._id || user.id}
                    className='border border-gray-200 rounded-xl p-4 bg-white shadow-sm transition-all hover:shadow-md'
                  >
                    {/* User Header */}
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-3'>
                        <UserAvatar name={user.name} role={user.role} />
                        <div>
                          <p className='font-medium text-gray-900'>
                            {user.name}
                          </p>
                          <p className='text-sm text-gray-500'>{user.email}</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedUsers.includes(user._id || user.id)}
                        onCheckedChange={() =>
                          handleUserSelect(user._id || user.id)
                        }
                      />
                    </div>

                    {/* User Details */}
                    <div className='grid grid-cols-2 gap-3 mb-4 text-sm'>
                      <div className='flex items-center gap-2'>
                        <Star className='w-4 h-4 text-yellow-500' />
                        <span>{(user.points || 0).toLocaleString()} pts</span>
                      </div>
                      <div>
                        <Badge
                          variant='outline'
                          className={
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : user.role === 'enterprise'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : user.role === 'team'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }
                        >
                          {user.role || 'user'}
                        </Badge>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className='grid grid-cols-3 gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleIndividualPointsAdjust(user)}
                        className='text-xs hover:scale-105 transition-transform'
                      >
                        <Zap className='w-3 h-3 mr-1' />
                        Points
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          setSelectedUsers([user._id || user.id])
                          setShowNotificationDialog(true)
                        }}
                        className='text-xs hover:scale-105 transition-transform'
                      >
                        <Send className='w-3 h-3 mr-1' />
                        Notify
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='text-xs hover:scale-105 transition-transform'
                      >
                        <Eye className='w-3 h-3 mr-1' />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className='hidden md:block overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-gray-200'>
                      <th className='text-left py-3 px-4 font-medium text-gray-700'>
                        <div className='flex items-center justify-center'>
                          <Checkbox
                            checked={
                              selectedUsers.length === filteredUsers.length &&
                              filteredUsers.length > 0
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </div>
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-700'>
                        User
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-700'>
                        Points
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-700'>
                        Role
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-700'>
                        Joined
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-700 min-w-[280px]'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr
                        key={user._id || user.id}
                        className='border-b border-gray-100 hover:bg-gray-50/50 transition-colors'
                      >
                        <td className='py-4 px-4'>
                          <div className='flex items-center justify-center'>
                            <Checkbox
                              checked={selectedUsers.includes(
                                user._id || user.id
                              )}
                              onCheckedChange={() =>
                                handleUserSelect(user._id || user.id)
                              }
                            />
                          </div>
                        </td>
                        <td className='py-4 px-4'>
                          <div className='flex items-center gap-3'>
                            <UserAvatar name={user.name} role={user.role} />
                            <div>
                              <p className='font-medium text-gray-900'>
                                {user.name}
                              </p>
                              <p className='text-sm text-gray-500'>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className='py-4 px-4'>
                          <div className='flex items-center gap-2'>
                            <Star className='w-4 h-4 text-yellow-500' />
                            <span className='font-medium'>
                              {(user.points || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className='py-4 px-4'>
                          <Badge
                            variant='outline'
                            className={
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : user.role === 'enterprise'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : user.role === 'team'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {user.role || 'user'}
                          </Badge>
                        </td>
                        <td className='py-4 px-4'>
                          <span className='text-sm text-gray-600'>
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </td>
                        <td className='py-4 px-4'>
                          <div className='flex items-center gap-2'>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => handleIndividualPointsAdjust(user)}
                              className='px-3 text-xs hover:scale-105 transition-transform'
                              title='Adjust Points'
                            >
                              <Zap className='w-4 h-4 mr-1' />
                              Points
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => {
                                setSelectedUsers([user._id || user.id])
                                setShowNotificationDialog(true)
                              }}
                              className='px-3 text-xs hover:scale-105 transition-transform'
                              title='Send Notification'
                            >
                              <Send className='w-4 h-4 mr-1' />
                              Notify
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              className='px-3 text-xs hover:scale-105 transition-transform'
                              title='View Details'
                            >
                              <Eye className='w-4 h-4 mr-1' />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Panel */}
        <BulkActionsPanel
          selectedUsers={selectedUsers}
          onPointsAdjust={() => console.log('Bulk points adjustment')}
          onNotification={handleBulkNotification}
          onDismiss={() => setSelectedUsers([])}
        />

        {/* Dialogs */}
        <PointsAdjustmentDialog
          user={selectedUser}
          isOpen={showPointsDialog}
          onClose={() => setShowPointsDialog(false)}
        />

        <NotificationDialog
          selectedUsers={selectedUsers}
          isOpen={showNotificationDialog}
          onClose={() => setShowNotificationDialog(false)}
        />

        <LocationForm
          isOpen={showLocationDialog}
          onClose={() => setShowLocationDialog(false)}
          onSuccess={handleLocationSuccess}
        />

        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <AddUserForm
            isOpen={showAddUserDialog}
            onClose={() => setShowAddUserDialog(false)}
            onSubmit={handleTeamMemberSubmit}
          />
        </Dialog>
      </div>
    </Layout>
  )
}

export default ManagementPage
