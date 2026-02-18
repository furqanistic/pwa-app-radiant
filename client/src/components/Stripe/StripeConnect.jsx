// File: client/src/components/Stripe/StripeConnect.jsx - Stripe Connect Integration
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import stripeService from '../../services/stripeService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const StripeConnect = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [checking, setChecking] = useState(true);
  const [handledStripeParams, setHandledStripeParams] = useState(false);
  const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = useState(false);
  const [preparingOnboarding, setPreparingOnboarding] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState('');
  const isFullyActive = !!(accountStatus?.account?.chargesEnabled && accountStatus?.account?.payoutsEnabled);

  const steps = useMemo(
    () => [
      {
        title: 'Connect Stripe account',
        description: 'Create an express account so we can send payouts.',
        done: accountStatus?.connected ?? false,
      },
      {
        title: 'Complete onboarding',
        description: 'Share business details and bank info with Stripe.',
        done: accountStatus?.account?.onboardingCompleted ?? false,
      },
      {
        title: 'Enable payments',
        description: 'Once charges and payouts are enabled you can accept clients.',
        done: accountStatus?.account?.chargesEnabled && accountStatus?.account?.payoutsEnabled,
      },
    ],
    [accountStatus]
  );

  useEffect(() => {
    fetchAccountStatus();
  }, []);

  useEffect(() => {
    if (handledStripeParams) return;

    const stripeParam = searchParams.get('stripe');
    if (!stripeParam) return;

    setHandledStripeParams(true);

    const handleStripeReturn = async () => {
      const refreshedStatus = await fetchAccountStatus();

      if (stripeParam === 'success') {
        const isReady =
          refreshedStatus?.account?.chargesEnabled ||
          refreshedStatus?.chargesEnabled;
        if (isReady) {
          toast.success('Stripe connected and ready to accept payments.');
        } else {
          toast.message('Stripe connected. Complete onboarding to enable payments.');
        }
      } else if (stripeParam === 'refresh') {
        toast.message('Stripe onboarding was refreshed. Please complete the setup.');
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('stripe');
      setSearchParams(nextParams, { replace: true });
    };

    handleStripeReturn();
  }, [handledStripeParams, searchParams, setSearchParams]);

  const fetchAccountStatus = async () => {
    try {
      setChecking(true);
      const data = await stripeService.getAccountStatus();
      setAccountStatus(data);
      return data;
    } catch (error) {
      console.error('Error fetching account status:', error);
      toast.error('Failed to load Stripe account status');
      return null;
    } finally {
      setChecking(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setLoading(true);
      await stripeService.createConnectAccount();
      toast.success('Stripe account created successfully!');

      setIsOnboardingDialogOpen(true);
      await prepareOnboardingLink();
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(error.response?.data?.message || 'Failed to create Stripe account');
    } finally {
      setLoading(false);
    }
  };

  const prepareOnboardingLink = async () => {
    try {
      setPreparingOnboarding(true);
      const returnUrl = `${window.location.origin}/management?stripe=success`;
      const refreshUrl = `${window.location.origin}/management?stripe=refresh`;
      const data = await stripeService.createAccountLink(returnUrl, refreshUrl);
      setOnboardingUrl(data.url);
      return data.url;
    } catch (error) {
      console.error('Error preparing onboarding:', error);
      toast.error(error.response?.data?.message || 'Failed to start onboarding');
      return '';
    } finally {
      setPreparingOnboarding(false);
    }
  };

  const handleStartOnboarding = async (target = 'same-tab') => {
    try {
      setLoading(true);
      const url = onboardingUrl || (await prepareOnboardingLink());
      if (!url) return;

      if (target === 'new-tab') {
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          toast.error('Popup blocked. Opening Stripe in this tab instead.');
          window.location.assign(url);
          return;
        }
        toast.success('Stripe onboarding opened in a new tab.');
        setIsOnboardingDialogOpen(false);
        return;
      }

      window.location.assign(url);
    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast.error(error.response?.data?.message || 'Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Stripe account? You will not be able to receive payments.')) {
      return;
    }

    try {
      setLoading(true);
      await stripeService.disconnectAccount();
      toast.success('Stripe account disconnected');
      await fetchAccountStatus();
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast.error(error.response?.data?.message || 'Failed to disconnect account');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      setLoading(true);
      const data = await stripeService.getAccountDashboard();
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening dashboard:', error);
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 409) {
        toast.message(message || 'Finish Stripe onboarding before opening dashboard.');
        setIsOnboardingDialogOpen(true);
        if (!onboardingUrl) {
          await prepareOnboardingLink();
        }
      } else {
        toast.error(message || 'Failed to open dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== 'spa') {
    return null;
  }

  if (checking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const renderStatusBadge = () => {
    if (!accountStatus?.connected) return null;

    const { account } = accountStatus;

    if (account.chargesEnabled && account.payoutsEnabled) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
      );
    }

    if (account.detailsSubmitted) {
      return (
        <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">
          <AlertCircle className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Incomplete
      </Badge>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--brand-primary)/10]">
              <CreditCard className="h-5 w-5 text-[color:var(--brand-primary)]" />
            </div>
            <div>
              <CardTitle className="text-lg">Payment Account</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Stripe Express lets your spa receive client payments. Finish the steps below to enable bookings.
              </CardDescription>
            </div>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="text-xs text-muted-foreground">
          Status applies to the currently signed-in spa. We never store card numbers—Stripe handles all sensitive info.
        </div>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--popover)] px-3 py-2"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[0.7rem] font-semibold uppercase ${
                  step.done ? 'bg-green-500 text-white' : 'border border-[color:var(--border)] text-muted-foreground'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-[0.65rem] text-gray-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {!accountStatus?.connected && (
            <Button
              onClick={handleCreateAccount}
              disabled={loading}
              size="sm"
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Start Stripe onboarding
            </Button>
          )}
          {accountStatus?.connected && (
            <div className="flex flex-wrap gap-2">
              {!isFullyActive && (
                <Button
                  onClick={async () => {
                    setIsOnboardingDialogOpen(true);
                    if (!onboardingUrl) {
                      await prepareOnboardingLink();
                    }
                  }}
                  disabled={loading}
                  size="sm"
                  className="flex-1 min-w-[140px]"
                >
                  {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Continue onboarding
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleOpenDashboard}
                className="flex-1 min-w-[140px]"
                size="sm"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={fetchAccountStatus}
                disabled={loading}
                className="flex-1 min-w-[140px]"
                size="sm"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Refresh status
              </Button>
              <Button
                variant="ghost"
                onClick={handleDisconnect}
                className="flex-1 min-w-[140px] text-red-500"
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
        <div className="text-[0.65rem] text-gray-500">
          Once charges & payouts show as active, membership controls will unlock on the Management page. Refresh status if you need to re-check Stripe.
        </div>
      </CardContent>
      <Dialog open={isOnboardingDialogOpen} onOpenChange={setIsOnboardingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color:var(--brand-primary)]" />
              Secure Stripe Setup
            </DialogTitle>
            <DialogDescription>
              For security and compliance, Stripe onboarding is completed on Stripe-hosted pages, then returns to this screen automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-3 text-xs text-gray-600">
            Keep this page open. After completing onboarding, you will be redirected back to Management and status will update.
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => handleStartOnboarding('same-tab')}
              disabled={loading || preparingOnboarding}
              className="w-full"
            >
              {(loading || preparingOnboarding) && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Continue in this tab
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStartOnboarding('new-tab')}
              disabled={loading || preparingOnboarding}
              className="w-full"
            >
              Open in new tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default StripeConnect;
