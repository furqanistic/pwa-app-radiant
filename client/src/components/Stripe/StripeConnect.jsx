// File: client/src/components/Stripe/StripeConnect.jsx - Stripe Connect Integration
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import stripeService from '../../services/stripeService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CreditCard, CheckCircle2, XCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

const StripeConnect = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetchAccountStatus();
  }, []);

  const fetchAccountStatus = async () => {
    try {
      setChecking(true);
      const data = await stripeService.getAccountStatus();
      setAccountStatus(data);
    } catch (error) {
      console.error('Error fetching account status:', error);
      toast.error('Failed to load Stripe account status');
    } finally {
      setChecking(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setLoading(true);
      await stripeService.createConnectAccount();
      toast.success('Stripe account created successfully!');

      // Now create the onboarding link
      await handleStartOnboarding();
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(error.response?.data?.message || 'Failed to create Stripe account');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    try {
      setLoading(true);
      const returnUrl = `${window.location.origin}/management?stripe=success`;
      const refreshUrl = `${window.location.origin}/management?stripe=refresh`;

      const data = await stripeService.createAccountLink(returnUrl, refreshUrl);

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast.error(error.response?.data?.message || 'Failed to start onboarding');
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
      toast.error(error.response?.data?.message || 'Failed to open dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== 'team') {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Payment Account</CardTitle>
              <CardDescription>
                Connect your Stripe account to receive payments from clients
              </CardDescription>
            </div>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!accountStatus?.connected ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">Why connect Stripe?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Accept credit card payments from your clients</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Secure and PCI-compliant payment processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Automatic payouts to your bank account</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Detailed transaction reports and analytics</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={handleCreateAccount}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect Stripe Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {accountStatus.account && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Account Status</span>
                  {renderStatusBadge()}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {accountStatus.account.chargesEnabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-muted-foreground">Charges Enabled</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {accountStatus.account.payoutsEnabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-muted-foreground">Payouts Enabled</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {accountStatus.account.detailsSubmitted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-muted-foreground">Details Submitted</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {accountStatus.account.onboardingCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-muted-foreground">Onboarding Complete</span>
                  </div>
                </div>

                {accountStatus.account.email && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Email: </span>
                    <span className="text-xs font-medium">{accountStatus.account.email}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!accountStatus.account?.onboardingCompleted && (
                <Button
                  onClick={handleStartOnboarding}
                  disabled={loading}
                  variant="default"
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Setup
                </Button>
              )}

              <Button
                onClick={handleOpenDashboard}
                disabled={loading || !accountStatus.account?.chargesEnabled}
                variant="outline"
                className="flex-1"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Stripe Dashboard
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={fetchAccountStatus}
                disabled={loading}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                Refresh Status
              </Button>

              <Button
                onClick={handleDisconnect}
                disabled={loading}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                Disconnect Account
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StripeConnect;
