// File: pwa-app-radiant/client/src/pages/Management/BookingsManagementPage.js
// File: client/src/pages/Management/BookingsManagementPage.jsx

import { Button } from '@/components/ui/button'
import Layout from '@/pages/Layout/Layout'
import { bookingService } from '@/services/bookingService'
import { useQuery } from '@tanstack/react-query'
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    MapPin,
    Search,
    User,
} from 'lucide-react'
import { useState } from 'react'
import { useSelector } from 'react-redux'

const BookingsManagementPage = () => {
  const { currentUser } = useSelector((state) => state.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  // Fetch admin bookings
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['admin-bookings', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: () =>
      bookingService.getAdminBookings({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: ['admin', 'super-admin', 'spa'].includes(currentUser?.role),
  })

  const bookings = bookingsData?.data?.bookings || []
  const pagination = bookingsData?.data?.pagination || {}

  const totalBookings = pagination.totalBookings || 0
  const totalPages = pagination.totalPages || 1

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'no-show':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentColor = (status) => {
    return status === 'completed'
      ? 'bg-green-50 text-green-700'
      : 'bg-yellow-50 text-yellow-700'
  }

  return (
    <Layout>
      <div className='px-4 py-8 max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Bookings Management</h1>
          <p className='text-gray-600 mt-1'>
            Monitor and manage all client bookings
          </p>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
          <div className='bg-white rounded-lg p-6 border border-gray-200'>
            <p className='text-gray-600 text-sm'>Total Bookings</p>
            <p className='text-3xl font-bold text-gray-900 mt-2'>{totalBookings}</p>
          </div>
          <div className='bg-white rounded-lg p-6 border border-gray-200'>
            <p className='text-gray-600 text-sm'>Today's Bookings</p>
            <p className='text-3xl font-bold text-green-600 mt-2'>0</p>
          </div>
          <div className='bg-white rounded-lg p-6 border border-gray-200'>
            <p className='text-gray-600 text-sm'>Pending Payments</p>
            <p className='text-3xl font-bold text-yellow-600 mt-2'>0</p>
          </div>
          <div className='bg-white rounded-lg p-6 border border-gray-200'>
            <p className='text-gray-600 text-sm'>Completed</p>
            <p className='text-3xl font-bold text-blue-600 mt-2'>0</p>
          </div>
        </div>

        {/* Filters */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
              <input
                type='text'
                placeholder='Search by client name, email, or service...'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500'
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500'
            >
              <option value='all'>All Status</option>
              <option value='scheduled'>Scheduled</option>
              <option value='confirmed'>Confirmed</option>
              <option value='completed'>Completed</option>
              <option value='cancelled'>Cancelled</option>
              <option value='no-show'>No Show</option>
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
          <div className='overflow-x-auto'>
            {isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <div className='w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin'></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className='text-center py-12'>
                <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                <p className='text-gray-500'>No bookings found</p>
              </div>
            ) : (
              <>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                        Client
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                        Service
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                        Date & Time
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                        Location
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                        Price
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                        Payment
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200'>
                    {bookings.map((booking) => (
                      <tr key={booking._id} className='hover:bg-gray-50'>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div>
                            <p className='text-sm font-medium text-gray-900'>
                              {booking.clientName || 'N/A'}
                            </p>
                            <p className='text-xs text-gray-500'>
                              {booking.clientEmail || 'N/A'}
                            </p>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <p className='text-sm text-gray-900'>
                            {booking.serviceName}
                          </p>
                          {booking.treatmentName && (
                            <p className='text-xs text-gray-500'>
                              {booking.treatmentName}
                            </p>
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='text-sm text-gray-900'>
                            <div className='flex items-center gap-1'>
                              <Calendar className='w-4 h-4 text-gray-400' />
                              {new Date(booking.date).toLocaleDateString()}
                            </div>
                            <div className='flex items-center gap-1 text-gray-500'>
                              <Clock className='w-4 h-4' />
                              {booking.time}
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center gap-1 text-sm text-gray-900'>
                            <MapPin className='w-4 h-4 text-gray-400' />
                            {booking.locationName || 'N/A'}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <p className='text-sm font-semibold text-green-600'>
                            ${booking.finalPrice?.toFixed(2) || '0.00'}
                          </p>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${getPaymentColor(
                              booking.paymentStatus
                            )}`}
                          >
                            {booking.paymentStatus}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-pink-600 hover:text-pink-700 hover:bg-pink-50'
                          >
                            <Eye className='w-4 h-4' />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-between px-6 py-4 border-t border-gray-200'>
                    <p className='text-sm text-gray-600'>
                      Showing{' '}
                      <span className='font-medium'>
                        {(currentPage - 1) * pageSize + 1}
                      </span>{' '}
                      to{' '}
                      <span className='font-medium'>
                        {Math.min(currentPage * pageSize, totalBookings)}
                      </span>{' '}
                      of <span className='font-medium'>{totalBookings}</span>
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className='w-4 h-4' />
                      </Button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <Button
                          key={i + 1}
                          variant={
                            currentPage === i + 1 ? 'default' : 'outline'
                          }
                          size='sm'
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookingsManagementPage