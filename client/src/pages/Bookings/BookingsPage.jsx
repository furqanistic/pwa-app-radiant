// File: pwa-app-radiant/client/src/pages/Bookings/BookingsPage.jsx
// File: client/src/pages/Client/BookingsPage.jsx

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { bookingService } from '@/services/bookingService'
import { useSelector } from 'react-redux'
import Layout from '@/pages/Layout/Layout'
import BookingCard from '@/components/Bookings/BookingCard'
import RescheduleModal from '@/components/Bookings/RescheduleModal'
import CancelBookingModal from '@/components/Bookings/CancelBookingModal'
import { Calendar, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const BookingsPage = () => {
  const { currentUser } = useSelector((state) => state.user)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  // Fetch upcoming bookings
  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => bookingService.getClientBookings(),
  })

  // Fetch past bookings
  const { data: pastData, isLoading: pastLoading } = useQuery({
    queryKey: ['bookings', 'past'],
    queryFn: () => bookingService.getPastBookings(1, 20),
  })

  const upcomingBookings = upcomingData?.data?.appointments || []
  const pastBookings = pastData?.data?.visits || []

  const isLoading = upcomingLoading || pastLoading

  const handleReschedule = (bookingId) => {
    const booking = [...upcomingBookings, ...pastBookings].find(
      (b) => b._id === bookingId
    )
    setSelectedBooking(booking)
    setShowReschedule(true)
  }

  const handleCancel = (bookingId) => {
    const booking = [...upcomingBookings, ...pastBookings].find(
      (b) => b._id === bookingId
    )
    setSelectedBooking(booking)
    setShowCancel(true)
  }

  return (
    <Layout>
      <div className='px-4 py-8 max-w-4xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>My Bookings</h1>
          <p className='text-gray-600 mt-1'>
            Manage your appointments and reservations
          </p>
        </div>

        {/* Tabs */}
        <div className='flex gap-4 mb-6 border-b border-gray-200'>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'upcoming'
                ? 'border-b-2 border-pink-500 text-pink-600'
                : 'text-gray-600'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'past'
                ? 'border-b-2 border-pink-500 text-pink-600'
                : 'text-gray-600'
            }`}
          >
            Past ({pastBookings.length})
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className='text-center py-12'>
            <div className='w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto'></div>
          </div>
        )}

        {/* Bookings List */}
        {!isLoading && (
          <>
            {activeTab === 'upcoming' && (
              <>
                {upcomingBookings.length === 0 ? (
                  <div className='text-center py-12 bg-white rounded-lg border border-gray-200'>
                    <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-500'>No upcoming bookings</p>
                    <button
                      onClick={() => navigate('/services')}
                      className='mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600'
                    >
                      Browse Services
                    </button>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {upcomingBookings.map((booking) => (
                      <BookingCard
                        key={booking._id}
                        booking={booking}
                        onReschedule={handleReschedule}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'past' && (
              <>
                {pastBookings.length === 0 ? (
                  <div className='text-center py-12 bg-white rounded-lg border border-gray-200'>
                    <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-500'>No past bookings</p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {pastBookings.map((booking) => (
                      <BookingCard
                        key={booking._id}
                        booking={booking}
                        showActions={false}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {selectedBooking && (
        <>
          <RescheduleModal
            isOpen={showReschedule}
            onClose={() => setShowReschedule(false)}
            booking={selectedBooking}
          />
          <CancelBookingModal
            isOpen={showCancel}
            onClose={() => setShowCancel(false)}
            booking={selectedBooking}
          />
        </>
      )}
    </Layout>
  )
}

export default BookingsPage