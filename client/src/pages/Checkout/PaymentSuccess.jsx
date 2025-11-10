// File: client/src/pages/Checkout/PaymentSuccess.jsx
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../Layout/Layout'
import {
  CheckCircle,
  Calendar,
  Clock,
  Award,
  ArrowRight,
  Download,
  Mail,
} from 'lucide-react'

const PaymentSuccess = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const { paymentIntent, bookingData, paymentDetails } = location.state || {}

  useEffect(() => {
    // Redirect if no payment data
    if (!paymentIntent) {
      navigate('/bookings')
      return
    }
  }, [])

  const handleViewBookings = () => {
    navigate('/dashboard')
  }

  const handleBookAnother = () => {
    navigate('/bookings')
  }

  if (!paymentIntent) {
    return null
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-12 px-4'>
        <div className='max-w-3xl mx-auto'>
          {/* Success Icon Animation */}
          <div className='text-center mb-8'>
            <div className='inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-6 animate-bounce'>
              <CheckCircle className='w-12 h-12 text-white' />
            </div>
            <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-3'>
              Payment Successful! 🎉
            </h1>
            <p className='text-lg text-gray-600'>
              Your booking has been confirmed
            </p>
          </div>

          {/* Booking Confirmation Card */}
          <div className='bg-white rounded-2xl border border-green-100 shadow-xl overflow-hidden mb-6'>
            {/* Header */}
            <div className='bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-2xl font-bold mb-1'>
                    Booking Confirmed
                  </h2>
                  <p className='text-green-100'>
                    Confirmation sent to your email
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm text-green-100 mb-1'>Payment ID</p>
                  <p className='font-mono text-xs bg-white/20 px-3 py-1 rounded-lg'>
                    {paymentIntent.id.slice(-12)}
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className='p-6 md:p-8 space-y-6'>
              {/* Service Info */}
              <div className='bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 rounded-xl p-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-4'>
                  Appointment Details
                </h3>
                <div className='space-y-3'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Service</span>
                    <span className='font-semibold text-gray-900'>
                      {bookingData?.serviceName || 'Service'}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600 flex items-center gap-2'>
                      <Calendar className='w-4 h-4' />
                      Date
                    </span>
                    <span className='font-semibold text-gray-900'>
                      {bookingData?.date || 'N/A'}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600 flex items-center gap-2'>
                      <Clock className='w-4 h-4' />
                      Time
                    </span>
                    <span className='font-semibold text-gray-900'>
                      {bookingData?.time || 'N/A'}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Duration</span>
                    <span className='font-semibold text-gray-900'>
                      {bookingData?.duration || 0} minutes
                    </span>
                  </div>

                  {bookingData?.treatment && (
                    <div className='flex justify-between items-center'>
                      <span className='text-gray-600'>Treatment</span>
                      <span className='font-semibold text-gray-900'>
                        {bookingData.treatment}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Summary */}
              <div className='bg-gray-50 border border-gray-200 rounded-xl p-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-4'>
                  Payment Summary
                </h3>
                <div className='space-y-3'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Amount Paid</span>
                    <span className='text-2xl font-bold text-green-600'>
                      ${paymentDetails?.amount || '0.00'}
                    </span>
                  </div>

                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-gray-500'>Payment Method</span>
                    <span className='text-gray-700 font-medium'>
                      {paymentIntent.payment_method_types?.[0] === 'card'
                        ? 'Credit/Debit Card'
                        : paymentIntent.payment_method_types?.[0] || 'Card'}
                    </span>
                  </div>

                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-gray-500'>Status</span>
                    <span className='text-green-600 font-semibold flex items-center gap-1'>
                      <CheckCircle className='w-4 h-4' />
                      Paid
                    </span>
                  </div>
                </div>
              </div>

              {/* Points Earned */}
              {paymentDetails?.pointsEarned > 0 && (
                <div className='bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-6'>
                  <div className='flex items-center gap-4'>
                    <div className='w-16 h-16 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full flex items-center justify-center'>
                      <Award className='w-8 h-8 text-white' />
                    </div>
                    <div className='flex-1'>
                      <h3 className='text-xl font-bold text-yellow-900 mb-1'>
                        +{paymentDetails.pointsEarned} Points Earned! 🎊
                      </h3>
                      <p className='text-sm text-yellow-700'>
                        Points have been added to your account
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className='bg-gray-50 border-t border-gray-200 p-6'>
              <div className='grid md:grid-cols-3 gap-3'>
                <button
                  onClick={handleViewBookings}
                  className='flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all'
                >
                  View My Bookings
                  <ArrowRight className='w-4 h-4' />
                </button>

                <button
                  onClick={handleBookAnother}
                  className='flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all'
                >
                  Book Another
                </button>

                <button
                  onClick={() => window.print()}
                  className='flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all'
                >
                  <Download className='w-4 h-4' />
                  Print Receipt
                </button>
              </div>
            </div>
          </div>

          {/* What's Next Section */}
          <div className='bg-white rounded-2xl border border-gray-200 p-6 md:p-8'>
            <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
              <Mail className='w-5 h-5 text-pink-500' />
              What's Next?
            </h3>
            <ul className='space-y-3'>
              <li className='flex items-start gap-3'>
                <div className='w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-pink-600 text-sm font-bold'>1</span>
                </div>
                <p className='text-gray-700'>
                  <strong>Check your email</strong> - You'll receive a
                  confirmation with all the details
                </p>
              </li>
              <li className='flex items-start gap-3'>
                <div className='w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-pink-600 text-sm font-bold'>2</span>
                </div>
                <p className='text-gray-700'>
                  <strong>Add to calendar</strong> - Don't forget your
                  appointment date and time
                </p>
              </li>
              <li className='flex items-start gap-3'>
                <div className='w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-pink-600 text-sm font-bold'>3</span>
                </div>
                <p className='text-gray-700'>
                  <strong>Arrive 10 minutes early</strong> - Give yourself time
                  to relax before your service
                </p>
              </li>
            </ul>
          </div>

          {/* Cancellation Policy */}
          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-500'>
              Need to reschedule? You can cancel or modify your booking up to
              24 hours before your appointment.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default PaymentSuccess
