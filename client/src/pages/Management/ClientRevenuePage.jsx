// File: client/src/pages/Management/ClientRevenuePage.jsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranding } from '@/context/BrandingContext';
import Layout from '@/pages/Layout/Layout';
import { locationService } from '@/services/locationService';
import stripeService from '@/services/stripeService';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, ExternalLink, Filter, RefreshCw, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

const clampChannel = (value) => Math.max(0, Math.min(255, value));

const adjustHex = (hex, amount) => {
  if (!hex) return '#ec4899';
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return '#ec4899';
  const num = parseInt(cleaned, 16);
  const r = clampChannel(((num >> 16) & 255) + amount);
  const g = clampChannel(((num >> 8) & 255) + amount);
  const b = clampChannel((num & 255) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const CATEGORY_LABEL = {
  booking: 'Booking',
  membership: 'Membership',
  credits: 'Credits',
};

const STATUS_VARIANT = {
  succeeded: 'default',
  pending: 'secondary',
  processing: 'secondary',
  failed: 'destructive',
  canceled: 'outline',
  refunded: 'outline',
  partially_refunded: 'outline',
};

const formatUsd = (cents) =>
  `$${((cents || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const shortenId = (id) => {
  if (!id || typeof id !== 'string') return '—';
  return id.length > 14 ? `…${id.slice(-12)}` : id;
};

/** Hosted membership invoice URL, saved on Payment, or card receipt URL from the processor. */
const paymentDocumentHref = (p) => {
  if (!p || typeof p !== 'object') return null;
  const invoice =
    p.hostedInvoiceUrl ||
    (typeof p.membershipDetails?.invoiceUrl === 'string' ? p.membershipDetails.invoiceUrl : null);
  if (invoice && /^https?:\/\//i.test(invoice)) return invoice;
  if (typeof p.receiptUrl === 'string' && /^https?:\/\//i.test(p.receiptUrl)) return p.receiptUrl;
  return null;
};

const paymentDocumentLabel = (p) =>
  paymentDocumentHref(p) &&
  (p.hostedInvoiceUrl || p.membershipDetails?.invoiceUrl
    ? 'Invoice'
    : 'Receipt');

/** booking | membership | credits | other */
const normalizedCategoryBucket = (p) => {
  const c = p.paymentCategory;
  if (c === 'booking' || c === 'membership' || c === 'credits') return c;
  return 'other';
};

function applyPaymentFilters(payments, f) {
  const q = `${f.search || ''}`.trim().toLowerCase();

  let fromBoundary = null;
  let toBoundary = null;
  if (f.dateFrom) {
    const d = parseDateInputLocal(f.dateFrom);
    if (d) fromBoundary = d;
  }
  if (f.dateTo) {
    const d = parseDateInputLocal(f.dateTo);
    if (d) toBoundary = endOfLocalDay(d);
  }

  return payments.filter((p) => {
    if (f.status !== 'all') {
      const st = `${p.status || ''}`.toLowerCase();
      if (f.status === 'refunded') {
        if (st !== 'refunded' && st !== 'partially_refunded') return false;
      } else if (st !== f.status) {
        return false;
      }
    }

    if (f.category !== 'all' && normalizedCategoryBucket(p) !== f.category) {
      return false;
    }

    if (fromBoundary || toBoundary) {
      if (!p.createdAt) return false;
      const t = new Date(p.createdAt).getTime();
      if (fromBoundary && t < fromBoundary.getTime()) return false;
      if (toBoundary && t > toBoundary.getTime()) return false;
    }

    if (q) {
      const name = `${p.customer?.name || ''}`.toLowerCase();
      const email = `${p.customer?.email || ''}`.toLowerCase();
      const desc = `${p.description || ''}`.toLowerCase();
      const svc = `${p.service?.name || ''}`.toLowerCase();
      const ref = `${p.stripePaymentIntentId || ''}${p.stripeChargeId || ''}`.toLowerCase();
      const docUrl = `${paymentDocumentHref(p) || ''}`.toLowerCase();
      if (
        !name.includes(q) &&
        !email.includes(q) &&
        !desc.includes(q) &&
        !svc.includes(q) &&
        !ref.includes(q) &&
        !docUrl.includes(q)
      ) {
        return false;
      }
    }

    return true;
  });
}

/** Local YYYY-MM-DD → midnight */
function parseDateInputLocal(ymd) {
  if (!ymd || typeof ymd !== 'string') return null;
  const parts = ymd.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function endOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

const EMPTY_LOCATIONS = [];

const ClientRevenuePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();
  const { currentUser } = useSelector((state) => state.user);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [stripeListCursor, setStripeListCursor] = useState(null);
  const [stripeListCursorTrail, setStripeListCursorTrail] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const brandColor = branding?.themeColor || '#ec4899';
  const brandColorDark = useMemo(() => adjustHex(brandColor, -24), [brandColor]);

  const isTeamOrAbove = ['spa', 'admin', 'super-admin'].includes(currentUser?.role);
  const currentUserLocationId =
    currentUser?.selectedLocation?.locationId || currentUser?.spaLocation?.locationId;
  const spaParamLocationId = `${new URLSearchParams(location.search).get('spa') || ''}`.trim();
  const activeSpaLocationId = spaParamLocationId || currentUserLocationId || '';

  useEffect(() => {
    setPage(1);
    setStripeListCursor(null);
    setStripeListCursorTrail([]);
  }, [activeSpaLocationId]);

  const navigateWithSpa = (path) => {
    if (!activeSpaLocationId) {
      navigate(path);
      return;
    }
    navigate(`${path}?spa=${encodeURIComponent(activeSpaLocationId)}`);
  };

  const { data: locationsData, isFetched: locationsFetched } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAllLocations(),
    enabled: isTeamOrAbove,
  });

  const locations = locationsData?.data?.locations || EMPTY_LOCATIONS;
  const currentLocation = locations.find((loc) => loc?.locationId === activeSpaLocationId);
  const sharedLocationStripeLinked = Boolean(currentLocation?.membershipStripeConnected);
  const sharedLocationSquareLinked = Boolean(currentLocation?.membershipSquareConnected);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [
      'stripe-received-payments',
      activeSpaLocationId || '-',
      page,
      stripeListCursor ?? 'root',
    ],
    queryFn: () =>
      stripeService.getReceivedStripePayments({
        page,
        limit: pageSize,
        locationId: activeSpaLocationId || undefined,
        startingAfter: stripeListCursor || undefined,
      }),
  });

  const isStripeChargePaging = data?.ledgerSource === 'stripe_charges';

  const handleStripeNextPage = () => {
    const token = data?.pagination?.nextStartingAfter;
    if (!token) return;
    setStripeListCursorTrail((t) => [...t, stripeListCursor ?? null]);
    setStripeListCursor(token);
  };

  const handleStripePrevPage = () => {
    setStripeListCursorTrail((t) => {
      if (!t.length) return t;
      const copy = [...t];
      const prev = copy.pop();
      setStripeListCursor(prev ?? null);
      return copy;
    });
  };

  const { data: stripeStatus, isFetched: stripeStatusFetched } = useQuery({
    queryKey: ['stripe-connect-status', 'revenue-page'],
    queryFn: stripeService.getAccountStatus,
    enabled: currentUser?.role === 'spa',
  });

  // Match StripeConnect: location can use another spa owner’s Connect account (shared link).
  const isBlockedBySquare = sharedLocationSquareLinked && !stripeStatus?.connected;
  const sharedStripeCoversLocation =
    !isBlockedBySquare && sharedLocationStripeLinked && !stripeStatus?.connected;
  const stripeEffectivelyConnected =
    currentUser?.role !== 'spa' ||
    Boolean(stripeStatus?.connected) ||
    sharedStripeCoversLocation;

  const needsLocationStripeFlag = currentUser?.role === 'spa' && Boolean(activeSpaLocationId);
  const showStripeDisconnectedBanner =
    currentUser?.role === 'spa' &&
    stripeStatusFetched &&
    (!needsLocationStripeFlag || locationsFetched) &&
    !stripeEffectivelyConnected;

  const payments = data?.payments ?? [];
  const pagination = data?.pagination;

  const filteredPayments = useMemo(
    () =>
      applyPaymentFilters(payments, {
        status: filterStatus,
        category: filterCategory,
        search: filterSearch,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
      }),
    [
      payments,
      filterStatus,
      filterCategory,
      filterSearch,
      filterDateFrom,
      filterDateTo,
    ],
  );

  const hasActiveFilters =
    filterStatus !== 'all' ||
    filterCategory !== 'all' ||
    Boolean(filterSearch.trim()) ||
    Boolean(filterDateFrom) ||
    Boolean(filterDateTo);

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterSearch('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-stone-50 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <button
            type="button"
            onClick={() => navigateWithSpa('/management')}
            className="inline-flex items-center text-sm font-medium mb-6 transition-colors hover:opacity-90"
            style={{ color: brandColorDark }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
            Back to Management
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm overflow-hidden mb-6">
            <div
              className="h-2 w-full"
              style={{
                backgroundImage: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
              }}
            />
            <div className="px-5 py-5 md:px-8 md:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Payments</h1>
                <p className="mt-2 text-slate-600 text-sm md:text-base max-w-xl">
                  Recent charges for this location, newest first. When a charge was taken through this app, we show
                  booking, membership, or credit context when it matches the same transaction record.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={isFetching}
                onClick={() => refetch()}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {data?.fallbackReason === 'stripe_list_failed' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 mb-6">
              We couldn&apos;t load the live list from your payment processor; showing{' '}
              <span className="font-semibold">saved transactions only</span> for this location. Try Refresh or check back
              shortly.
            </div>
          )}

          {showStripeDisconnectedBanner && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 mb-6">
              Card payouts aren&apos;t set up for this location yet. Complete setup under{' '}
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => navigateWithSpa('/management')}
              >
                Management → Payouts
              </button>
              , then transactions will sync here automatically.
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 shrink-0" style={{ color: brandColorDark }} aria-hidden />
                <h2 className="font-semibold text-slate-900">Payments</h2>
                {!isLoading &&
                  pagination?.totalPayments != null &&
                  !isStripeChargePaging && (
                    <span className="text-sm text-slate-500 tabular-nums">
                      ({pagination.totalPayments})
                    </span>
                  )}
                {!isLoading && isStripeChargePaging && payments.length > 0 && (
                  <span className="text-sm text-slate-500">{payments.length} on this page · live list</span>
                )}
                {!isLoading && payments.length > 0 && hasActiveFilters && (
                  <span className="text-sm text-slate-700 font-medium tabular-nums whitespace-nowrap">
                    {filteredPayments.length} match
                    <span className="text-slate-500 font-normal"> · {payments.length} on page</span>
                  </span>
                )}
              </div>
              {!isLoading && payments.length > 0 && (
                <p className="text-xs text-slate-500">
                  {isStripeChargePaging
                    ? 'Your processor dashboard may also show balances, payouts, and adjustments beyond individual charges.'
                    : 'Totals follow the payout account configured under Management → Payouts.'}{' '}
                  Filters narrow the loaded rows only (same page).
                </p>
              )}
            </div>

            {error ? (
              <div className="p-10 text-center text-sm text-red-600">
                {error.response?.data?.message ||
                  error.message ||
                  'Unable to load payments.'}
              </div>
            ) : isLoading ? (
              <div className="p-4 md:p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="py-16 md:py-24 text-center px-4">
                <div className="inline-flex rounded-full bg-slate-100 p-4 mb-4">
                  <CreditCard className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No payments yet</h3>
                <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                  When clients pay online or by card through your linked payout account, successful charges appear here,
                  newest first.
                </p>
                {currentUser?.role === 'spa' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6"
                    onClick={() => navigateWithSpa('/management')}
                  >
                    Open Management & payouts
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-4 md:px-6">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />
                    <span className="text-sm font-medium text-slate-800">Filters</span>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-slate-600"
                        onClick={clearFilters}
                      >
                        <X className="h-3.5 w-3.5 mr-1" aria-hidden />
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12 xl:gap-4 items-end">
                    <div className="space-y-1.5 xl:col-span-2">
                      <Label htmlFor="pay-filter-status" className="text-xs text-slate-600">
                        Status
                      </Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="pay-filter-status" className="w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="succeeded">Succeeded</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 xl:col-span-2">
                      <Label htmlFor="pay-filter-type" className="text-xs text-slate-600">
                        Type
                      </Label>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger id="pay-filter-type" className="w-full">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="booking">{CATEGORY_LABEL.booking}</SelectItem>
                          <SelectItem value="membership">{CATEGORY_LABEL.membership}</SelectItem>
                          <SelectItem value="credits">{CATEGORY_LABEL.credits}</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 xl:col-span-2">
                      <Label htmlFor="pay-filter-from" className="text-xs text-slate-600">
                        From
                      </Label>
                      <Input
                        id="pay-filter-from"
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1.5 xl:col-span-2">
                      <Label htmlFor="pay-filter-to" className="text-xs text-slate-600">
                        To
                      </Label>
                      <Input
                        id="pay-filter-to"
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1.5 xl:col-span-4 xl:col-start-auto">
                      <Label htmlFor="pay-filter-search" className="text-xs text-slate-600">
                        Search
                      </Label>
                      <Input
                        id="pay-filter-search"
                        type="search"
                        placeholder="Customer, email, note, invoice link…"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="bg-white"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="py-14 md:py-20 text-center px-4 border-b border-slate-50">
                    <p className="text-sm font-medium text-slate-900">No rows match these filters</p>
                    <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                      Try widening the dates or resetting filters. Larger result sets may use Previous / Next — filters
                      only apply to the current page.
                    </p>
                    {hasActiveFilters && (
                      <Button type="button" variant="outline" size="sm" className="mt-6" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 font-medium whitespace-nowrap md:px-6">Date</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Customer</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Type</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Amount</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">Document</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap hidden lg:table-cell">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredPayments.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 md:px-6 text-slate-700 whitespace-nowrap tabular-nums">
                            {p.createdAt
                              ? new Date(p.createdAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-900">
                            <div className="font-medium truncate max-w-[12rem] md:max-w-xs">
                              {p.customer?.name || 'Customer'}
                            </div>
                            {p.customer?.email && (
                              <div className="text-xs text-slate-500 truncate max-w-[12rem] md:max-w-xs">
                                {p.customer.email}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <span className="inline-block">
                              {p.paymentCategory
                                ? CATEGORY_LABEL[p.paymentCategory] || p.paymentCategory
                                : p.ledgerSource === 'stripe'
                                  ? 'Other charge'
                                  : '—'}
                            </span>
                            {p.service?.name && (
                              <div className="text-xs text-slate-500 truncate max-w-[10rem] mt-0.5">
                                {p.service.name}
                              </div>
                            )}
                            {p.description && (
                              <div className="text-xs text-slate-400 truncate max-w-[12rem] mt-0.5">
                                {p.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                            {formatUsd(p.amount)}
                            {p.currency && (
                              <span className="text-xs font-normal text-slate-500 ml-1 uppercase">{p.currency}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_VARIANT[p.status] || 'secondary'} className="capitalize">
                              {p.status?.replace(/_/g, ' ') || '—'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {paymentDocumentHref(p) ? (
                              <a
                                href={paymentDocumentHref(p)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-2 hover:underline"
                                style={{ color: brandColorDark }}
                              >
                                <ExternalLink className="size-3.5 shrink-0 opacity-90" aria-hidden />
                                <span>{paymentDocumentLabel(p)}</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs hidden lg:table-cell">
                            {shortenId(p.stripePaymentIntentId || p.stripeChargeId)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}

                {isStripeChargePaging &&
                  (stripeListCursorTrail.length > 0 || pagination?.hasNextPage) && (
                    <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-6 border-t border-slate-100 bg-slate-50/30">
                      <p className="text-xs text-slate-500">More charges</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={stripeListCursorTrail.length === 0 || isFetching}
                          onClick={handleStripePrevPage}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!pagination?.hasNextPage || isFetching}
                          onClick={handleStripeNextPage}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                {!isStripeChargePaging && pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-6 border-t border-slate-100 bg-slate-50/30">
                    <p className="text-xs text-slate-500">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPreviousPage || isFetching}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNextPage || isFetching}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClientRevenuePage;
