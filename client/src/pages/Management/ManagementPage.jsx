import { axiosInstance } from '@/config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Star,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

// shadcn/ui components
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import Layout from '../Layout/Layout'

// Utility function to mask email
const maskEmail = (email) => {
  if (!email) return 'N/A'

  const [localPart, domain] = email.split('@')
  if (!domain) return email

  if (localPart.length <= 3) {
    return `${localPart.charAt(0)}***@${domain}`
  }

  const visibleStart = localPart.substring(0, 3)
  const visibleEnd = localPart.slice(-2)

  return `${visibleStart}***${visibleEnd}@${domain}`
}

// API functions
const fetchUsers = async (token, params) => {
  const queryParams = new URLSearchParams(params).toString()
  const response = await axiosInstance.get(`/auth/all-users?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data?.data || { users: [], pagination: {} }
}

const changeUserRole = async ({ userId, newRole, reason, token }) => {
  const response = await axiosInstance.put(
    `/auth/users/${userId}/role`,
    { newRole, reason },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}

const adjustUserPoints = async ({ userId, type, amount, reason, token }) => {
  const response = await axiosInstance.post(
    `/auth/users/${userId}/points`,
    { type, amount: parseInt(amount), reason },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}

const bulkUpdateUsers = async ({ userIds, action, data, token }) => {
  const response = await axiosInstance.post(
    '/auth/bulk-operations',
    { userIds, action, data },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}

// Role Badge Component
const RoleBadge = ({ role, className = '' }) => {
  const getRoleConfig = () => {
    switch (role) {
      case 'super-admin':
        return {
          color: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
          icon: Crown,
          label: 'Super Admin',
        }
      case 'admin':
        return {
          color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
          icon: Shield,
          label: 'Admin',
        }
      case 'team':
        return {
          color: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
          icon: Users,
          label: 'Team',
        }
      case 'enterprise':
        return {
          color: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
          icon: Star,
          label: 'Enterprise',
        }
      case 'user':
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border border-gray-200',
          icon: null,
          label: 'User',
        }
    }
  }

  const config = getRoleConfig()
  const Icon = config.icon

  return (
    <Badge className={`${config.color} ${className} flex items-center gap-1`}>
      {Icon && <Icon className='w-3 h-3' />}
      {config.label}
    </Badge>
  )
}

// User Avatar Component
const UserAvatar = ({ name, role, className = '' }) => {
  const getStatusColor = () => {
    switch (role) {
      case 'super-admin':
        return 'from-yellow-400 to-orange-500'
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
      {(role === 'admin' || role === 'super-admin') && (
        <div className='absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center'>
          {role === 'super-admin' ? (
            <Crown className='w-2 h-2 text-yellow-800' />
          ) : (
            <Shield className='w-2 h-2 text-yellow-800' />
          )}
        </div>
      )}
    </div>
  )
}

// Role Change Dialog
const RoleChangeDialog = ({ user, isOpen, onClose, currentUserRole }) => {
  const [newRole, setNewRole] = useState('')
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()
  const token = useSelector((state) => state.user.token)

  const roleChangeMutation = useMutation({
    mutationFn: changeUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User role updated successfully')
      onClose()
      setNewRole('')
      setReason('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update role')
    },
  })

  const getAvailableRoles = () => {
    const allRoles = [
      { value: 'user', label: 'User', disabled: false },
      { value: 'enterprise', label: 'Enterprise', disabled: false },
      { value: 'team', label: 'Team', disabled: false },
    ]

    if (currentUserRole === 'super-admin') {
      allRoles.push({ value: 'admin', label: 'Admin', disabled: false })
    }

    return allRoles.filter((role) => role.value !== user?.role)
  }

  const handleSubmit = () => {
    if (!newRole || !user || !token) return

    roleChangeMutation.mutate({
      userId: user._id || user.id,
      newRole,
      reason,
      token,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Shield className='w-5 h-5 text-blue-500' />
            Change Role - {user?.name}
          </DialogTitle>
          <DialogDescription>
            Current Role: <RoleBadge role={user?.role} className='ml-1' />
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='new-role'>New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder='Select new role' />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().map((role) => (
                  <SelectItem
                    key={role.value}
                    value={role.value}
                    disabled={role.disabled}
                  >
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='reason'>Reason (Optional)</Label>
            <Textarea
              id='reason'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Enter reason for role change...'
              className='min-h-[80px]'
            />
          </div>

          {newRole && (
            <div className='p-3 bg-blue-50 rounded-lg border border-blue-200'>
              <p className='text-sm text-blue-800'>
                <strong>Role Change:</strong> {user?.role} → {newRole}
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
            disabled={roleChangeMutation.isPending || !newRole}
            className='bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
          >
            {roleChangeMutation.isPending && (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            )}
            Update Role
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Points Adjustment Dialog
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
      toast.success('Points adjusted successfully')
      onClose()
      setAmount('')
      setReason('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to adjust points')
    },
  })

  const handleSubmit = () => {
    if (!amount || !user || !token) return

    pointsAdjustmentMutation.mutate({
      userId: user._id || user.id,
      type: adjustmentType,
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
            <Input
              id='amount'
              type='number'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder='Enter points'
            />
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
        </div>

        <div className='flex gap-2 justify-end'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pointsAdjustmentMutation.isPending || !amount}
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

// Pagination Component
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null

  const { currentPage, totalPages, hasNextPage, hasPreviousPage, totalUsers } =
    pagination

  const getPageNumbers = () => {
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const half = Math.floor(maxVisible / 2)
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  return (
    <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
      <div className='text-sm text-gray-700'>
        Showing page {currentPage} of {totalPages} ({totalUsers} total users)
      </div>
      <div className='flex items-center space-x-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          First
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>

        {getPageNumbers().map((pageNum) => (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? 'default' : 'outline'}
            size='sm'
            onClick={() => onPageChange(pageNum)}
            className={
              currentPage === pageNum ? 'bg-purple-600 hover:bg-purple-700' : ''
            }
          >
            {pageNum}
          </Button>
        ))}

        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          Last
        </Button>
      </div>
    </div>
  )
}

// Main Component
const FinalManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showPointsDialog, setShowPointsDialog] = useState(false)

  const navigate = useNavigate()
  const token = useSelector((state) => state.user.token)
  const currentUser = useSelector((state) => state.user.currentUser)
  const queryClient = useQueryClient()

  // Check permissions
  const hasManagementAccess = ['admin', 'team', 'super-admin'].includes(
    currentUser?.role
  )
  const canChangeRoles = ['admin', 'super-admin'].includes(currentUser?.role)
  const isSuperAdmin = currentUser?.role === 'super-admin'

  // Query parameters (no role filter)
  const queryParams = {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }

  // React Query for fetching users
  const {
    data: usersData = { users: [], pagination: {} },
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: () => fetchUsers(token, queryParams),
    enabled: !!token && hasManagementAccess,
    staleTime: 30000,
  })

  const { users, pagination } = usersData

  // Bulk operations mutation
  const bulkMutation = useMutation({
    mutationFn: bulkUpdateUsers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelectedUsers([])
      toast.success('Bulk operation completed successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bulk operation failed')
    },
  })

  // Handlers
  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map((user) => user._id || user.id))
    }
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    setSelectedUsers([])
  }

  const handleRoleChange = (user) => {
    setSelectedUser(user)
    setShowRoleDialog(true)
  }

  const handlePointsAdjust = (user) => {
    setSelectedUser(user)
    setShowPointsDialog(true)
  }

  const handleBulkRoleChange = (newRole) => {
    if (selectedUsers.length === 0) return

    bulkMutation.mutate({
      userIds: selectedUsers,
      action: 'changeRole',
      data: { newRole, reason: 'Bulk role change' },
      token,
    })
  }

  const handleViewProfile = (user) => {
    navigate(`/client/${user._id || user.id}`)
  }

  // Redirect if no access
  if (!token || !currentUser || !hasManagementAccess) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-6 flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-red-600 mb-4'>
              Access Denied. Management rights required.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
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
        <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-6 flex items-center justify-center'>
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
        <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-6 flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-red-600 mb-4'>
              Error loading users:{' '}
              {error?.response?.data?.message || error?.message}
            </p>
            <Button onClick={() => refetch()} variant='outline'>
              <RefreshCw className='w-4 h-4 mr-2' />
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-6'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h1 className='text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'>
                User Management
              </h1>
              <p className='text-gray-600 mt-1'>
                Manage users, roles, and permissions (
                {pagination.totalUsers || 0} total users)
              </p>
            </div>
            <RoleBadge role={currentUser.role} className='text-sm' />
          </div>

          {/* Search and Page Size */}
          <Card className='border-0 bg-white/80 backdrop-blur-sm mb-6'>
            <CardContent className='p-6'>
              <div className='flex flex-col lg:flex-row gap-4'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    placeholder='Search users by name or email...'
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className='pl-10'
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <label className='text-sm text-gray-600 whitespace-nowrap'>
                    Users per page:
                  </label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(parseInt(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className='w-20'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='10'>10</SelectItem>
                      <SelectItem value='25'>25</SelectItem>
                      <SelectItem value='50'>50</SelectItem>
                      <SelectItem value='100'>100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className='border-0 bg-white/80 backdrop-blur-sm'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='w-5 h-5 text-purple-500' />
                Users ({users.length})
              </CardTitle>
              <div className='flex items-center gap-2'>
                {selectedUsers.length > 0 && (
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-gray-600'>
                      {selectedUsers.length} selected
                    </span>
                    {canChangeRoles && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size='sm' variant='outline'>
                            Bulk Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleBulkRoleChange('user')}
                          >
                            Set as User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleBulkRoleChange('enterprise')}
                          >
                            Set as Enterprise
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleBulkRoleChange('team')}
                          >
                            Set as Team
                          </DropdownMenuItem>
                          {isSuperAdmin && (
                            <DropdownMenuItem
                              onClick={() => handleBulkRoleChange('admin')}
                            >
                              Set as Admin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
                <Button size='sm' variant='outline' onClick={() => refetch()}>
                  <RefreshCw className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className='hidden md:block overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='text-left py-3 px-4 font-medium text-gray-700'>
                      <Checkbox
                        checked={
                          selectedUsers.length === users.length &&
                          users.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className='text-left py-3 px-4 font-medium text-gray-700'>
                      User
                    </th>
                    <th className='text-left py-3 px-4 font-medium text-gray-700'>
                      Role
                    </th>
                    <th className='text-left py-3 px-4 font-medium text-gray-700'>
                      Points
                    </th>
                    <th className='text-left py-3 px-4 font-medium text-gray-700'>
                      Joined
                    </th>
                    <th className='text-left py-3 px-4 font-medium text-gray-700'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user._id || user.id}
                      className='border-b border-gray-100 hover:bg-gray-50/50 transition-colors'
                    >
                      <td className='py-4 px-4'>
                        <Checkbox
                          checked={selectedUsers.includes(user._id || user.id)}
                          onCheckedChange={() =>
                            handleUserSelect(user._id || user.id)
                          }
                        />
                      </td>
                      <td className='py-4 px-4'>
                        <div className='flex items-center gap-3'>
                          <UserAvatar name={user.name} role={user.role} />
                          <div>
                            <p className='font-medium text-gray-900'>
                              {user.name}
                            </p>
                            <p className='text-sm text-gray-500'>
                              {maskEmail(user.email)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='py-4 px-4'>
                        <RoleBadge role={user.role} />
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
                        <span className='text-sm text-gray-600'>
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </td>
                      <td className='py-4 px-4'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm'>
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(user)}
                            >
                              <Eye className='w-4 h-4 mr-2' />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handlePointsAdjust(user)}
                            >
                              <Zap className='w-4 h-4 mr-2' />
                              Adjust Points
                            </DropdownMenuItem>
                            {canChangeRoles && user.role !== 'super-admin' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user)}
                                >
                                  <Shield className='w-4 h-4 mr-2' />
                                  Change Role
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className='block md:hidden space-y-4'>
              {users.map((user) => (
                <Card key={user._id || user.id} className='p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-3'>
                      <UserAvatar name={user.name} role={user.role} />
                      <div>
                        <p className='font-medium text-gray-900'>{user.name}</p>
                        <p className='text-sm text-gray-500'>
                          {maskEmail(user.email)}
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedUsers.includes(user._id || user.id)}
                      onCheckedChange={() =>
                        handleUserSelect(user._id || user.id)
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <RoleBadge role={user.role} />
                      <div className='flex items-center gap-1'>
                        <Star className='w-4 h-4 text-yellow-500' />
                        <span className='text-sm font-medium'>
                          {user.points || 0}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleViewProfile(user)}
                        >
                          <Eye className='w-4 h-4 mr-2' />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handlePointsAdjust(user)}
                        >
                          <Zap className='w-4 h-4 mr-2' />
                          Adjust Points
                        </DropdownMenuItem>
                        {canChangeRoles && user.role !== 'super-admin' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(user)}
                            >
                              <Shield className='w-4 h-4 mr-2' />
                              Change Role
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className='mt-6 pt-4 border-t border-gray-200'>
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <RoleChangeDialog
          user={selectedUser}
          isOpen={showRoleDialog}
          onClose={() => setShowRoleDialog(false)}
          currentUserRole={currentUser.role}
        />

        <PointsAdjustmentDialog
          user={selectedUser}
          isOpen={showPointsDialog}
          onClose={() => setShowPointsDialog(false)}
        />
      </div>
    </Layout>
  )
}

export default FinalManagementPage
