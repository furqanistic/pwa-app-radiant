import Layout from '@/pages/Layout/Layout'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, CheckCircle, Home } from 'lucide-react'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { clearCart } from '../../redux/cartSlice'

const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    // Clear cart on successful booking
    dispatch(clearCart())
    
    if (sessionId) {
      toast.success('Your payment was successful!')
    }
  }, [dispatch, sessionId])

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-pink-100 overflow-hidden border border-pink-50"
        >
          {/* Top Decorative Banner */}
          <div className="h-32 bg-gradient-to-r from-pink-500 to-rose-600 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20 overflow-hidden">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-rose-200 rounded-full blur-3xl"></div>
            </div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white p-4 rounded-full shadow-lg z-10"
            >
              <CheckCircle className="w-12 h-12 text-green-500" />
            </motion.div>
          </div>

          <div className="p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-8">
              Thank you for choosing RadiantAI. Your appointment has been scheduled and a confirmation email is on its way.
            </p>

            {sessionId && (
              <div className="bg-pink-50 rounded-2xl p-4 mb-8 border border-pink-100">
                <p className="text-xs text-pink-700 font-semibold uppercase tracking-wider mb-1">Transaction ID</p>
                <code className="text-sm font-mono text-gray-700 break-all">{sessionId}</code>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate('/Booking')}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                View My Bookings
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Back to Dashboard
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100">
               <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <span>Need help?</span>
                  <button className="text-pink-600 font-semibold hover:underline">Contact Support</button>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}

export default BookingSuccessPage
