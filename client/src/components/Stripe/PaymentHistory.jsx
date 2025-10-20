// File: client/src/components/Stripe/PaymentHistory.jsx - Payment History Component
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import stripeService from '../../services/stripeService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Calendar,
  User,
  Package,
  RefreshCw,
} from 'lucide-react';

const PaymentHistory = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPaymentHistory();
  }, [currentPage]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const data = await stripeService.getPaymentHistory(currentPage, 10);
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      succeeded: { variant: 'default', className: 'bg-green-500 hover:bg-green-600', label: 'Paid' },
      pending: { variant: 'secondary', className: 'bg-yellow-500 hover:bg-yellow-600', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' },
      canceled: { variant: 'secondary', label: 'Canceled' },
      refunded: { variant: 'secondary', className: 'bg-gray-500 hover:bg-gray-600', label: 'Refunded' },
      partially_refunded: { variant: 'secondary', label: 'Partially Refunded' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && payments.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {currentUser?.role === 'team'
                ? 'Payments you have received from clients'
                : 'Your payment transactions'
              }
            </CardDescription>
          </div>
          <Button
            onClick={fetchPaymentHistory}
            disabled={loading}
            variant="outline"
            size="icon"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
            <p className="text-sm text-muted-foreground">
              {currentUser?.role === 'team'
                ? 'Payments from clients will appear here'
                : 'Your payment history will appear here'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment._id}
                  className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold">
                          {payment.service?.name || 'Service'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(payment.createdAt)}</span>
                      </div>

                      {currentUser?.role === 'team' && payment.customer && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          <span>Customer: {payment.customer.name || 'Unknown'}</span>
                        </div>
                      )}

                      {currentUser?.role !== 'team' && payment.spaOwner && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          <span>Spa: {payment.spaOwner.spaLocation?.locationName || 'Unknown'}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold mb-1">
                        ${payment.formattedAmount || (payment.amount / 100).toFixed(2)}
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t text-xs">
                    {payment.pointsEarned > 0 && (
                      <div className="text-muted-foreground">
                        Points Earned: <span className="font-semibold text-foreground">{payment.pointsEarned}</span>
                      </div>
                    )}

                    {payment.discount?.amount > 0 && (
                      <div className="text-muted-foreground">
                        Discount: <span className="font-semibold text-green-600">
                          -${(payment.discount.amount / 100).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {payment.paymentMethod?.last4 && (
                      <div className="text-muted-foreground">
                        Card: <span className="font-semibold text-foreground">
                          •••• {payment.paymentMethod.last4}
                        </span>
                      </div>
                    )}

                    {payment.refund?.amount > 0 && (
                      <div className="text-muted-foreground">
                        Refunded: <span className="font-semibold text-red-600">
                          ${(payment.refund.amount / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.hasPreviousPage || loading}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <Button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.hasNextPage || loading}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
