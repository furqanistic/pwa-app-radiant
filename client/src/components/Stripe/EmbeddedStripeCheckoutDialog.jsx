import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null

const EmbeddedStripeCheckoutDialog = ({
  open,
  onOpenChange,
  clientSecret = '',
  loading = false,
  title = 'Secure Checkout',
  description = 'Complete your payment without leaving the app.',
  errorMessage = '',
  onRetry,
}) => {
  const hasPublishableKey = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 overflow-hidden flex flex-col h-[100dvh] w-screen max-w-none rounded-none fixed inset-0 translate-x-0 translate-y-0 border-0 shadow-none bg-white sm:h-[96vh] sm:w-[98vw] sm:rounded-[1.2rem] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 sm:px-5 sm:py-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold text-gray-900 sm:text-lg">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 sm:text-sm">
              {description}
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-8 px-3">
              Close
            </Button>
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {!hasPublishableKey ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Missing `VITE_STRIPE_PUBLISHABLE_KEY` in client environment settings.
            </div>
          ) : loading ? (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing secure checkout...
            </div>
          ) : errorMessage ? (
            <div className="m-4 flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-red-100 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-700">{errorMessage}</p>
              {onRetry ? (
                <Button type="button" onClick={onRetry}>
                  Try Again
                </Button>
              ) : null}
            </div>
          ) : clientSecret ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-gray-500">
              Checkout session is not ready yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EmbeddedStripeCheckoutDialog
