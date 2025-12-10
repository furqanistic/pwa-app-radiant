// File: pwa-app-radiant/client/src/components/Bookings/RescheduleModal.jsx
// File: client/src/components/Bookings/RescheduleModal.jsx

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingService } from '@/services/bookingService'
import { Button } from '@/components/ui/button'
import { X, Calendar, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const RescheduleModal = ({ isOpen, onClose, booking }) => {
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const rescheduleeMutation = useMutation({
    mutationFn: () =>
      bookingService.rescheduleBooking(booking._id, newDate, newTime),
    onSuccess: () => {
      toast.success('Booking rescheduled successfully!')
      queryClient.invalidateQueries(['bookings'])
      setNewDate('')
      setNewTime('')
      onClose()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to reschedule booking')
      setError(err.message)
    },
  })

  const handleSubmit = () => {
    setError('')

    // Validation
    if (!newDate) {
      setError('Please select a new date')
      return
    }
    if (!newTime) {
      setError('Please select a new time')
      return
    }

    // Check if new date is at least 24 hours away
    const selectedDate = new Date(`${newDate}T${newTime}`)
    const now = new Date()
    const hoursUntilBooking = (selectedDate - now) / (1000 * 60 * 60)

    if (hoursUntilBooking < 24) {
      setError('Booking must be at least 24 hours from now')
      return
    }

    rescheduleeMutation.mutate()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg max-w-md w-full p-6'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-xl font-bold text-gray-900'>Reschedule Booking</h2>
          <button
            onClick={onClose}
            className='p-1 hover:bg-gray-100 rounded-lg'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Current Details */}
        <div className='bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200'>
          <h3 className='font-semibold text-gray-900 mb-2'>
            {booking.serviceName}
          </h3>
          <div className='space-y-1 text-sm text-gray-700'>
            <div className='flex items-center gap-2'>
              <Calendar className='w-4 h-4' />
              <span>
                {new Date(booking.date).toLocaleDateString()} at{' '}
                {booking.time}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='w-4 h-4' />
              <span>{booking.duration} minutes</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className='space-y-4 mb-6'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              New Date
            </label>
            <input
              type='date'
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              New Time
            </label>
            <input
              type='time'
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500'
            />
          </div>

          {error && (
            <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className='flex gap-3'>
          <Button
            variant='outline'
            onClick={onClose}
            disabled={rescheduleeMutation.isPending}
            className='flex-1'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rescheduleeMutation.isPending || !newDate || !newTime}
            className='flex-1 bg-pink-500 hover:bg-pink-600'
          >
            {rescheduleeMutation.isPending ? 'Rescheduling...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RescheduleModal