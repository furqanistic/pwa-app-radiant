import { AnimatePresence, motion } from 'framer-motion'
import {
  Eye,
  Filter,
  Gift,
  Megaphone,
  Minus,
  Plus,
  Search,
  Send,
  Settings,
  Star,
  UserCheck,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Layout from '../Layout/Layout'

// shadcn/ui components (assuming these are available)
import AddUserForm from '@/components/Management/AddUserForm'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

// Mock data for registered users
const mockUsers = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 (555) 123-4567',
    points: 2450,
    totalSessions: 12,
    completedSessions: 10,
    joinDate: '2024-01-15',
    lastActive: '2024-07-02',
    status: 'Active',
    preferredTreatment: 'HydraFacial',
    totalSpent: 2400,
    avatar: 'SJ',
    notificationPrefs: { email: true, sms: true, push: true },
  },
  {
    id: 2,
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '+1 (555) 987-6543',
    points: 1200,
    totalSessions: 8,
    completedSessions: 7,
    joinDate: '2024-02-20',
    lastActive: '2024-06-28',
    status: 'Active',
    preferredTreatment: 'Botox',
    totalSpent: 1800,
    avatar: 'ER',
    notificationPrefs: { email: true, sms: false, push: true },
  },
  {
    id: 3,
    name: 'Maya Patel',
    email: 'maya.p@email.com',
    phone: '+1 (555) 456-7890',
    points: 850,
    totalSessions: 5,
    completedSessions: 4,
    joinDate: '2024-03-10',
    lastActive: '2024-06-15',
    status: 'Inactive',
    preferredTreatment: 'Laser Hair Removal',
    totalSpent: 950,
    avatar: 'MP',
    notificationPrefs: { email: true, sms: true, push: false },
  },
  {
    id: 4,
    name: 'Jessica Chen',
    email: 'jessica.c@email.com',
    phone: '+1 (555) 321-9876',
    points: 3200,
    totalSessions: 18,
    completedSessions: 16,
    joinDate: '2023-11-05',
    lastActive: '2024-07-01',
    status: 'VIP',
    preferredTreatment: 'Full Package',
    totalSpent: 4500,
    avatar: 'JC',
    notificationPrefs: { email: true, sms: true, push: true },
  },
]

// Reusable Components
const UserAvatar = ({ name, status, className = '' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'VIP':
        return 'from-yellow-400 to-orange-500'
      case 'Active':
        return 'from-green-400 to-blue-500'
      case 'Inactive':
        return 'from-gray-400 to-gray-500'
      default:
        return 'from-pink-400 to-purple-500'
    }
  }

  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getStatusColor()} flex items-center justify-center text-white font-semibold text-sm relative ${className}`}
    >
      {name}
      {status === 'VIP' && (
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

  const handleSubmit = () => {
    // Handle points adjustment logic here
    console.log(
      `${adjustmentType === 'add' ? 'Adding' : 'Removing'} ${amount} points ${
        adjustmentType === 'add' ? 'to' : 'from'
      } ${user?.name}`
    )
    onClose()
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
                  setAmount((prev) => Math.max(0, parseInt(prev || 0) - 50))
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
                onClick={() => setAmount((prev) => parseInt(prev || 0) + 50)}
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
            className='bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
          >
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

  const handleSend = () => {
    console.log('Sending notification:', {
      type: notificationType,
      message,
      subject,
      channels,
      users: selectedUsers,
    })
    onClose()
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
                <SelectItem value='active'>Active Users Only</SelectItem>
                <SelectItem value='vip'>VIP Users Only</SelectItem>
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

          <div className='space-y-2'>
            <Label>Channels</Label>
            <div className='flex gap-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='email'
                  checked={channels.email}
                  onCheckedChange={(checked) =>
                    setChannels((prev) => ({ ...prev, email: checked }))
                  }
                />
                <Label htmlFor='email' className='text-sm'>
                  Email
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='sms'
                  checked={channels.sms}
                  onCheckedChange={(checked) =>
                    setChannels((prev) => ({ ...prev, sms: checked }))
                  }
                />
                <Label htmlFor='sms' className='text-sm'>
                  SMS
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='push'
                  checked={channels.push}
                  onCheckedChange={(checked) =>
                    setChannels((prev) => ({ ...prev, push: checked }))
                  }
                />
                <Label htmlFor='push' className='text-sm'>
                  Push
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className='flex gap-2 justify-end'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            className='bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
          >
            <Send className='w-4 h-4 mr-2' />
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
      <AnimatePresence>
        {selectedUsers.length > 0 && !showBottomSheet && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className='fixed bottom-6 right-6 z-40'
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShow}
              className='relative bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white p-4 rounded-full shadow-2xl border-4 border-white'
            >
              <UserCheck className='w-6 h-6' />

              {/* Badge with count */}
              <div className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center'>
                {selectedUsers.length}
              </div>

              {/* Ripple effect */}
              <div className='absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 animate-ping opacity-20'></div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {showBottomSheet && selectedUsers.length > 0 && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 bg-black/20 backdrop-blur-sm z-40'
              onClick={handleClose}
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className='fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100'
            >
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
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onPointsAdjust(selectedUsers)
                      handleClose()
                    }}
                    className='w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-2xl border border-purple-100 transition-all'
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
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onNotification(selectedUsers)
                      handleClose()
                    }}
                    className='w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-2xl border border-blue-100 transition-all'
                  >
                    <div className='w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center'>
                      <Send className='w-6 h-6 text-white' />
                    </div>
                    <div className='flex-1 text-left'>
                      <p className='font-medium text-gray-900'>Send Message</p>
                      <p className='text-sm text-gray-500'>
                        Send notifications via email, SMS, or push
                      </p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      // Handle issue rewards
                      handleClose()
                    }}
                    className='w-full flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 rounded-2xl border border-green-100 transition-all'
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
                  </motion.button>

                  {/* Clear Selection Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClose}
                    className='w-full flex items-center justify-center gap-2 p-3 mt-4 text-gray-600 hover:text-gray-800 transition-colors'
                  >
                    <span className='text-sm'>Clear Selection</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

const AdminPanel = () => {
  const [users, setUsers] = useState(mockUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPointsDialog, setShowPointsDialog] = useState(false)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter =
      filterStatus === 'all' ||
      user.status.toLowerCase() === filterStatus.toLowerCase()
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
      setSelectedUsers(filteredUsers.map((user) => user.id))
    }
  }

  const handleIndividualPointsAdjust = (user) => {
    setSelectedUser(user)
    setShowPointsDialog(true)
  }

  const handleBulkNotification = (users) => {
    setShowNotificationDialog(true)
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-3 md:p-6 pb-20'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mb-6'
        >
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
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className='flex-1 sm:flex-none'
              >
                <Button
                  onClick={() => setShowNotificationDialog(true)}
                  variant='outline'
                  className='w-full sm:w-auto border-purple-200 px-4'
                >
                  <Megaphone className='w-4 h-4 mr-2' />
                  Broadcast to All
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className='flex-1 sm:flex-none'
              >
                <Button
                  onClick={() => setShowAddUserDialog(true)}
                  className='w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-4'
                >
                  <Plus className='w-4 h-4 mr-2' />
                  Add New Sub-Account
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Main User Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className='border-0 shadow-lg bg-white/80 backdrop-blur-sm'>
            <CardHeader>
              <div className='flex flex-col gap-4'>
                <CardTitle className='flex items-center gap-2 text-lg md:text-xl'>
                  <Settings className='w-5 h-5 text-purple-500' />
                  User Management
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
                      <SelectItem value='all'>All Status</SelectItem>
                      <SelectItem value='active'>Active</SelectItem>
                      <SelectItem value='inactive'>Inactive</SelectItem>
                      <SelectItem value='vip'>VIP</SelectItem>
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
                <AnimatePresence>
                  {filteredUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className='border border-gray-200 rounded-xl p-4 bg-white shadow-sm'
                    >
                      {/* User Header */}
                      <div className='flex items-center justify-between mb-3'>
                        <div className='flex items-center gap-3'>
                          <UserAvatar name={user.avatar} status={user.status} />
                          <div>
                            <p className='font-medium text-gray-900'>
                              {user.name}
                            </p>
                            <p className='text-sm text-gray-500'>
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleUserSelect(user.id)}
                        />
                      </div>

                      {/* User Details */}
                      <div className='grid grid-cols-2 gap-3 mb-4 text-sm'>
                        <div className='flex items-center gap-2'>
                          <Star className='w-4 h-4 text-yellow-500' />
                          <span>{user.points.toLocaleString()} pts</span>
                        </div>
                        <div>
                          <Badge
                            variant='outline'
                            className={
                              user.status === 'VIP'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : user.status === 'Active'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {user.status}
                          </Badge>
                        </div>
                        <div className='text-gray-600'>
                          Last: {user.lastActive}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className='grid grid-cols-3 gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleIndividualPointsAdjust(user)}
                          className='text-xs'
                        >
                          <Zap className='w-3 h-3 mr-1' />
                          Points
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            setSelectedUsers([user.id])
                            setShowNotificationDialog(true)
                          }}
                          className='text-xs'
                        >
                          <Send className='w-3 h-3 mr-1' />
                          Notify
                        </Button>
                        <Button size='sm' variant='outline' className='text-xs'>
                          <Eye className='w-3 h-3 mr-1' />
                          View
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
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
                        Status
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-700'>
                        Last Active
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-700 min-w-[280px]'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className='border-b border-gray-100 hover:bg-gray-50/50 transition-colors'
                        >
                          <td className='py-4 px-4'>
                            <div className='flex items-center justify-center'>
                              <Checkbox
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() =>
                                  handleUserSelect(user.id)
                                }
                              />
                            </div>
                          </td>
                          <td className='py-4 px-4'>
                            <div className='flex items-center gap-3'>
                              <UserAvatar
                                name={user.avatar}
                                status={user.status}
                              />
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
                                {user.points.toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className='py-4 px-4'>
                            <Badge
                              variant='outline'
                              className={
                                user.status === 'VIP'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  : user.status === 'Active'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }
                            >
                              {user.status}
                            </Badge>
                          </td>
                          <td className='py-4 px-4'>
                            <span className='text-sm text-gray-600'>
                              {user.lastActive}
                            </span>
                          </td>
                          <td className='py-4 px-4'>
                            <div className='flex items-center gap-2'>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                  handleIndividualPointsAdjust(user)
                                }
                                className='px-3 text-xs'
                                title='Adjust Points'
                              >
                                <Zap className='w-4 h-4 mr-1' />
                                Points
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => {
                                  setSelectedUsers([user.id])
                                  setShowNotificationDialog(true)
                                }}
                                className='px-3 text-xs'
                                title='Send Notification'
                              >
                                <Send className='w-4 h-4 mr-1' />
                                Notify
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                className='px-3 text-xs'
                                title='View Details'
                              >
                                <Eye className='w-4 h-4 mr-1' />
                                View
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

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
        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <AddUserForm
            isOpen={showAddUserDialog}
            onClose={() => setShowAddUserDialog(false)}
            onSubmit={(userData) => {
              console.log('New user data:', userData)

              setShowAddUserDialog(false)
            }}
          />
        </Dialog>
      </div>
    </Layout>
  )
}

export default AdminPanel
