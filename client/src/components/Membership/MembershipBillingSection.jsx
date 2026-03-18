import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ChevronDown, CreditCard, FileText, Loader2, RefreshCw } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import MembershipAddCardDialog from '@/components/Membership/MembershipAddCardDialog'
import MembershipInvoicesDialog from '@/components/Membership/MembershipInvoicesDialog'

const formatMoney = (amount, currency = 'usd') => {
  if (!Number.isFinite(Number(amount))) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: `${currency || 'usd'}`.toUpperCase(),
    maximumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
  }).format(Number(amount))
}

const formatDate = (value) => {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not scheduled'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const MembershipBillingSection = ({
  locationId,
  summary,
  loading = false,
  invoices = [],
  invoicesLoading = false,
  onRefresh,
  onMakeDefault,
  onRemoveCard,
  onOpenInvoicePortal,
}) => {
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [makingDefaultId, setMakingDefaultId] = useState(null)
  const [removingCardId, setRemovingCardId] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  const paymentMethods = summary?.paymentMethods || []
  const membership = summary?.membership || {}
  const subscription = summary?.subscription || {}
  const pendingPlan = subscription?.pendingPlan || null
  const hasPaymentMethod = Boolean(summary?.hasPaymentMethod)
  const membershipStatus = `${membership?.status || subscription?.status || 'inactive'}`
    .trim()
    .toLowerCase()

  const defaultCardLabel = useMemo(() => {
    if (!summary?.defaultPaymentMethod?.last4) return 'No card saved'
    return `${summary.defaultPaymentMethod.brand || 'Card'} •••• ${summary.defaultPaymentMethod.last4}`
  }, [summary?.defaultPaymentMethod])

  const handleMakeDefault = async (paymentMethodId) => {
    try {
      setMakingDefaultId(paymentMethodId)
      await onMakeDefault?.(paymentMethodId)
    } finally {
      setMakingDefaultId(null)
    }
  }

  const handleRemoveCard = async (paymentMethodId) => {
    try {
      setRemovingCardId(paymentMethodId)
      await onRemoveCard?.(paymentMethodId)
    } finally {
      setRemovingCardId(null)
    }
  }

  return (
    <>
      <section className="w-full max-w-6xl mb-6 rounded-[1.35rem] border border-[color:var(--brand-primary)]/14 bg-white overflow-hidden shadow-[0_14px_32px_rgba(15,23,42,0.05)] sm:mb-8 sm:rounded-[1.75rem] sm:shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="h-1 bg-[color:var(--brand-primary)] sm:h-1.5" />

        <div className="px-4 py-4 md:px-7 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-primary)]">
                  Membership
                </span>
                <Badge className="border-0 bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary-dark)] shadow-none">
                  {membershipStatus.replace('_', ' ')}
                </Badge>
              </div>

              <h2 className="mt-2 text-[1.15rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl md:text-[2rem]">
                {membership?.planName || 'Choose a monthly membership'}
              </h2>

              <p className="mt-1 text-[13px] sm:text-sm text-slate-600">
                {membership?.price
                  ? `${formatMoney(membership.price, membership.currency)} / month`
                  : 'Add a card, then pick a plan below.'}
              </p>
            </div>

            <div className="grid w-full grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button
                onClick={() => {
                  setCardDialogOpen(true)
                }}
                disabled={!locationId}
                className={`h-10 ${
                  hasPaymentMethod
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-[color:var(--brand-primary)] text-white hover:bg-[color:var(--brand-primary-dark)]'
                }`}
              >
                {hasPaymentMethod ? <CheckCircle2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                {hasPaymentMethod ? 'Add another card' : 'Add card'}
              </Button>
              <Button
                variant="outline"
                className="h-10 border-slate-200"
                onClick={onOpenInvoicePortal}
              >
                <FileText className="h-4 w-4" />
                Invoices
              </Button>
              <Button variant="ghost" className="h-10 px-3 text-slate-500 sm:px-4" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Card Status
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    hasPaymentMethod
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {hasPaymentMethod ? 'Card added' : 'Card needed'}
                </span>
              </div>
              <p className="mt-1 text-[13px] font-medium text-slate-800">{defaultCardLabel}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--brand-primary)]"
            >
              {showDetails ? 'Hide details' : 'More info'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showDetails && (
            <>
              <div className="mt-4 grid gap-2 md:grid-cols-3 md:gap-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Last payment
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">
                    {formatDate(membership?.lastPaymentAt)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Next payment
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">
                    {formatDate(subscription?.currentPeriodEnd)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Auto-pay card
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-900">{defaultCardLabel}</p>
                </div>
              </div>

              {pendingPlan?.planName ? (
                <p className="mt-3 rounded-xl bg-[color:var(--brand-primary)]/6 px-3 py-2.5 text-[13px] text-slate-700 sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                  Next change: <span className="font-semibold">{pendingPlan.planName}</span> on{' '}
                  {formatDate(pendingPlan.effectiveAt)}.
                </p>
              ) : null}

              <div className="mt-4 border-t border-slate-100 pt-3 sm:mt-5 sm:pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold text-slate-900 sm:text-sm">Saved cards</p>
                  {!hasPaymentMethod ? (
                    <span className="text-[11px] text-slate-500">
                      Add a card before buying a plan.
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {loading ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading billing details...
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-[13px] text-slate-500 sm:rounded-2xl sm:px-4 sm:py-4 sm:text-sm">
                      No saved cards yet.
                    </div>
                  ) : (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-semibold text-slate-900 sm:text-sm">
                              {method.brand || 'Card'} •••• {method.last4}
                            </p>
                            {method.isDefault ? (
                              <Badge className="border-0 bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary-dark)] shadow-none">
                                Default
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[12px] text-slate-500">
                            Expires {method.expMonth}/{method.expYear}
                          </p>
                        </div>

                        {!method.isDefault ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="ghost"
                              className="h-8 px-2.5 justify-start text-[color:var(--brand-primary)] md:justify-center"
                              disabled={makingDefaultId === method.id || removingCardId === method.id}
                              onClick={() => handleMakeDefault(method.id)}
                            >
                              {makingDefaultId === method.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : null}
                              Make default
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-8 px-2.5 justify-start text-rose-600 hover:text-rose-700 md:justify-center"
                              disabled={removingCardId === method.id || makingDefaultId === method.id}
                              onClick={() => handleRemoveCard(method.id)}
                            >
                              {removingCardId === method.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : null}
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            className="h-8 px-2.5 justify-start text-rose-600 hover:text-rose-700 md:justify-center"
                            disabled={removingCardId === method.id}
                            onClick={() => handleRemoveCard(method.id)}
                          >
                            {removingCardId === method.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            Remove
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <MembershipAddCardDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        locationId={locationId}
        onSuccess={onRefresh}
      />

      <MembershipInvoicesDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        invoices={invoices}
        loading={invoicesLoading}
      />
    </>
  )
}

export default MembershipBillingSection
