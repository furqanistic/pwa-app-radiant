// File: client/src/components/Stripe/PaymentCheckout.jsx - Payment Checkout Component
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import stripeService from '../../services/stripeService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, CreditCard, DollarSign, Award } from 'lucide-react';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutForm = ({ service, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        await stripeService.confirmPayment(paymentIntent.id);
        toast.success('Payment successful! Points have been added to your account.');
        onSuccess && onSuccess(paymentIntent);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          disabled={loading}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Pay ${service?.price || '0.00'}
        </Button>
      </div>
    </form>
  );
};

const PaymentCheckout = ({ service, bookingId = null, onSuccess, onCancel }) => {
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (service) {
      createPaymentIntent();
    }
  }, [service]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await stripeService.createPaymentIntent(service._id, bookingId);

      setClientSecret(data.clientSecret);
      setPaymentDetails(data);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      const errorMessage = error.response?.data?.message || 'Failed to initialize payment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Preparing payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Payment Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={createPaymentIntent} variant="outline" className="flex-1">
              Try Again
            </Button>
            <Button onClick={onCancel} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
      borderRadius: '8px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Complete Payment</CardTitle>
            <CardDescription>{service?.name || 'Service Payment'}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Service</span>
            <span className="font-medium">{service?.name}</span>
          </div>

          {paymentDetails && (
            <>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Amount
                </span>
                <span className="text-lg font-bold text-primary">
                  ${paymentDetails.amount}
                </span>
              </div>

              {paymentDetails.pointsEarned > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t text-sm">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-muted-foreground">
                    Earn <span className="font-semibold text-foreground">{paymentDetails.pointsEarned}</span> points with this purchase
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Stripe Payment Form */}
        {clientSecret && (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm
              service={{ ...service, price: paymentDetails?.amount }}
              onSuccess={onSuccess}
              onCancel={onCancel}
            />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentCheckout;
