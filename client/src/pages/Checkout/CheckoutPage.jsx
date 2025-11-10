// File: client/src/pages/Checkout/CheckoutPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { toast } from 'react-hot-toast'
import stripeService from '../../services/stripeService'
import Layout from '../Layout/Layout'
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Award,
  Clock,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
)

// Payment Form Component
const CheckoutForm = ({ bookingData, paymentDetails, onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message || 'Payment failed')
        setLoading(false)
        return
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        await stripeService.confirmPayment(paymentIntent.id)
        toast.success('Payment successful! Redirecting...')

        // Redirect to success page with payment details
        setTimeout(() => {
          onSuccess(paymentIntent)
        }, 1000)
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error.response?.data?.message || 'Payment processing failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {/* Payment Element */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <PaymentElement />
      </div>

      {/* Action Buttons */}
      <div className='flex gap-3'>
        <button
          type='button'
          onClick={onCancel}
          disabled={loading}
          className='flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
        >
          Cancel
        </button>
        <button
          type='submit'
          disabled={!stripe || loading}
          className='flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2'
        >
          {loading ? (
            <>
              <Loader2 className='w-5 h-5 animate-spin' />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className='w-5 h-5' />
              Pay ${paymentDetails?.amount || '0.00'}
            </>
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className='flex items-center justify-center gap-2 text-sm text-gray-500'>
        <CheckCircle className='w-4 h-4 text-green-500' />
        <span>Secured by Stripe • Your payment info is encrypted</span>
      </div>
    </form>
  )
}

// Main Checkout Page Component
const CheckoutPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [clientSecret, setClientSecret] = useState(null)
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get booking data from navigation state or search params
  const bookingData = location.state?.bookingData || {
    serviceId: searchParams.get('serviceId'),
    serviceName: searchParams.get('serviceName'),
    price: parseFloat(searchParams.get('price')) || 0,
    duration: parseInt(searchParams.get('duration')) || 0,
    date: searchParams.get('date'),
    time: searchParams.get('time'),
  }

  useEffect(() => {
    if (!bookingData.serviceId) {
      toast.error('Invalid booking data')
      navigate('/bookings')
      return
    }

    createPaymentIntent()
  }, [])

  const createPaymentIntent = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await stripeService.createPaymentIntent(
        bookingData.serviceId,
        null // bookingId can be null for now, will be created after payment
      )

      setClientSecret(data.clientSecret)
      setPaymentDetails(data)
    } catch (error) {
      console.error('Error creating payment intent:', error)
      const errorMessage =
        error.response?.data?.message || 'Failed to initialize payment'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = (paymentIntent) => {
    navigate('/checkout/success', {
      state: {
        paymentIntent,
        bookingData,
        paymentDetails,
      },
    })
  }

  const handleCancel = () => {
    navigate(-1)
  }

  // Loading State
  if (loading) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center px-4'>
          <div className='bg-white rounded-2xl border border-pink-100 p-8 text-center max-w-sm w-full'>
            <Loader2 className='w-12 h-12 animate-spin text-pink-500 mx-auto mb-4' />
            <h3 className='text-lg font-bold text-gray-900 mb-2'>
              Preparing Your Payment
            </h3>
            <p className='text-gray-600'>
              Please wait while we set up your secure checkout...
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  // Error State
  if (error) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center px-4'>
          <div className='bg-white rounded-2xl border border-red-200 p-8 text-center max-w-sm w-full'>
            <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <AlertCircle className='w-8 h-8 text-red-500' />
            </div>
            <h3 className='text-lg font-bold text-gray-900 mb-2'>
              Payment Error
            </h3>
            <p className='text-gray-600 mb-6'>{error}</p>
            <div className='flex gap-3'>
              <button
                onClick={createPaymentIntent}
                className='flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all'
              >
                Try Again
              </button>
              <button
                onClick={handleCancel}
                className='flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 transition-all'
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#ec4899',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
  }

  const options = {
    clientSecret,
    appearance,
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 py-8 px-4'>
        <div className='max-w-4xl mx-auto'>
          {/* Back Button */}
          <button
            onClick={handleCancel}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-6'
          >
            <ArrowLeft className='w-5 h-5' />
            <span>Back</span>
          </button>

          {/* Page Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl md:text-4xl font-bold text-gray-900 mb-2'>
              Complete Your Booking
            </h1>
            <p className='text-gray-600'>
              Secure payment powered by Stripe
            </p>
          </div>

          <div className='grid lg:grid-cols-3 gap-6'>
            {/* Booking Summary - Left Column (2/3) */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Booking Details Card */}
              <div className='bg-white rounded-2xl border border-pink-100 overflow-hidden'>
                <div className='bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6'>
                  <div className='flex items-center gap-3 mb-2'>
                    <div className='w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center'>
                      <Calendar className='w-6 h-6' />
                    </div>
                    <div>
                      <h2 className='text-xl font-bold'>Booking Details</h2>
                      <p className='text-pink-100 text-sm'>
                        Review your appointment
                      </p>
                    </div>
                  </div>
                </div>

                <div className='p-6 space-y-4'>
                  <div className='flex justify-between items-center py-3 border-b border-gray-100'>
                    <span className='text-gray-600'>Service</span>
                    <span className='font-semibold text-gray-900'>
                      {bookingData.serviceName}
                    </span>
                  </div>

                  <div className='flex justify-between items-center py-3 border-b border-gray-100'>
                    <span className='text-gray-600 flex items-center gap-2'>
                      <Calendar className='w-4 h-4' />
                      Date
                    </span>
                    <span className='font-semibold text-gray-900'>
                      {bookingData.date}
                    </span>
                  </div>

                  <div className='flex justify-between items-center py-3 border-b border-gray-100'>
                    <span className='text-gray-600 flex items-center gap-2'>
                      <Clock className='w-4 h-4' />
                      Time
                    </span>
                    <span className='font-semibold text-gray-900'>
                      {bookingData.time}
                    </span>
                  </div>

                  <div className='flex justify-between items-center py-3 border-b border-gray-100'>
                    <span className='text-gray-600 flex items-center gap-2'>
                      <Clock className='w-4 h-4' />
                      Duration
                    </span>
                    <span className='font-semibold text-gray-900'>
                      {bookingData.duration} minutes
                    </span>
                  </div>

                  {bookingData.treatment && (
                    <div className='flex justify-between items-center py-3 border-b border-gray-100'>
                      <span className='text-gray-600'>Treatment</span>
                      <span className='font-semibold text-gray-900'>
                        {bookingData.treatment}
                      </span>
                    </div>
                  )}

                  {bookingData.addOns && bookingData.addOns.length > 0 && (
                    <div className='py-3 border-b border-gray-100'>
                      <span className='text-gray-600 block mb-2'>Add-ons</span>
                      <div className='space-y-1'>
                        {bookingData.addOns.map((addon, index) => (
                          <div
                            key={index}
                            className='flex justify-between text-sm'
                          >
                            <span className='text-gray-700'>{addon.name}</span>
                            <span className='text-gray-900 font-medium'>
                              +${addon.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Form */}
              <div className='bg-white rounded-2xl border border-pink-100 p-6'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center'>
                    <CreditCard className='w-6 h-6 text-pink-600' />
                  </div>
                  <div>
                    <h2 className='text-xl font-bold text-gray-900'>
                      Payment Information
                    </h2>
                    <p className='text-gray-600 text-sm'>
                      Enter your card details
                    </p>
                  </div>
                </div>

                {clientSecret && (
                  <Elements stripe={stripePromise} options={options}>
                    <CheckoutForm
                      bookingData={bookingData}
                      paymentDetails={paymentDetails}
                      onSuccess={handleSuccess}
                      onCancel={handleCancel}
                    />
                  </Elements>
                )}
              </div>
            </div>

            {/* Payment Summary - Right Column (1/3) */}
            <div className='lg:col-span-1'>
              <div className='bg-white rounded-2xl border border-pink-100 p-6 sticky top-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-4'>
                  Payment Summary
                </h3>

                <div className='space-y-3 mb-6'>
                  <div className='flex justify-between text-gray-600'>
                    <span>Service Price</span>
                    <span>${paymentDetails?.amount || '0.00'}</span>
                  </div>

                  {paymentDetails?.discount?.amount > 0 && (
                    <div className='flex justify-between text-green-600'>
                      <span>Discount</span>
                      <span>-${(paymentDetails.discount.amount / 100).toFixed(2)}</span>
                    </div>
                  )}

                  <div className='border-t border-gray-200 pt-3'>
                    <div className='flex justify-between items-center'>
                      <span className='text-lg font-bold text-gray-900 flex items-center gap-2'>
                        <DollarSign className='w-5 h-5' />
                        Total
                      </span>
                      <span className='text-2xl font-bold text-pink-600'>
                        ${paymentDetails?.amount || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {paymentDetails?.pointsEarned > 0 && (
                  <div className='bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center'>
                        <Award className='w-5 h-5 text-yellow-600' />
                      </div>
                      <div>
                        <p className='font-semibold text-yellow-900'>
                          Earn {paymentDetails.pointsEarned} Points
                        </p>
                        <p className='text-xs text-yellow-700'>
                          1 point per $1 spent
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className='mt-6 pt-6 border-t border-gray-200'>
                  <p className='text-xs text-gray-500 text-center'>
                    By completing this purchase, you agree to our terms of
                    service and cancellation policy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CheckoutPage
