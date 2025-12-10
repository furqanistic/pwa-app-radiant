// File: pwa-app-radiant/client/src/components/Bookings/BookingCard.jsx
// File: client/src/components/Bookings/BookingCard.jsx

import { Clock, MapPin, User, Trash2, RotateCcw, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BookingCard = ({
  booking,
  onReschedule,
  onCancel,
  onRate,
  showActions = true,
}) => {
  const bookingDate = new Date(booking.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const canCancel = (bookingDate - today) / (1000 * 60 * 60) > 24
  const isPast = bookingDate < today
  const isCompleted = booking.status === 'completed'

  const getStatusColor = () => {
    if (booking.status === 'cancelled') return 'bg-red-100 text-red-800'
    if (booking.status === 'rescheduled') return 'bg-blue-100 text-blue-800'
    if (booking.paymentStatus === 'completed')
      return 'bg-green-100 text-green-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const getStatusText = () => {
    if (booking.status === 'cancelled') return 'Cancelled'
    if (booking.status === 'rescheduled') return 'Rescheduled'
    if (booking.paymentStatus === 'completed') return 'Confirmed'
    return 'Pending Payment'
  }

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition'>
      {/* Header */}
      <div className='flex justify-between items-start mb-4'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900'>
            {booking.serviceName}
          </h3>
          <span
            className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}
          >
            {getStatusText()}
          </span>
        </div>
        <div className='text-right'>
          <p className='text-2xl font-bold text-green-600'>
            ${booking.finalPrice?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className='space-y-2 mb-6 text-sm text-gray-600'>
        <div className='flex items-center gap-2'>
          <Clock className='w-4 h-4' />
          <span>
            {new Date(booking.date).toLocaleDateString()} at {booking.time}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <Clock className='w-4 h-4' />
          <span>{booking.duration} minutes</span>
        </div>
        {booking.locationName && (
          <div className='flex items-center gap-2'>
            <MapPin className='w-4 h-4' />
            <span>{booking.locationName}</span>
          </div>
        )}
        {booking.providerName && (
          <div className='flex items-center gap-2'>
            <User className='w-4 h-4' />
            <span>{booking.providerName}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && !isPast && booking.status !== 'cancelled' && (
        <div className='flex gap-2'>
          {canCancel && (
            <Button
              onClick={() => onReschedule?.(booking._id)}
              variant='outline'
              className='flex-1'
            >
              <RotateCcw className='w-4 h-4 mr-2' />
              Reschedule
            </Button>
          )}
          {canCancel && (
            <Button
              onClick={() => onCancel?.(booking._id)}
              variant='destructive'
              className='flex-1'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Rating for completed bookings */}
      {showActions && isCompleted && !booking.rating && (
        <Button
          onClick={() => onRate?.(booking._id)}
          variant='outline'
          className='w-full'
        >
          <Star className='w-4 h-4 mr-2' />
          Rate This Visit
        </Button>
      )}
    </div>
  )
}

export default BookingCard