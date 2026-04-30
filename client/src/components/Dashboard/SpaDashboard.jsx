import { useBranding } from '@/context/BrandingContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { dashboardQueryKeys } from '@/hooks/useDashboard'
import { dashboardService } from '@/services/dashboardService'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  History,
  LayoutDashboard,
  RefreshCw,
  RotateCcw,
  ScanLine,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const Motion = motion
const TEST_EMAIL_SUFFIX = '@test.com'

const formatStatInteger = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return Math.round(n).toLocaleString()
}

const normalizeEmail = (email = '') => String(email).trim().toLowerCase()
const isTestEmail = (email = '') => normalizeEmail(email).endsWith(TEST_EMAIL_SUFFIX)

const SpaDashboard = ({ data, refetch, refreshRecentCheckIns, dashboardFilters = {} }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [currentCheckInPage, setCurrentCheckInPage] = useState(1)
  const [checkInRowsPerPage, setCheckInRowsPerPage] = useState(10)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isResettingCheckIns, setIsResettingCheckIns] = useState(false)
  const [isRefreshingCheckIns, setIsRefreshingCheckIns] = useState(false)
  const {
    stats = {},
    liveActivity = [],
    recentQrClaims = [],
    recentQrClaimsSummary = {},
  } = data || {}

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { branding, locationId } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const creditSystemEnabled = Boolean(branding?.membership?.creditSystem?.isEnabled)
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '')
    if (cleaned.length !== 6) return '#b0164e'
    const num = parseInt(cleaned, 16)
    const r = Math.max(0, ((num >> 16) & 255) - 24)
    const g = Math.max(0, ((num >> 8) & 255) - 24)
    const b = Math.max(0, (num & 255) - 24)
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  const claimEmail = (claim = {}) =>
    claim?.customer?.email || claim?.scannedByEmail || ''

  const filteredRecentQrClaims = recentQrClaims.filter(
    (claim) => !isTestEmail(claimEmail(claim))
  )
  const latestVisibleQrClaim = filteredRecentQrClaims[0] || null
  const filteredRecentQrClaimsSummary = {
    ...recentQrClaimsSummary,
    latestClaimAt: latestVisibleQrClaim?.claimedAt || null,
  }
  const totalCheckInPages = Math.max(
    1,
    Math.ceil(filteredRecentQrClaims.length / checkInRowsPerPage)
  )
  const checkInStartIndex = (currentCheckInPage - 1) * checkInRowsPerPage
  const paginatedQrClaims = filteredRecentQrClaims.slice(
    checkInStartIndex,
    checkInStartIndex + checkInRowsPerPage
  )

  const withSpaParam = useCallback(
    (path) => {
      return locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path
    },
    [locationId]
  )

  const handleRefresh = useCallback(async () => {
    const refreshFn =
      typeof refreshRecentCheckIns === 'function'
        ? refreshRecentCheckIns
        : typeof refetch === 'function'
        ? refetch
        : null

    if (!refreshFn) return

    try {
      setIsRefreshingCheckIns(true)
      await refreshFn()
    } finally {
      setIsRefreshingCheckIns(false)
    }
  }, [refetch, refreshRecentCheckIns])

  useEffect(() => {
    const refreshFn =
      typeof refreshRecentCheckIns === 'function'
        ? refreshRecentCheckIns
        : typeof refetch === 'function'
        ? refetch
        : null

    if (!refreshFn) return undefined

    const intervalId = window.setInterval(async () => {
      try {
        await refreshFn()
      } catch {
        // Keep background refresh silent; manual refresh still surfaces errors.
      }
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [refetch, refreshRecentCheckIns])

  useEffect(() => {
    setCurrentCheckInPage(1)
  }, [checkInRowsPerPage])

  useEffect(() => {
    if (currentCheckInPage > totalCheckInPages) {
      setCurrentCheckInPage(totalCheckInPages)
    }
  }, [currentCheckInPage, totalCheckInPages])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (dateString) => {
    const target = new Date(dateString).getTime()
    const diffMs = target - Date.now()
    const absSeconds = Math.round(Math.abs(diffMs) / 1000)

    if (absSeconds < 60) return 'Just now'

    const units = [
      { label: 'day', seconds: 60 * 60 * 24 },
      { label: 'hour', seconds: 60 * 60 },
      { label: 'minute', seconds: 60 },
    ]
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const unit =
      units.find((entry) => absSeconds >= entry.seconds) ||
      units[units.length - 1]
    const value = Math.round(diffMs / 1000 / unit.seconds)

    return formatter.format(value, unit.label)
  }

  const handleResetRecentCheckIns = async () => {
    try {
      setIsResettingCheckIns(true)
      const response = await dashboardService.resetRecentCheckIns(
        locationId ? { locationId } : {}
      )
      const resetPayload = response?.data || {}

      queryClient.setQueryData(
        dashboardQueryKeys.data(dashboardFilters),
        (currentData) => {
          if (!currentData?.data) return currentData

          return {
            ...currentData,
            data: {
              ...currentData.data,
              recentQrClaims: [],
              recentQrClaimsSummary: {
                ...(currentData.data.recentQrClaimsSummary || {}),
                totalClaims: 0,
                uniqueVisitors: 0,
                latestClaimAt: null,
                lastResetAt:
                  resetPayload.lastResetAt ||
                  currentData.data.recentQrClaimsSummary?.lastResetAt ||
                  null,
              },
            },
          }
        }
      )

      toast.success(
        resetPayload.deletedScans
          ? `Cleared ${resetPayload.deletedScans} recent check-ins.`
          : 'Recent check-ins cleared.'
      )
      setIsResetDialogOpen(false)
      setCurrentCheckInPage(1)
      await refetch?.()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not clear recent check-ins.'
      )
    } finally {
      setIsResettingCheckIns(false)
    }
  }

  const getClaimedCustomerName = (claim) => {
    return claim?.customer?.name || claim?.scannedByEmail || 'Guest visitor'
  }

  const getCustomerCredits = (claim) => {
    const value = Number(claim?.customer?.credits)
    return Number.isFinite(value) ? Math.max(0, value) : 0
  }

  const openClientProfile = (claim) => {
    const userId = claim?.customer?._id
    if (!userId) return

    navigate(withSpaParam(`/client/${userId}`), {
      state: {
        user: claim.customer,
      },
    })
  }

  const filteredLiveActivity = liveActivity.filter((activity) => {
    const payment = activity?.paymentId
    const paymentLivemode =
      payment && typeof payment === 'object' ? payment?.livemode : undefined
    const activityEmail =
      activity?.customer?.email ||
      activity?.userId?.email ||
      activity?.user?.email ||
      activity?.client?.email ||
      activity?.email ||
      ''

    const passesPaymentGate =
      activity?.paymentStatus === 'paid' ||
      `${activity?.displayStatus || ''}`.toLowerCase() === 'paid' ||
      activity?.activityKind === 'todaysAppointment'

    return !(
      isTestEmail(activityEmail) ||
      !passesPaymentGate ||
      activity?.stripeMode === 'test' ||
      activity?.testMode === true ||
      activity?.isTestMode === true ||
      paymentLivemode === false
    )
  })

  const RewardSummaryChips = ({ rewardSummary, compact = false }) => {
    const labels = Array.isArray(rewardSummary?.labels)
      ? rewardSummary.labels
      : []
    const totalActiveRewards = rewardSummary?.totalActiveRewards || 0
    const baseClass = compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]'

    if (labels.length === 0 && totalActiveRewards === 0) {
      return (
        <span
          className={`inline-flex rounded-full bg-gray-100 text-gray-500 font-bold ${baseClass}`}
        >
          No active rewards
        </span>
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <span
            key={label}
            className={`inline-flex rounded-full border border-[color:var(--brand-primary)/0.18] bg-[color:var(--brand-primary)/0.1] text-[color:var(--brand-primary)] font-black ${baseClass}`}
          >
            {label}
          </span>
        ))}
        {totalActiveRewards > labels.length && (
          <span
            className={`inline-flex rounded-full bg-gray-100 text-gray-600 font-bold ${baseClass}`}
          >
            +{totalActiveRewards - labels.length} more
          </span>
        )}
      </div>
    )
  }

  const StatsGrid = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      <StatCard
        title="Clients"
        value={formatStatInteger(stats.totalClients)}
        icon={Users}
        growth={stats.clientGrowth}
      />
      <StatCard
        periodLabel="Last 30 days"
        title="Check-ins"
        value={formatStatInteger(stats.totalVisits)}
        icon={UserCheck}
        growth={stats.visitGrowth}
      />
      <StatCard
        periodLabel="Last 30 days"
        title="Active members"
        value={formatStatInteger(stats.activeMemberships)}
        icon={TrendingUp}
        growth={stats.membershipGrowth}
      />
      <StatCard
        periodLabel="Last 30 days"
        title="Revenue"
        value={`$${Number(stats.totalRevenue ?? 0).toFixed(2)}`}
        icon={DollarSign}
        growth={stats.revenueGrowth}
      />
    </div>
  )

  const RecentCheckIns = () => (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${brandColor}15` }}
            >
              <ScanLine className="w-5 h-5" style={{ color: brandColor }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Recent Check-Ins
              </h2>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">
                Last {filteredRecentQrClaimsSummary?.days || 3} days
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-gray-50 px-4 py-3 border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Claims
                </p>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  {filteredRecentQrClaimsSummary?.totalClaims || 0}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Visitors
                </p>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  {filteredRecentQrClaimsSummary?.uniqueVisitors || 0}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Latest
                </p>
                <p className="text-sm font-black text-gray-900 mt-2 leading-tight">
                  {filteredRecentQrClaimsSummary?.latestClaimAt
                    ? formatRelativeTime(filteredRecentQrClaimsSummary.latestClaimAt)
                    : 'No scans'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:justify-end">
              <p className="text-xs font-bold text-gray-400">
                Last reset:{' '}
                <span className="text-gray-700">
                  {filteredRecentQrClaimsSummary?.lastResetAt
                    ? formatDate(filteredRecentQrClaimsSummary.lastResetAt)
                    : 'Never'}
                </span>
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isResettingCheckIns || isRefreshingCheckIns}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isRefreshingCheckIns ? 'animate-spin' : ''
                  }`}
                />
                {isRefreshingCheckIns ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={() => setIsResetDialogOpen(true)}
                disabled={isResettingCheckIns || filteredRecentQrClaims.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Last 3 Days
              </button>
            </div>
          </div>
        </div>

        {latestVisibleQrClaim ? (
          <button
            type="button"
            onClick={() => openClientProfile(latestVisibleQrClaim)}
            className="w-full text-left rounded-[28px] border border-[color:var(--brand-primary)/0.14] bg-gradient-to-br from-white via-[color:var(--brand-primary)/0.04] to-[color:var(--brand-primary)/0.1] p-5 sm:p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-[color:var(--brand-primary)/0.16] flex items-center justify-center text-[color:var(--brand-primary)] font-black overflow-hidden shrink-0">
                  {latestVisibleQrClaim.customer?.avatar ? (
                    <img
                      src={latestVisibleQrClaim.customer.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (
                      getClaimedCustomerName(latestVisibleQrClaim).charAt(0) || '?'
                    ).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--brand-primary)]">
                    Latest customer scan
                  </p>
                  <h3 className="text-2xl font-black text-gray-900 truncate mt-1">
                    {getClaimedCustomerName(latestVisibleQrClaim)}
                  </h3>
                  <p className="text-sm text-gray-500 font-bold truncate mt-1">
                    {latestVisibleQrClaim.customer?.email ||
                      latestVisibleQrClaim.scannedByEmail}
                  </p>
                  <p className="text-xs text-gray-400 font-bold mt-2">
                    Earned {latestVisibleQrClaim.pointsAwarded} points{' '}
                    {formatRelativeTime(latestVisibleQrClaim.claimedAt)}
                  </p>
                  {creditSystemEnabled && (
                    <p className="text-xs text-gray-500 font-bold mt-1">
                      Available credits: {getCustomerCredits(latestVisibleQrClaim)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-start lg:items-end gap-3">
                <RewardSummaryChips
                  rewardSummary={latestVisibleQrClaim.activeRewardSummary}
                />
                <span className="inline-flex items-center gap-2 text-sm font-black text-[color:var(--brand-primary)]">
                  Open profile
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </button>
        ) : (
          <div className="rounded-[28px] border border-dashed border-gray-200 bg-gray-50/80 px-6 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-900 font-black">No verified check-ins yet</p>
            <p className="text-sm text-gray-500 font-bold mt-2">
              New QR claims from the last {filteredRecentQrClaimsSummary?.days || 3}{' '}
              days will appear here automatically.
            </p>
          </div>
        )}

        <div className="rounded-[28px] border border-gray-100 overflow-hidden">
          <div
            className={`hidden md:grid gap-4 bg-gray-50 px-5 py-4 border-b border-gray-100 ${
              creditSystemEnabled
                ? 'grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_95px_110px_160px_52px]'
                : 'grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_120px_160px_52px]'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Customer
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Active rewards
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Points
            </span>
            {creditSystemEnabled && (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Credits
              </span>
            )}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Scanned
            </span>
            <span />
          </div>

          <div className="divide-y divide-gray-100">
            {paginatedQrClaims.map((claim) => (
              <button
                key={claim._id}
                type="button"
                onClick={() => openClientProfile(claim)}
                className="w-full text-left px-5 py-4 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
                disabled={!claim?.customer?._id}
              >
                <div className="md:hidden space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">
                        {getClaimedCustomerName(claim)}
                      </p>
                      <p className="text-xs text-gray-500 font-bold truncate mt-1">
                        {claim.customer?.email || claim.scannedByEmail}
                      </p>
                    </div>
                    <span className="text-xs font-black text-[color:var(--brand-primary)] whitespace-nowrap">
                      +{claim.pointsAwarded} pts
                    </span>
                  </div>
                  {creditSystemEnabled && (
                    <p className="text-[11px] font-bold text-gray-500">
                      Credits: {getCustomerCredits(claim)}
                    </p>
                  )}
                  <RewardSummaryChips
                    rewardSummary={claim.activeRewardSummary}
                    compact
                  />
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                    <span>{formatDate(claim.claimedAt)}</span>
                    <span>{formatRelativeTime(claim.claimedAt)}</span>
                  </div>
                </div>

                <div
                  className={`hidden md:grid gap-4 items-center ${
                    creditSystemEnabled
                      ? 'grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_95px_110px_160px_52px]'
                      : 'grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_120px_160px_52px]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">
                      {getClaimedCustomerName(claim)}
                    </p>
                    <p className="text-xs text-gray-500 font-bold truncate mt-1">
                      {claim.customer?.email || claim.scannedByEmail}
                    </p>
                  </div>
                  <RewardSummaryChips
                    rewardSummary={claim.activeRewardSummary}
                    compact
                  />
                  <span className="text-sm font-black text-[color:var(--brand-primary)]">
                    +{claim.pointsAwarded}
                  </span>
                  {creditSystemEnabled && (
                    <span className="text-sm font-black text-gray-700">
                      {getCustomerCredits(claim)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900">
                      {formatDate(claim.claimedAt)}
                    </p>
                    <p className="text-[11px] text-gray-400 font-bold mt-1">
                      {formatRelativeTime(claim.claimedAt)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 justify-self-end" />
                </div>
              </button>
            ))}

            {paginatedQrClaims.length === 0 && (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-black text-gray-900">
                  No customer check-ins to list
                </p>
                <p className="text-xs text-gray-500 font-bold mt-2">
                  Verified scans will stay here for 3 days and then disappear
                  automatically.
                </p>
              </div>
            )}
          </div>

          {filteredRecentQrClaims.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-gray-100 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex items-center gap-3 text-sm font-bold text-gray-500">
                  Rows
                  <select
                    value={checkInRowsPerPage}
                    onChange={(event) =>
                      setCheckInRowsPerPage(Number(event.target.value))
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-[color:var(--brand-primary)]"
                  >
                    {[10, 25, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-sm font-bold text-gray-400">
                  Showing {checkInStartIndex + 1}-
                  {Math.min(
                    checkInStartIndex + paginatedQrClaims.length,
                    filteredRecentQrClaims.length
                  )}{' '}
                  of {filteredRecentQrClaims.length}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentCheckInPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentCheckInPage === 1}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm font-black text-gray-900">
                  Page {currentCheckInPage} / {totalCheckInPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentCheckInPage((page) =>
                      Math.min(totalCheckInPages, page + 1)
                    )
                  }
                  disabled={currentCheckInPage >= totalCheckInPages}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const ActivityFeed = () => (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${brandColor}15` }}
          >
            <Activity className="w-5 h-5" style={{ color: brandColor }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Daily Activity</h2>
        </div>
        <span className="flex h-2 w-2 rounded-full bg-[color:var(--brand-primary)] animate-pulse" />
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {filteredLiveActivity.map((activity) => (
          <div
            key={activity._id}
            className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200/70 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[color:var(--brand-primary)/0.12] flex-shrink-0 flex items-center justify-center font-black text-[color:var(--brand-primary)] border border-white shadow-sm overflow-hidden text-sm">
              {activity.userId?.avatar ? (
                <img src={activity.userId.avatar} alt="" />
              ) : (
                activity.userId?.name?.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-black text-gray-900 truncate">
                  {activity.userId?.name}
                </p>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-tight">
                  {formatDate(activity.createdAt)}
                </p>
              </div>
              <p className="text-[11px] text-gray-500 font-bold leading-tight">
                {activity.activityLabel || activity.serviceName}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    (activity.displayStatus || activity.status) === 'completed' ||
                    (activity.displayStatus || activity.status) === 'paid'
                      ? 'bg-[color:var(--brand-primary)/0.15] text-[color:var(--brand-primary)]'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {activity.displayStatus || activity.status}
                </span>
                <span className="text-[11px] font-black text-gray-900">
                  ${activity.finalPrice}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredLiveActivity.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200/70">
              <Activity className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
              No activity to display
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const StatCard = ({ title, value, icon, growth, periodLabel }) => {
    const g = typeof growth === 'number' && Number.isFinite(growth) ? growth : null

    const GrowthBadge = ({ className }) => {
      if (g === null) return null

      const Arrow = g === 0 ? null : g < 0 ? ArrowDownRight : ArrowUpRight
      const toneClasses =
        g < 0
          ? 'text-rose-700 bg-rose-50 border-rose-200/75'
          : g === 0
            ? 'text-gray-600 bg-gray-50 border-gray-200/80'
            : 'text-emerald-800 bg-emerald-50 border-emerald-200/65'

      return (
        <span
          className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-black tabular-nums ${toneClasses} ${className ?? ''}`}
          aria-label={`Compared to prior period: ${g} percent`}
        >
          {Arrow ? <Arrow className="h-3.5 w-3.5" strokeWidth={2.75} /> : null}
          {g}%
        </span>
      )
    }

    return (
      <div className="group flex min-h-[128px] min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-[box-shadow,border-color] hover:border-gray-200/90 hover:shadow-md sm:min-h-0 sm:gap-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex aspect-square shrink-0 items-center justify-center rounded-xl p-2.5 text-white shadow-sm shadow-black/[0.04] ring-1 ring-white/20 sm:p-3"
            style={{
              background: `linear-gradient(145deg, ${brandColor}, ${brandColorDark})`,
            }}
          >
            {React.createElement(icon, { className: 'h-[18px] w-[18px] sm:h-5 sm:w-5' })}
          </div>
          <GrowthBadge />
        </div>

        <div className="min-w-0 flex-1">
          {periodLabel ? (
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
              {periodLabel}
            </p>
          ) : null}
          <h3
            className={`text-[15px] font-bold leading-snug text-gray-900 sm:text-base ${periodLabel ? 'mt-1' : ''}`}
          >
            {title}
          </h3>
        </div>

        <p className="text-2xl font-bold tracking-tight text-gray-950 tabular-nums sm:text-3xl">
          {value}
        </p>
      </div>
    )
  }

  const TabButton = ({ id, label, icon }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex-1 min-w-[76px] flex flex-col items-center justify-center py-3 px-1 transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-inset ${
        activeTab === id ? 'text-gray-900 bg-gray-50' : 'text-gray-400'
      }`}
      style={activeTab === id ? { borderBottom: `3px solid ${brandColor}` } : {}}
    >
      {React.createElement(icon, {
        className: `w-5 h-5 mb-1 ${
          activeTab === id ? 'text-gray-900' : 'text-gray-400'
        }`,
        style: activeTab === id ? { color: brandColor } : {},
      })}
      <span
        className={`text-[10px] font-black uppercase tracking-tighter ${
          activeTab === id ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </button>
  )

  return (
    <div
      className="space-y-6 sm:space-y-8 pb-10"
      style={{
        ['--brand-primary']: brandColor,
        ['--brand-dark']: brandColorDark,
      }}
    >
      <div className="relative">
        <div className="sm:hidden space-y-4">
          <div className="flex overflow-x-auto bg-white/90 backdrop-blur-md rounded-2xl p-1 shadow-lg shadow-gray-100/50 border border-gray-200/70 sticky top-16 z-30 mb-6">
            <TabButton id="overview" label="Hub" icon={LayoutDashboard} />
            <TabButton id="checkins" label="Scans" icon={ScanLine} />
            <TabButton id="activity" label="Activity" icon={History} />
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <Motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <StatsGrid />
              </Motion.div>
            )}
            {activeTab === 'checkins' && (
              <Motion.div
                key="checkins"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <RecentCheckIns />
              </Motion.div>
            )}
            {activeTab === 'activity' && (
              <Motion.div
                key="activity"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <ActivityFeed />
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden sm:flex flex-col gap-8">
          <StatsGrid />
          <RecentCheckIns />
          <ActivityFeed />
        </div>
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-md rounded-[28px] border-gray-200 bg-white p-0 overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-6 py-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-black text-gray-900">
                Clear recent check-ins?
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 leading-6">
                This will remove the check-ins from the last 3 days for this spa.
                It also deletes those scan records from the database.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">
                Please be sure before you continue.
              </p>
              <p className="text-sm text-amber-800 mt-1">
                You cannot undo this action. Your customers will keep their total
                points, but the recent scan history from the last 3 days will be
                cleared.
              </p>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsResetDialogOpen(false)}
                disabled={isResettingCheckIns}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-black text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetRecentCheckIns}
                disabled={isResettingCheckIns}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResettingCheckIns ? 'Clearing...' : 'Yes, clear check-ins'}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SpaDashboard
