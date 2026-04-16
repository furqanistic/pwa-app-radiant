import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBranding } from '@/context/BrandingContext'
import { updateProfile } from '@/redux/userSlice'
import { authService } from '@/services/authService'
import stripeService from '@/services/stripeService'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCent, CreditCard, Loader2, Plus, Sparkles, XIcon } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'

const formatMoney = (amount, currency = 'usd') => {
  if (!Number.isFinite(Number(amount))) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: `${currency || 'usd'}`.toUpperCase(),
    maximumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
  }).format(Number(amount))
}

const clampChannel = (value) => Math.max(0, Math.min(255, value))

const adjustHex = (hex, amount) => {
  const cleaned = `${hex || ''}`.replace('#', '')
  if (cleaned.length !== 6) return '#b0164e'
  const num = parseInt(cleaned, 16)
  const r = clampChannel(((num >> 16) & 255) + amount)
  const g = clampChannel(((num >> 8) & 255) + amount)
  const b = clampChannel((num & 255) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const CreditsPurchaseDialog = ({
  open,
  onOpenChange,
  locationId: locationIdProp = null,
  onPurchased,
}) => {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { currentUser } = useSelector((state) => state.user)
  const { branding, locationId: brandingLocationId } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)
  const activeLocationId =
    locationIdProp ||
    brandingLocationId ||
    currentUser?.membershipBilling?.locationId ||
    currentUser?.membership?.locationId ||
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    null

  const [creditQuantity, setCreditQuantity] = useState('')
  const [isPurchasing, setIsPurchasing] = useState(false)

  const { data: billingResponse, isFetching: isLoadingSummary, refetch } = useQuery({
    queryKey: ['membership-billing-summary', activeLocationId],
    queryFn: () => stripeService.getMembershipBillingSummary(activeLocationId),
    enabled: open && Boolean(activeLocationId && currentUser?._id),
  })

  const summary = billingResponse?.summary || null
  const creditSystem = summary?.creditSystem || branding?.membership?.creditSystem || {}
  const creditSystemEnabled = Boolean(creditSystem?.isEnabled)
  const pricePerCredit = Number(creditSystem?.pricePerCredit || 0)
  const currency =
    creditSystem?.currency || branding?.membership?.plans?.[0]?.currency || 'usd'
  const availableCredits = Math.max(
    0,
    Number(summary?.creditsBalance ?? currentUser?.credits ?? 0)
  )
  const hasSavedCard = Boolean(
    summary?.hasPaymentMethod ||
      (Array.isArray(summary?.paymentMethods) && summary.paymentMethods.length > 0) ||
      summary?.defaultPaymentMethod?.paymentMethodId ||
      summary?.defaultPaymentMethod?.last4
  )
  const parsedCreditQuantity = Math.max(0, Math.floor(Number(creditQuantity || 0)))
  const purchaseTotal = parsedCreditQuantity * pricePerCredit
  const presetOptions = useMemo(() => [10, 25, 50], [])

  const refreshCurrentUser = async () => {
    const meResponse = await authService.getCurrentUser()
    const latestUser = meResponse?.data?.user
    if (latestUser) {
      dispatch(updateProfile(latestUser))
    }
  }

  const refreshState = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['membership-billing-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      refreshCurrentUser(),
    ])
  }

  const handlePurchase = async (requestedQuantity = parsedCreditQuantity) => {
    if (isPurchasing) return

    if (!activeLocationId) {
      toast.error('Please select a location first.')
      return
    }

    if (!creditSystemEnabled) {
      toast.error('Credits are not enabled for this location.')
      return
    }

    if (!Number.isFinite(pricePerCredit) || pricePerCredit <= 0) {
      toast.error('Credit pricing is not configured yet.')
      return
    }

    const quantity = Math.max(0, Math.floor(Number(requestedQuantity || 0)))
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Choose how many credits you want to buy.')
      return
    }

    if (!hasSavedCard) {
      const checkoutResponse = await stripeService.createCreditsCheckoutSession({
        locationId: activeLocationId,
        quantity,
      })

      if (checkoutResponse?.success && checkoutResponse?.sessionUrl) {
        window.location.href = checkoutResponse.sessionUrl
        return
      }

      toast.error(
        checkoutResponse?.message || 'Unable to start secure checkout right now.'
      )
      return
    }

    try {
      setIsPurchasing(true)
      const response = await stripeService.purchaseCredits({
        locationId: activeLocationId,
        quantity,
      })

      if (response?.success) {
        toast.success(response?.message || `${quantity} credits added successfully.`)
        onOpenChange(false)
        await refreshState()
        onPurchased?.(response)
        return
      }

      toast.error('Unable to purchase credits right now.')
    } catch (error) {
      console.error('Credit purchase error:', error)
      toast.error(
        error?.response?.data?.message || 'Unable to purchase credits right now.'
      )
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen)
          if (!nextOpen && !isPurchasing) {
            setCreditQuantity('')
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="p-0 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[82vh] w-full max-w-none sm:max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 border-0 shadow-2xl bg-white/95 backdrop-blur-xl"
          style={{
            ['--brand-primary']: brandColor,
            ['--brand-primary-dark']: brandColorDark,
          }}
        >
          {/* Main Container */}
          <div className="flex flex-col min-h-0">
            {/* Header Section */}
            <div
              className="relative shrink-0 overflow-hidden px-5 pb-4 pt-4 sm:px-6 sm:py-5 text-white"
              style={{
                backgroundImage: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})`,
              }}
            >
              {/* Decorative Background Elements */}
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              
              <div className="relative z-10">
                <div className="mb-3 flex justify-center sm:hidden">
                  <div className="h-1 w-10 rounded-full bg-white/30" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                      Top-up Balance
                    </h2>
                    <p className="text-[10px] font-medium text-white/70 uppercase tracking-widest">
                      Instant Delivery
                    </p>
                  </div>

                  <DialogClose asChild>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:bg-white/20 active:scale-90"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="relative min-h-0 flex-1 overflow-y-auto bg-gray-50/30 px-5 py-4 sm:px-6 sm:py-5">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                    Balance
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="text-xl font-black text-gray-900 leading-none">
                      {availableCredits}
                    </span>
                    <BadgeCent className="h-3.5 w-3.5 text-[color:var(--brand-primary)]" />
                  </div>
                </div>

                <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                    Price
                  </p>
                  <div className="mt-0.5 text-xl font-black text-gray-900 leading-none">
                    {formatMoney(pricePerCredit, currency)}
                  </div>
                </div>
              </div>

              {!activeLocationId ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-center">
                  <p className="text-sm font-medium text-amber-800">Please select a location first.</p>
                </div>
              ) : !creditSystemEnabled ? (
                <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-center">
                  <p className="text-sm font-medium text-red-800">Credits are not enabled here yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Amount Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                      Choose Credit Amount
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {presetOptions.map((preset) => {
                        const isActive = Number(creditQuantity) === preset
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCreditQuantity(`${preset}`)}
                            className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                              isActive
                                ? 'border-[color:var(--brand-primary)] text-white shadow-md'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                            style={isActive ? { background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` } : undefined}
                          >
                            {preset}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Input & Summary Card */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="relative group">
                        <input
                          type="number"
                          min="1"
                          value={creditQuantity}
                          onChange={(e) => setCreditQuantity(e.target.value)}
                          className="w-full rounded-xl bg-gray-50 border-transparent px-4 py-3 text-lg font-black text-gray-900 placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-[color:var(--brand-primary)]/20 transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="Custom Amount"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-gray-100">
                          Credits
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-gray-900 p-4 text-white">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                            Total Due
                          </p>
                          <p className="text-xl font-black tabular-nums tracking-tight">
                            {formatMoney(purchaseTotal, currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                            Payment Method
                          </p>
                          <p className="text-xs font-bold text-white/80">
                            {hasSavedCard ? 'Primary Card' : 'New Card'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      <Button
                        type="button"
                        disabled={
                          isPurchasing ||
                          isLoadingSummary ||
                          parsedCreditQuantity <= 0 ||
                          pricePerCredit <= 0
                        }
                        className="group relative h-12 w-full overflow-hidden rounded-xl text-sm font-black text-white transition-all active:scale-[0.98]"
                        style={{
                          background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})`,
                        }}
                        onClick={() => handlePurchase()}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-700" />
                        
                        <div className="relative z-10 flex items-center justify-center gap-2">
                          {isPurchasing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : hasSavedCard ? (
                            <>
                              <Plus className="h-4 w-4" />
                              <span>Purchase Now</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" />
                              <span>Secure Checkout</span>
                            </>
                          )}
                        </div>
                      </Button>
                      
                      <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="mt-3 w-full text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 transition-colors hover:text-gray-600"
                      >
                        Cancel Transaction
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}

export default CreditsPurchaseDialog
