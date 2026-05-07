import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { CreditCard, Loader2, XIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import stripeService from '@/services/stripeService'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const hasStripePublishableKey = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const SetupCardForm = ({ onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements) return

    try {
      setSubmitting(true)
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message || 'Failed to save card')
        return
      }

      if (setupIntent?.status === 'succeeded') {
        toast.success('Card saved successfully')
        onSuccess?.()
      }
    } catch (error) {
      console.error('Membership card setup error:', error)
      toast.error('Unable to save your card right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 shadow-sm sm:rounded-[1.2rem] sm:px-4 sm:py-4">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Payment Method
          </label>
          <div className="rounded-[0.8rem] border border-slate-200 bg-slate-50 px-3 py-3 sm:rounded-[1rem] sm:px-4 sm:py-4">
            <PaymentElement
              options={{
                wallets: {
                  applePay: 'auto',
                  googlePay: 'never',
                },
              }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">
            Secure Stripe checkout. Apple Wallet appears automatically on supported devices.
          </p>
        </div>
      </div>
      <div className="mt-3 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:mt-4 sm:flex-row sm:justify-end sm:pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting} className="h-10">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || submitting} className="h-10 bg-[color:var(--brand-primary)] text-white hover:bg-[color:var(--brand-primary-dark)]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save card
        </Button>
      </div>
    </form>
  )
}

const MembershipAddCardDialog = ({ open, onOpenChange, locationId, onSuccess }) => {
  const [clientSecret, setClientSecret] = useState('')
  const [stripeAccountId, setStripeAccountId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !locationId) return

    let mounted = true

    const createSetupIntent = async () => {
      try {
        setLoading(true)
        if (!hasStripePublishableKey) {
          toast.error(
            'Missing VITE_STRIPE_PUBLISHABLE_KEY in client environment settings.'
          )
          onOpenChange(false)
          return
        }
        const response = await stripeService.createMembershipSetupIntent(locationId)
        if (mounted) {
          setClientSecret(response.clientSecret || '')
          setStripeAccountId(response.stripeAccountId || '')
        }
      } catch (error) {
        console.error('Failed to create membership setup intent:', error)
        toast.error(
          error?.response?.data?.message || 'Unable to open card setup right now.'
        )
        onOpenChange(false)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    createSetupIntent()

    return () => {
      mounted = false
    }
  }, [locationId, onOpenChange, open])

  const handleClose = (nextOpen) => {
    if (!nextOpen) {
      setClientSecret('')
      setStripeAccountId('')
    }
    onOpenChange(nextOpen)
  }

  const stripePromise =
    hasStripePublishableKey && stripeAccountId
      ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
          stripeAccount: stripeAccountId,
        })
      : hasStripePublishableKey
        ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
        : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="p-0 overflow-hidden flex flex-col max-h-[84vh] sm:max-h-[88vh] w-full max-w-none sm:max-w-xl rounded-t-[1.6rem] sm:rounded-[1.8rem] fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 border-0 shadow-2xl bg-white"
      >
        <div className="flex max-h-[inherit] min-h-0 flex-col">
          <div className="shrink-0 flex items-center justify-between px-4 pt-2.5 pb-1.5 sm:hidden">
            <div className="mx-auto h-1 w-12 rounded-full bg-slate-200" />
            <DialogClose asChild>
              <button
                type="button"
                className="absolute right-4 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>

          <div className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  Add Payment Method
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  Save a payment method for calendar-monthly membership renewals.
                </DialogDescription>
              </DialogHeader>

              <DialogClose asChild>
                <button
                  type="button"
                  className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6 sm:py-4">
            <div className="mb-3 shrink-0 flex items-start gap-2.5 rounded-[0.95rem] border border-[color:var(--brand-primary)]/14 bg-[color:var(--brand-primary)]/6 p-2.5 text-[12px] text-slate-600 sm:mb-4 sm:rounded-[1.1rem] sm:p-3 sm:text-sm">
              <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--brand-primary)] sm:h-4 sm:w-4" />
              <p>Your first card is set as default automatically.</p>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center py-6 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing secure card setup...
              </div>
            ) : clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#ec4899',
                      colorText: '#0f172a',
                      colorDanger: '#dc2626',
                      fontFamily:
                        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      borderRadius: '12px',
                    },
                  },
                }}
              >
                <SetupCardForm
                  onCancel={() => handleClose(false)}
                  onSuccess={() => {
                    handleClose(false)
                    onSuccess?.()
                  }}
                />
              </Elements>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MembershipAddCardDialog
