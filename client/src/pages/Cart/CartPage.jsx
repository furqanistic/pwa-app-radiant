import Layout from '@/pages/Layout/Layout'
import {
    ArrowLeft,
    Calendar,
    Check,
    ChevronDown,
    Clock,
    CreditCard,
    DollarSign,
    Gift,
    Search,
    ShoppingBag,
    ShoppingCart,
    Trash2,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axiosInstance from '../../config'
import { clearCart, removeFromCart } from '../../redux/cartSlice'
import stripeService from '../../services/stripeService'

const CartPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, totalAmount, totalItems } = useSelector((state) => state.cart)
  const { currentUser } = useSelector((state) => state.user)
  const [isProcessing, setIsProcessing] = useState(false)
  const [availableRewards, setAvailableRewards] = useState([])
  const [selectedReward, setSelectedReward] = useState(null)
  const [isLoadingRewards, setIsLoadingRewards] = useState(false)

  // Fetch user rewards on mount
  useEffect(() => {
    const fetchRewards = async () => {
      if (!currentUser) return
      setIsLoadingRewards(true)
      try {
        const response = await axiosInstance.get('/rewards/my-rewards')
        if (response.data?.status === 'success') {
          // Filter only active rewards
          const activeRewards = response.data.data.userRewards.filter(
            (r) => r.status === 'active'
          )
          setAvailableRewards(activeRewards)
        }
      } catch (error) {
        console.error('Error fetching rewards:', error)
      } finally {
        setIsLoadingRewards(false)
      }
    }

    fetchRewards()
  }, [currentUser])

  // Calculate discount based on selected reward
  const calculateRewardDiscount = () => {
    if (!selectedReward) return 0

    const rewardSnapshot = selectedReward.rewardSnapshot
    const type = rewardSnapshot.type
    const value = rewardSnapshot.value

    if (type === 'credit' || type === 'referral') {
      return Math.min(value, totalAmount)
    }

    if (['discount', 'service_discount', 'combo'].includes(type)) {
      const serviceId = rewardSnapshot.serviceId
      const serviceIds = rewardSnapshot.serviceIds || []

      if (serviceId || serviceIds.length > 0) {
        // Apply only to specific services in cart
        const applicableTotal = items
          .filter(
            (item) =>
              item.serviceId === serviceId?.toString() ||
              serviceIds.some((id) => id.toString() === item.serviceId)
          )
          .reduce((sum, item) => sum + item.totalPrice, 0)

        let discount = (applicableTotal * value) / 100
        if (rewardSnapshot.maxValue && discount > rewardSnapshot.maxValue) {
          discount = rewardSnapshot.maxValue
        }
        return discount
      } else {
        // Apply to all items
        let discount = (totalAmount * value) / 100
        if (rewardSnapshot.maxValue && discount > rewardSnapshot.maxValue) {
          discount = rewardSnapshot.maxValue
        }
        return discount
      }
    }

    if (type === 'service' || type === 'free_service') {
      const serviceId = rewardSnapshot.serviceId
      const serviceIds = rewardSnapshot.serviceIds || []

      const applicableItems = items.filter(
        (item) =>
          item.serviceId === serviceId?.toString() ||
          serviceIds.some((id) => id.toString() === item.serviceId)
      )

      if (applicableItems.length > 0) {
        const freeItem = applicableItems.reduce((prev, curr) =>
          prev.totalPrice > curr.totalPrice ? prev : curr
        )
        return freeItem.totalPrice
      }
    }

    return 0
  }

  const rewardDiscount = calculateRewardDiscount()
  const totalWithDiscount = Math.max(0, totalAmount - rewardDiscount)
  const finalTotal = totalWithDiscount

  const handleRemoveItem = (itemId) => {
    dispatch(removeFromCart(itemId))
    toast.success('Item removed from cart')
  }

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      dispatch(clearCart())
      toast.success('Cart cleared')
    }
  }

  const handleCheckout = async () => {
    if (!currentUser?.selectedLocation?.locationId) {
      toast.error('Please select a spa location first')
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setIsProcessing(true)

    try {
      // Prepare cart items for checkout
      const cartItems = items.map((item) => ({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        date: item.date,
        time: item.time,
        duration: item.duration,
        price: item.totalPrice,
        treatment: item.treatment,
        addOns: item.addOns || [],
        locationId: currentUser.selectedLocation.locationId,
        notes: item.notes || '',
      }))

      // Create Stripe Checkout session with multiple items
      const response = await stripeService.createCheckoutSession({
        items: cartItems,
        locationId: currentUser.selectedLocation.locationId,
        userRewardId: selectedReward?._id,
      })

      if (response.success && response.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = response.sessionUrl
      } else {
        toast.error('Failed to create payment session')
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error(
        error.response?.data?.message ||
          'Failed to process checkout. Please try again.'
      )
      setIsProcessing(false)
    }
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className='px-4 py-6 max-w-4xl mx-auto'>
          <div className='flex items-center justify-between mb-6'>
           
          </div>

          <div className='bg-white rounded-lg shadow-sm p-12 text-center'>
            <ShoppingBag className='w-20 h-20 mx-auto mb-4 text-gray-300' />
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Your cart is empty
            </h2>
            <p className='text-gray-600 mb-6'>
              Add services to your cart to book multiple appointments at once
            </p>
            <button
              onClick={() => navigate('/services')}
              className='bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 h-10 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 inline-flex items-center gap-2'
            >
              <ShoppingCart className='w-5 h-5' />
              Browse Services
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='px-4 py-6 max-w-6xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <button
            onClick={() => navigate('/bookings')}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors h-8 px-3 rounded-lg hover:bg-gray-100'
          >
            <ArrowLeft className='w-5 h-5' />
            <span>Continue Shopping</span>
          </button>
          <button
            onClick={handleClearCart}
            className='flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors h-8 px-3 rounded-lg hover:bg-red-50'
          >
            <Trash2 className='w-4 h-4' />
            <span>Clear Cart</span>
          </button>
        </div>

        <div className='grid lg:grid-cols-3 gap-6'>
          {/* Cart Items */}
          <div className='lg:col-span-2 space-y-4'>
            <div className='bg-white rounded-lg shadow-sm p-6'>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>
                Shopping Cart
              </h1>
              <p className='text-gray-600 mb-6'>
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </p>

              <div className='space-y-4'>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className='border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-colors'
                  >
                    <div className='flex gap-4'>
                      <img
                        src={
                          item.image ||
                          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=100&h=100&fit=crop'
                        }
                        alt={item.serviceName}
                        className='w-20 h-20 rounded-lg object-cover'
                      />

                      <div className='flex-1'>
                        <div className='flex items-start justify-between mb-2'>
                          <div>
                            <h3 className='text-lg font-semibold text-gray-900'>
                              {item.serviceName}
                            </h3>
                            {item.treatment && (
                              <p className='text-sm text-gray-600'>
                                Treatment: {item.treatment.name}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className='text-red-500 hover:text-red-700 p-1'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>

                        <div className='grid grid-cols-2 gap-2 mb-3'>
                          <div className='flex items-center gap-1 text-sm text-gray-600'>
                            <Calendar className='w-4 h-4' />
                            <span>{item.date}</span>
                          </div>
                          <div className='flex items-center gap-1 text-sm text-gray-600'>
                            <Clock className='w-4 h-4' />
                            <span>{item.time}</span>
                          </div>
                          <div className='flex items-center gap-1 text-sm text-gray-600'>
                            <Clock className='w-4 h-4' />
                            <span>{item.duration} min</span>
                          </div>
                          <div className='flex items-center gap-1 text-sm text-gray-600'>
                            <DollarSign className='w-4 h-4' />
                            <span className='font-semibold text-green-600'>
                              ${item.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {item.addOns && item.addOns.length > 0 && (
                          <div className='mt-2 pt-2 border-t border-gray-100'>
                            <p className='text-xs text-gray-500 mb-1'>
                              Add-ons:
                            </p>
                            <div className='flex flex-wrap gap-1'>
                              {item.addOns.map((addon, idx) => (
                                <span
                                  key={idx}
                                  className='text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full'
                                >
                                  {addon.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-lg shadow-sm p-6 sticky top-6'>
              <h3 className='text-xl font-bold text-gray-900 mb-6'>
                Order Summary
              </h3>

              <div className='space-y-4 mb-6'>
                <div className='flex justify-between text-gray-600'>
                  <span>Subtotal ({totalItems} items)</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>

                {/* Rewards Section */}
                <div className='border-t border-gray-50 pt-3'>
                  <div className='flex items-center gap-2 mb-3'>
                    <Gift className='w-4 h-4 text-pink-500' />
                    <span className='text-sm font-bold text-gray-900 uppercase tracking-wider'>
                      Apply Rewards
                    </span>
                  </div>

                  {availableRewards.length > 0 ? (
                    <div className='space-y-2'>
                      <div className='relative'>
                        <select
                          className='w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium text-gray-700'
                          value={selectedReward?._id || ''}
                          onChange={(e) => {
                            const reward = availableRewards.find(
                              (r) => r._id === e.target.value
                            )
                            setSelectedReward(reward || null)
                          }}
                        >
                          <option value=''>Select a reward...</option>
                          {availableRewards.map((reward) => (
                            <option key={reward._id} value={reward._id}>
                              {reward.rewardSnapshot.name} (Value:{' '}
                              {reward.rewardSnapshot.displayValue})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
                      </div>
                      {rewardDiscount > 0 && (
                        <div className='flex justify-between text-pink-600 text-sm font-semibold'>
                          <span>Reward Discount</span>
                          <span>-${rewardDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className='text-xs text-gray-500 italic'>
                      No active rewards available
                    </p>
                  )}
                </div>


                <div className='border-t pt-3'>
                  <div className='flex justify-between text-lg font-bold text-gray-900'>
                    <span>Total</span>
                    <span className='text-green-600'>
                      ${finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className='w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white h-10 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-4'
              >
                {isProcessing ? (
                  <>
                    <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className='w-5 h-5' />
                    Proceed to Checkout
                  </>
                )}
              </button>

              <div className='bg-blue-50 rounded-lg p-4'>
                <p className='text-xs text-blue-800'>
                  <strong>Note:</strong> You'll be redirected to a secure
                  payment page. All bookings will be confirmed after successful
                  payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CartPage
