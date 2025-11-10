import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { CheckCircle, AlertCircle, Calendar, ShoppingBag, Loader } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Layout from '@/pages/Layout/Layout'
import { clearCart } from '../../redux/cartSlice'

const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Give the webhook time to process
    const timer = setTimeout(() => {
      setLoading(false)

      // Clear the cart after successful payment
      dispatch(clearCart())

      // Show success notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Booking Confirmed! 🎉', {
          body: 'Your payment was successful and your booking is confirmed.',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
        })
      }

      // Show toast notification as fallback
      toast.success('Booking confirmed! Check your email for details.', {
        duration: 5000,
        icon: '🎉',
      })
    }, 2000)

    return () => clearTimeout(timer)
  }, [sessionId, dispatch])

  if (loading) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[70vh]'>
          <div className='text-center'>
            <Loader className='w-16 h-16 mx-auto mb-4 text-pink-500 animate-spin' />
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Processing your payment...
            </h2>
            <p className='text-gray-600'>
              Please wait while we confirm your booking.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className='px-4 py-8 max-w-2xl mx-auto'>
          <div className='bg-white rounded-lg shadow-sm p-8 text-center'>
            <AlertCircle className='w-20 h-20 mx-auto mb-4 text-red-500' />
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Payment Processing Error
            </h2>
            <p className='text-gray-600 mb-6'>{error}</p>
            <button
              onClick={() => navigate('/bookings')}
              className='bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 h-10 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700'
            >
              Return to Services
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='px-4 py-8 max-w-2xl mx-auto'>
        <div className='bg-white rounded-lg shadow-sm p-8'>
          <div className='text-center'>
            <CheckCircle className='w-20 h-20 mx-auto mb-4 text-green-500' />

            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Payment Successful!
            </h1>

            <p className='text-lg text-gray-600 mb-6'>
              Your booking has been confirmed and payment processed successfully.
            </p>

            <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-6'>
              <p className='text-sm text-green-800'>
                A confirmation email has been sent to your email address with all
                the booking details.
              </p>
            </div>

            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
              <p className='text-sm text-blue-800'>
                You can view your booking details and upcoming appointments in your
                dashboard. You'll receive a reminder 24 hours before your appointment.
              </p>
            </div>

            <div className='flex flex-col sm:flex-row gap-3 justify-center mt-8'>
              <button
                onClick={() => navigate('/dashboard')}
                className='flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 h-10 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700'
              >
                <Calendar className='w-5 h-5' />
                View My Bookings
              </button>
              <button
                onClick={() => navigate('/bookings')}
                className='flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-6 h-10 rounded-lg font-semibold hover:bg-gray-50'
              >
                <ShoppingBag className='w-5 h-5' />
                Browse Services
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookingSuccessPage
