import BNPLBanner from '@/components/Common/BNPLBanner'
import MembershipAddCardDialog from '@/components/Membership/MembershipAddCardDialog'
import EmbeddedStripeCheckoutDialog from '@/components/Stripe/EmbeddedStripeCheckoutDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useBranding } from '@/context/BrandingContext'
import {
  calculateCartRewardDiscount,
  getRewardDisplayValue,
  selectBestCartReward,
} from '@/utils/rewardFlow'
import axiosInstance from '../../config'
import { clearCart, removeFromCart } from '../../redux/cartSlice'
import stripeService from '../../services/stripeService'

const CartPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, totalAmount, totalItems } = useSelector((state) => state.cart)
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '')
    if (cleaned.length !== 6) return '#b0164e'
    const num = parseInt(cleaned, 16)
    const r = Math.max(0, ((num >> 16) & 255) - 24)
    const g = Math.max(0, ((num >> 8) & 255) - 24)
    const b = Math.max(0, (num & 255) - 24)
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  const toastStyle = {
    style: {
      background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
      color: '#fff',
      border: 'none',
    },
  }

  const toastSuccess = (message, options = {}) =>
    toast.success(message, { ...toastStyle, ...options })
  const toastError = (message, options = {}) =>
    toast.error(message, { ...toastStyle, ...options })
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutClientSecret, setCheckoutClientSecret] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [cardRecommendationOpen, setCardRecommendationOpen] = useState(false)
  const [addCardDialogOpen, setAddCardDialogOpen] = useState(false)
  const [availableRewards, setAvailableRewards] = useState([])
  const [selectedReward, setSelectedReward] = useState(null)
  const [hasManualRewardOverride, setHasManualRewardOverride] = useState(false)
  const [autoSelectedRewardId, setAutoSelectedRewardId] = useState(null)

  // Fetch user rewards on mount
  useEffect(() => {
    const fetchRewards = async () => {
      if (!currentUser) return
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
      }
    }

    fetchRewards()
  }, [currentUser])

  useEffect(() => {
    if (selectedReward || availableRewards.length === 0 || items.length === 0) return

    const rewardIdFromCart = items
      .map((item) => item.rewardUsed || item.userRewardId || null)
      .find(Boolean)

    if (!rewardIdFromCart) return

    const matchedReward = availableRewards.find(
      (reward) => String(reward._id) === String(rewardIdFromCart)
    )

    if (matchedReward) {
      setSelectedReward(matchedReward)
      setAutoSelectedRewardId(String(matchedReward._id))
    }
  }, [availableRewards, items, selectedReward])

  const cartSignature = JSON.stringify(
    items.map((item) => ({
      id: item.id,
      serviceId: item.serviceId,
      date: item.date,
      time: item.time,
      totalPrice: Number(item.totalPrice) || 0,
    }))
  )
  const totalAmountSafe = Number(totalAmount) || 0

  useEffect(() => {
    setHasManualRewardOverride(false)
  }, [cartSignature])

  useEffect(() => {
    if (availableRewards.length === 0 || items.length === 0) return
    if (hasManualRewardOverride) return

    const bestReward = selectBestCartReward({
      rewards: availableRewards,
      items,
      totalAmount: totalAmountSafe,
    })
    if (!bestReward) return

    if (String(selectedReward?._id || '') === String(bestReward._id)) {
      return
    }

    setSelectedReward(bestReward)
    setAutoSelectedRewardId(String(bestReward._id))
  }, [
    availableRewards,
    hasManualRewardOverride,
    items,
    selectedReward?._id,
    totalAmountSafe,
  ])

  // Calculate discount based on selected reward
  const calculateRewardDiscount = () => {
    if (!selectedReward) return 0
    return calculateCartRewardDiscount({
      rewardSnapshot: selectedReward.rewardSnapshot,
      items,
      totalAmount: totalAmountSafe,
    })
  }

  const rewardDiscount = calculateRewardDiscount()
  const totalWithDiscount = Math.max(0, totalAmountSafe - rewardDiscount)
  const finalTotal = totalWithDiscount

  const handleRemoveItem = (itemId) => {
    dispatch(removeFromCart(itemId))
    toastSuccess('Item removed from cart')
  }

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      dispatch(clearCart())
      toastSuccess('Cart cleared')
    }
  }

  const shouldRecommendAddingCard = async (locationId) => {
    try {
      const billing = await stripeService.getMembershipBillingSummary(locationId)
      return !billing?.summary?.hasPaymentMethod
    } catch (error) {
      console.error('Unable to fetch card status before checkout:', error)
      return false
    }
  }

  const handleCheckout = async ({ skipCardRecommendation = false } = {}) => {
    if (!currentUser?.selectedLocation?.locationId) {
      toastError('Please select a spa location first')
      return
    }

    if (items.length === 0) {
      toastError('Your cart is empty')
      return
    }

    if (!skipCardRecommendation) {
      const noSavedCard = await shouldRecommendAddingCard(
        currentUser.selectedLocation.locationId
      )
      if (noSavedCard) {
        setCardRecommendationOpen(true)
        return
      }
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
        checkoutUiMode: 'embedded',
      })

      if (response.success && response.clientSecret) {
        setCheckoutClientSecret(response.clientSecret)
        setCheckoutError('')
        setCheckoutOpen(true)
      } else if (response.success && response.sessionUrl) {
        window.location.href = response.sessionUrl
      } else {
        const message = response?.message || 'Failed to create payment session'
        setCheckoutError(message)
        toastError(message)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      const message =
        error.response?.data?.message ||
          'Failed to process checkout. Please try again.'
      toastError(message)
      setCheckoutError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (items.length === 0) {
    return (
      <Layout>
      <div
        className='px-4 py-6 max-w-4xl mx-auto'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
          <div className='flex items-center justify-between mb-6'>
           
          </div>

          <div className='bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200/70'>
            <ShoppingBag className='w-20 h-20 mx-auto mb-4 text-gray-300' />
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Your cart is empty
            </h2>
            <p className='text-gray-600 mb-6'>
              Add services to your cart to book multiple appointments at once
            </p>
            <button
              onClick={() => navigate('/services')}
              className='bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white px-6 h-10 rounded-lg font-semibold hover:brightness-95 inline-flex items-center gap-2'
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
      <div
        className='px-4 py-6 max-w-6xl mx-auto'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
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
            <div className='bg-white rounded-lg shadow-sm p-6 border border-gray-200/70'>
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
                    className='border border-gray-200/70 rounded-lg p-4 hover:border-gray-200/70 transition-colors'
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

          <div className='lg:col-span-1'>
            <BNPLBanner className="mb-4" />
              <div className='bg-white rounded-lg shadow-sm p-6 sticky top-6 border border-gray-200/70'>
              <h3 className='text-xl font-bold text-gray-900 mb-6'>
                Order Summary
              </h3>

              <div className='space-y-4 mb-6'>
                <div className='flex justify-between text-gray-600'>
                  <span>Subtotal ({totalItems} items)</span>
                  <span>${totalAmountSafe.toFixed(2)}</span>
                </div>

                {/* Rewards Section */}
                <div className='border-t border-gray-50 pt-3'>
                  <div className='flex items-center gap-2 mb-3'>
                    <Gift className='w-4 h-4 text-[color:var(--brand-primary)]' />
                    <span className='text-sm font-bold text-gray-900 uppercase tracking-wider'>
                      Apply Rewards
                    </span>
                  </div>

                  {availableRewards.length > 0 ? (
                    <div className='space-y-2'>
                      <div className='rounded-lg border border-[color:var(--brand-primary)/0.15] bg-[color:var(--brand-primary)/0.06] px-3 py-2 text-xs text-gray-700'>
                        <div className='font-semibold text-[color:var(--brand-primary)]'>
                          You currently have {availableRewards.length} usable reward{availableRewards.length > 1 ? 's' : ''}
                        </div>
                        {selectedReward ? (
                          <div className='mt-0.5'>
                            Selected: {selectedReward.rewardSnapshot?.name} ({getRewardDisplayValue(selectedReward.rewardSnapshot)})
                            {autoSelectedRewardId &&
                            String(selectedReward._id) === autoSelectedRewardId ? (
                              <span className='ml-1 font-semibold text-[color:var(--brand-primary)]'>
                                - We auto-picked your best available savings.
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className='mt-0.5'>Choose a reward below to apply it before checkout.</div>
                        )}
                      </div>
                      <div className='relative'>
                        <select
                          className='w-full pl-3 pr-10 py-2 text-sm border border-gray-200/70 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] transition-all font-medium text-gray-700'
                          value={selectedReward?._id || ''}
                          onChange={(e) => {
                            setHasManualRewardOverride(true)
                            setAutoSelectedRewardId(null)
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
                        <div className='flex justify-between text-[color:var(--brand-primary)] text-sm font-semibold'>
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
                  <div className="flex justify-end mt-1">
                    <p className="text-xs font-semibold text-[color:var(--brand-primary)] flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      You'll earn {Math.floor(finalTotal)} points
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className='w-full bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white h-10 rounded-lg font-semibold hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-4'
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
              <button
                onClick={() => setAddCardDialogOpen(true)}
                className='w-full h-10 rounded-lg border border-gray-200/70 bg-white text-gray-800 font-semibold hover:bg-gray-50 transition-colors'
              >
                Add Card (Recommended)
              </button>
            </div>
          </div>
        </div>
      </div>
      <EmbeddedStripeCheckoutDialog
        open={checkoutOpen}
        onOpenChange={(nextOpen) => {
          setCheckoutOpen(nextOpen)
          if (!nextOpen) {
            setCheckoutClientSecret('')
            setCheckoutError('')
          }
        }}
        clientSecret={checkoutClientSecret}
        loading={isProcessing}
        errorMessage={checkoutError}
        onRetry={handleCheckout}
        title='Cart Checkout'
        description='Complete your payment.'
      />
      <Dialog
        open={cardRecommendationOpen}
        onOpenChange={setCardRecommendationOpen}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Add Card for Faster Checkout</DialogTitle>
            <DialogDescription>
              Adding a card is recommended for faster future purchases. You can
              still continue to checkout right now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={async () => {
                setCardRecommendationOpen(false)
                await handleCheckout({ skipCardRecommendation: true })
              }}
            >
              Continue to Checkout
            </Button>
            <Button
              onClick={() => {
                setCardRecommendationOpen(false)
                setAddCardDialogOpen(true)
              }}
            >
              Add Card (Recommended)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MembershipAddCardDialog
        open={addCardDialogOpen}
        onOpenChange={setAddCardDialogOpen}
        locationId={currentUser?.selectedLocation?.locationId || null}
        onSuccess={async () => {
          setAddCardDialogOpen(false)
          await handleCheckout({ skipCardRecommendation: true })
        }}
      />
    </Layout>
  )
}

export default CartPage
