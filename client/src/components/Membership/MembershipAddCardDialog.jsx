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
        <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Payment Method
          </label>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <PaymentElement
              options={{
                wallets: {
                  applePay: 'auto',
                  googlePay: 'never',
                },
              }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Apple Wallet is available on supported devices when account and domain settings are enabled.
          </p>
        </div>
      </div>
      <div className="mt-4 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || submitting}>
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
        className="p-0 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] w-full max-w-none sm:max-w-xl rounded-t-[2.5rem] sm:rounded-[2rem] fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 border-0 shadow-2xl bg-white"
      >
        <div className="flex max-h-[inherit] min-h-0 flex-col">
          <div className="shrink-0 flex items-center justify-between px-5 pt-3 pb-2 sm:hidden">
            <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-200" />
            <DialogClose asChild>
              <button
                type="button"
                className="absolute right-5 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>

          <div className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
                  Add Payment Method
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Save a payment method for monthly membership renewals.
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

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4 sm:px-6 sm:py-5">
            <div className="mb-4 shrink-0 flex items-start gap-3 rounded-[1.25rem] bg-slate-50 p-4 text-sm text-slate-600">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-primary)]" />
              <p>The first card you add becomes your default automatically.</p>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center py-10 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
