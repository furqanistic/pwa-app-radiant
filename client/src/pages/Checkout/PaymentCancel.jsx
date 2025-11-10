// File: client/src/pages/Checkout/PaymentCancel.jsx
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout/Layout'
import { XCircle, ArrowLeft, RefreshCw, Home } from 'lucide-react'

const PaymentCancel = () => {
  const navigate = useNavigate()

  const handleTryAgain = () => {
    navigate(-1) // Go back to checkout
  }

  const handleGoHome = () => {
    navigate('/dashboard')
  }

  const handleBrowseServices = () => {
    navigate('/bookings')
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-12'>
        <div className='max-w-md w-full'>
          {/* Cancelled Icon */}
          <div className='text-center mb-8'>
            <div className='inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full mb-6'>
              <XCircle className='w-12 h-12 text-white' />
            </div>
            <h1 className='text-3xl md:text-4xl font-bold text-gray-900 mb-3'>
              Payment Cancelled
            </h1>
            <p className='text-lg text-gray-600'>
              Your payment was not processed
            </p>
          </div>

          {/* Info Card */}
          <div className='bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6'>
            <div className='p-6 md:p-8'>
              <h2 className='text-lg font-bold text-gray-900 mb-4'>
                What happened?
              </h2>
              <p className='text-gray-600 mb-6'>
                You cancelled the payment process. No charges have been made to
                your account, and your booking was not confirmed.
              </p>

              <div className='bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6'>
                <p className='text-sm text-blue-800'>
                  <strong>💡 Tip:</strong> If you experienced any issues during
                  checkout, please try again or contact our support team for
                  assistance.
                </p>
              </div>

              {/* Action Buttons */}
              <div className='space-y-3'>
                <button
                  onClick={handleTryAgain}
                  className='w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 transition-all'
                >
                  <RefreshCw className='w-5 h-5' />
                  Try Again
                </button>

                <button
                  onClick={handleBrowseServices}
                  className='w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all'
                >
                  <ArrowLeft className='w-5 h-5' />
                  Browse Services
                </button>

                <button
                  onClick={handleGoHome}
                  className='w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all'
                >
                  <Home className='w-5 h-5' />
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className='bg-white rounded-2xl border border-gray-200 p-6'>
            <h3 className='text-lg font-bold text-gray-900 mb-3'>
              Need Help?
            </h3>
            <p className='text-gray-600 text-sm mb-4'>
              If you're having trouble completing your booking, our support team
              is here to help.
            </p>
            <button className='text-pink-600 hover:text-pink-700 font-semibold text-sm'>
              Contact Support →
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default PaymentCancel
