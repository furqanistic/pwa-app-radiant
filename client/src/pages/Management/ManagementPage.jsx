// File: client/src/pages/Management/ManagementPage.jsx
import { authService } from '@/services/authService'
import { locationService } from '@/services/locationService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  Bell,
  Building,
  ChevronLeft,
  ChevronRight,
  Edit,
  Gift,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// Import components
import AddUserForm from '@/components/Management/AddUserForm'
import LocationAssignmentForm from '@/components/Management/LocationAssignmentForm'
import LocationForm from '@/components/Management/LocationForm'
import NotificationSender from '@/components/Management/NotificationSender'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Layout from '@/pages/Layout/Layout'

const ManagementPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentUser } = useSelector((state) => state.user)

  // State management
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false)
  const [isLocationAssignmentOpen, setIsLocationAssignmentOpen] =
    useState(false)
  const [isNotificationSenderOpen, setIsNotificationSenderOpen] =
    useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')

  // FIXED: Check if user has elevated permissions (admin, team, enterprise, super-admin)
  const isElevatedUser = [
    'admin',
    'team',
    'enterprise',
    'super-admin',
  ].includes(currentUser?.role)
  const isAdminOrAbove = ['admin', 'super-admin'].includes(currentUser?.role)
  const isSuperAdmin = currentUser?.role === 'super-admin'

  // Get current user's location for filtering
  const currentUserLocationId =
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId

  // Fetch users with location filtering
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: [
      'all-users',
      currentPage,
      pageSize,
      searchTerm,
      currentUserLocationId,
    ],
    queryFn: () =>
      authService.getAllUsers({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        // Filter by location if user has one assigned
        ...(currentUserLocationId && {
          locationId: currentUserLocationId,
        }),
      }),
    keepPreviousData: true,
  })

  // Fetch locations (admin only)
  const {
    data: locationsData,
    isLoading: isLoadingLocations,
    refetch: refetchLocations,
  } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAllLocations(),
    enabled: isAdminOrAbove,
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: authService.createTeamMember,
    onSuccess: () => {
      toast.success('User created successfully!')
      queryClient.invalidateQueries(['all-users'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create user')
    },
  })

  // UPDATED: Navigation cards for elevated users (admin, team, enterprise, super-admin)
  const managementRoutes = [
    {
      title: 'Service Management',
      description: 'Manage services, bookings, and pricing',
      icon: Settings,
      path: '/management/services',
      color: 'from-blue-500 to-blue-600',
      visible: isElevatedUser, // Changed from isAdminOrAbove to isElevatedUser
    },
    {
      title: 'Spin & Games',
      description: 'Configure scratch cards and spin games',
      icon: Zap,
      path: '/management/spin',
      color: 'from-purple-500 to-purple-600',
      visible: isElevatedUser, // Changed from isAdminOrAbove to isElevatedUser
    },
    {
      title: 'Rewards System',
      description: 'Manage rewards, points, and incentives',
      icon: Gift,
      path: '/management/rewards',
      color: 'from-green-500 to-green-600',
      visible: isElevatedUser, // Changed from isAdminOrAbove to isElevatedUser
    },
    {
      title: 'Referral Program',
      description: 'Configure referral bonuses and tracking',
      icon: Award,
      path: '/management/referral',
      color: 'from-pink-500 to-pink-600',
      visible: isElevatedUser, // Changed from isAdminOrAbove to isElevatedUser
    },
  ]

  // Pagination calculations
  const pagination = usersData?.data?.pagination || {}
  const users = usersData?.data?.users || []
  const locations = locationsData?.data?.locations || []

  const totalUsers = pagination.totalUsers || 0
  const totalPages = pagination.totalPages || 1
  const startIndex = totalUsers > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endIndex = Math.min(startIndex + users.length - 1, totalUsers)

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page)
    }
  }

  const handleCreateUser = async (userData) => {
    await createUserMutation.mutateAsync(userData)
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const getPageNumbers = () => {
      const pages = []
      const maxVisible = 5

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        const start = Math.max(1, currentPage - 2)
        const end = Math.min(totalPages, start + maxVisible - 1)

        for (let i = start; i <= end; i++) {
          pages.push(i)
        }

        if (start > 1) {
          pages.unshift('...')
          pages.unshift(1)
        }

        if (end < totalPages) {
          pages.push('...')
          pages.push(totalPages)
        }
      }

      return pages
    }

    return (
      <div className='flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6'>
        <div className='flex flex-1 justify-between sm:hidden'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>

        <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-between'>
          <div>
            <p className='text-sm text-gray-700'>
              Showing <span className='font-medium'>{startIndex}</span> to{' '}
              <span className='font-medium'>{endIndex}</span> of{' '}
              <span className='font-medium'>{totalUsers}</span> results
            </p>
          </div>

          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className='w-4 h-4' />
            </Button>

            {getPageNumbers().map((page, index) => (
              <Button
                key={index}
                variant={page === currentPage ? 'default' : 'outline'}
                size='sm'
                onClick={() =>
                  typeof page === 'number' && handlePageChange(page)
                }
                disabled={page === '...'}
                className={page === currentPage ? 'bg-blue-600 text-white' : ''}
              >
                {page}
              </Button>
            ))}

            <Button
              variant='outline'
              size='sm'
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className='w-4 h-4' />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Management Dashboard
            </h1>
            <p className='text-gray-600'>
              Manage users, locations, and system settings
              {currentUserLocationId && (
                <span className='block text-sm text-blue-600 mt-1'>
                  Showing users from your location:{' '}
                  {currentUser?.selectedLocation?.locationName ||
                    currentUser?.spaLocation?.locationName}
                </span>
              )}
            </p>
          </div>

          {/* UPDATED: Navigation Cards - Now for Elevated Users (admin, team, enterprise, super-admin) */}
          {isElevatedUser && (
            <div className='mb-8'>
              <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                Quick Actions
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                {managementRoutes
                  .filter((route) => route.visible)
                  .map((route) => (
                    <button
                      key={route.path}
                      onClick={() => navigate(route.path)}
                      className={`p-6 bg-gradient-to-r ${route.color} rounded-xl text-white hover:opacity-90 transition-all transform hover:scale-105`}
                    >
                      <route.icon className='w-8 h-8 mb-3' />
                      <h3 className='font-semibold text-lg mb-2'>
                        {route.title}
                      </h3>
                      <p className='text-sm opacity-90'>{route.description}</p>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <Button
              onClick={() => setIsAddUserOpen(true)}
              className='bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            >
              <UserPlus className='w-4 h-4 mr-2' />
              Add User
            </Button>

            {/* NEW: Send Notification Button - For Elevated Users */}
            {isElevatedUser && (
              <Button
                onClick={() => setIsNotificationSenderOpen(true)}
                className='bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
              >
                <Bell className='w-4 h-4 mr-2' />
                Send Notification
              </Button>
            )}

            {isAdminOrAbove && (
              <>
                <Button
                  onClick={() => setIsLocationFormOpen(true)}
                  className='bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                >
                  <MapPin className='w-4 h-4 mr-2' />
                  Add Location
                </Button>

                <Button
                  onClick={() => setIsLocationAssignmentOpen(true)}
                  className='bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                >
                  <UserCheck className='w-4 h-4 mr-2' />
                  Assign Location
                </Button>
              </>
            )}

            <Button
              variant='outline'
              onClick={() => queryClient.invalidateQueries(['all-users'])}
            >
              <RefreshCw className='w-4 h-4 mr-2' />
              Refresh
            </Button>
          </div>

          {/* Search */}
          <div className='bg-white rounded-lg border border-gray-200 p-4 mb-6'>
            <div className='flex flex-col sm:flex-row gap-4'>
              <div className='flex-1'>
                <input
                  type='text'
                  placeholder='Search users...'
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
            <div className='px-6 py-4 border-b border-gray-200'>
              <h3 className='text-lg font-medium text-gray-900'>
                Team Members ({totalUsers})
              </h3>
            </div>

            {isLoadingUsers ? (
              <div className='flex items-center justify-center py-12'>
                <div className='w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin'></div>
              </div>
            ) : usersError ? (
              <div className='text-center py-12'>
                <p className='text-red-600'>Error loading users</p>
              </div>
            ) : users.length === 0 ? (
              <div className='text-center py-12'>
                <Users className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                <p className='text-gray-500'>
                  {searchTerm
                    ? 'No users found matching your search'
                    : 'No users found in your location'}
                </p>
              </div>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          User
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Role
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Location
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Points
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Joined
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {users.map((user) => (
                        <tr key={user._id} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center'>
                              <div className='flex-shrink-0 h-10 w-10'>
                                <div className='h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 flex items-center justify-center'>
                                  <span className='text-white font-medium text-sm'>
                                    {user.name?.charAt(0)?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className='ml-4'>
                                <div className='text-sm font-medium text-gray-900'>
                                  {user.name}
                                </div>
                                <div className='text-sm text-gray-500'>
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
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
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {user.selectedLocation?.locationName ||
                              user.spaLocation?.locationName ||
                              'Not assigned'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {user.points || 0}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='sm'>
                                  <MoreVertical className='w-4 h-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuItem>
                                  <Edit className='w-4 h-4 mr-2' />
                                  Edit User
                                </DropdownMenuItem>
                                {/* NEW: Send Notification to specific user */}
                                {isElevatedUser && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setIsNotificationSenderOpen(true)
                                      // You can pass the specific user to the notification sender
                                    }}
                                  >
                                    <Send className='w-4 h-4 mr-2' />
                                    Send Notification
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className='text-red-600'>
                                  <Trash2 className='w-4 h-4 mr-2' />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination()}
              </>
            )}
          </div>

          {/* Location Management Section */}
          {isAdminOrAbove && (
            <div className='mt-8 bg-white rounded-lg border border-gray-200 overflow-hidden'>
              <div className='px-6 py-4 border-b border-gray-200 flex items-center justify-between'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Locations ({locations.length})
                </h3>
                <Button
                  size='sm'
                  onClick={() => refetchLocations()}
                  variant='outline'
                >
                  <RefreshCw className='w-4 h-4 mr-2' />
                  Refresh
                </Button>
              </div>

              {isLoadingLocations ? (
                <div className='flex items-center justify-center py-12'>
                  <div className='w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin'></div>
                </div>
              ) : locations.length === 0 ? (
                <div className='text-center py-12'>
                  <Building className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                  <p className='text-gray-500'>No locations found</p>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Location
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Address
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Status
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {locations.map((location) => (
                        <tr key={location._id} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div>
                              <div className='text-sm font-medium text-gray-900'>
                                {location.name || 'Unnamed Location'}
                              </div>
                              <div className='text-sm text-gray-500'>
                                ID: {location.locationId}
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {location.address || 'No address'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                location.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {location.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {new Date(location.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <AddUserForm
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
          onSubmit={handleCreateUser}
        />

        {/* NEW: Notification Sender Modal */}
        {isElevatedUser && (
          <NotificationSender
            isOpen={isNotificationSenderOpen}
            onClose={() => setIsNotificationSenderOpen(false)}
            users={users}
            currentUser={currentUser}
          />
        )}

        {isAdminOrAbove && (
          <>
            <LocationForm
              isOpen={isLocationFormOpen}
              onClose={() => setIsLocationFormOpen(false)}
              onSuccess={() => {
                toast.success('Location created successfully!')
                refetchLocations()
              }}
            />

            <LocationAssignmentForm
              isOpen={isLocationAssignmentOpen}
              onClose={() => setIsLocationAssignmentOpen(false)}
              onSuccess={() => {
                queryClient.invalidateQueries(['all-users'])
                refetchLocations()
              }}
            />
          </>
        )}
      </div>
    </Layout>
  )
}

export default ManagementPage
