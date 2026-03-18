import { useBranding } from '@/context/BrandingContext'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronRight,
  DollarSign,
  History,
  LayoutDashboard,
  ScanLine,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const Motion = motion

const SpaDashboard = ({ data, refetch }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [currentCheckInPage, setCurrentCheckInPage] = useState(1)
  const [checkInRowsPerPage, setCheckInRowsPerPage] = useState(10)
  const {
    stats = {},
    analytics = {},
    liveActivity = [],
    recentQrClaims = [],
    recentQrClaimsSummary = {},
    currentBookings = [],
  } = data || {}
  const trendData = Array.isArray(analytics?.trendData)
    ? analytics.trendData
    : []
  const topServices = Array.isArray(analytics?.topServices)
    ? analytics.topServices
    : []

  const navigate = useNavigate()
  const { branding, locationId } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
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
  const brandColorLight = (() => {
    const cleaned = brandColor.replace('#', '')
    if (cleaned.length !== 6) return '#f9a8d4'
    const num = parseInt(cleaned, 16)
    const r = Math.min(255, ((num >> 16) & 255) + 40)
    const g = Math.min(255, ((num >> 8) & 255) + 40)
    const b = Math.min(255, (num & 255) + 40)
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  const COLORS = [
    brandColor,
    brandColorDark,
    brandColorLight,
    '#9ca3af',
    '#d1d5db',
  ]
  const latestQrClaim = recentQrClaims[0] || null
  const totalCheckInPages = Math.max(
    1,
    Math.ceil(recentQrClaims.length / checkInRowsPerPage)
  )
  const checkInStartIndex = (currentCheckInPage - 1) * checkInRowsPerPage
  const paginatedQrClaims = recentQrClaims.slice(
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
    if (typeof refetch === 'function') {
      await refetch()
    }
  }, [refetch])

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }

      handleRefresh()
    }, 30 * 1000)

    return () => clearInterval(interval)
  }, [handleRefresh])

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

  const getClaimedCustomerName = (claim) => {
    return claim?.customer?.name || claim?.scannedByEmail || 'Guest visitor'
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

  const chartData = trendData.map((item) => ({
    name:
      typeof item?._id === 'string'
        ? item._id.split('-').slice(1).join('/')
        : 'N/A',
    bookings: item?.bookings || 0,
    revenue: item?.revenue || 0,
  }))

  const serviceData = topServices.map((item, index) => ({
    name: item?._id || 'Unknown',
    value: item?.count || 0,
    color: COLORS[index % COLORS.length],
  }))

  const filteredLiveActivity = liveActivity.filter((activity) => {
    const payment = activity?.paymentId
    const paymentLivemode =
      payment && typeof payment === 'object' ? payment?.livemode : undefined

    return !(
      activity?.paymentStatus !== 'paid' ||
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
        title="Total Clients"
        value={stats.totalClients}
        icon={Users}
        growth={stats.clientGrowth}
      />
      <StatCard
        title="Visits"
        value={stats.totalVisits}
        icon={UserCheck}
        growth={stats.visitGrowth}
      />
      <StatCard
        title="Members"
        value={stats.activeMemberships}
        icon={TrendingUp}
        growth={stats.membershipGrowth}
      />
      <StatCard
        title="Revenue"
        value={`$${trendData.reduce(
          (acc, curr) => acc + (curr.revenue || 0),
          0
        )}`}
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
                Last {recentQrClaimsSummary?.days || 3} days
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gray-50 px-4 py-3 border border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Claims
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {recentQrClaimsSummary?.totalClaims || 0}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 border border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Visitors
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {recentQrClaimsSummary?.uniqueVisitors || 0}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 border border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Latest
              </p>
              <p className="text-sm font-black text-gray-900 mt-2 leading-tight">
                {recentQrClaimsSummary?.latestClaimAt
                  ? formatRelativeTime(recentQrClaimsSummary.latestClaimAt)
                  : 'No scans'}
              </p>
            </div>
          </div>
        </div>

        {latestQrClaim ? (
          <button
            type="button"
            onClick={() => openClientProfile(latestQrClaim)}
            className="w-full text-left rounded-[28px] border border-[color:var(--brand-primary)/0.14] bg-gradient-to-br from-white via-[color:var(--brand-primary)/0.04] to-[color:var(--brand-primary)/0.1] p-5 sm:p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-[color:var(--brand-primary)/0.16] flex items-center justify-center text-[color:var(--brand-primary)] font-black overflow-hidden shrink-0">
                  {latestQrClaim.customer?.avatar ? (
                    <img
                      src={latestQrClaim.customer.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (
                      getClaimedCustomerName(latestQrClaim).charAt(0) || '?'
                    ).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--brand-primary)]">
                    Latest customer scan
                  </p>
                  <h3 className="text-2xl font-black text-gray-900 truncate mt-1">
                    {getClaimedCustomerName(latestQrClaim)}
                  </h3>
                  <p className="text-sm text-gray-500 font-bold truncate mt-1">
                    {latestQrClaim.customer?.email ||
                      latestQrClaim.scannedByEmail}
                  </p>
                  <p className="text-xs text-gray-400 font-bold mt-2">
                    Claimed {latestQrClaim.pointsAwarded} points{' '}
                    {formatRelativeTime(latestQrClaim.claimedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start lg:items-end gap-3">
                <RewardSummaryChips
                  rewardSummary={latestQrClaim.activeRewardSummary}
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
              New QR claims from the last {recentQrClaimsSummary?.days || 3}{' '}
              days will appear here automatically.
            </p>
          </div>
        )}

        <div className="rounded-[28px] border border-gray-100 overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_120px_160px_52px] gap-4 bg-gray-50 px-5 py-4 border-b border-gray-100">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Customer
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Active rewards
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Points
            </span>
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
                  <RewardSummaryChips
                    rewardSummary={claim.activeRewardSummary}
                    compact
                  />
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                    <span>{formatDate(claim.claimedAt)}</span>
                    <span>{formatRelativeTime(claim.claimedAt)}</span>
                  </div>
                </div>

                <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_120px_160px_52px] gap-4 items-center">
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

          {recentQrClaims.length > 0 && (
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
                    recentQrClaims.length
                  )}{' '}
                  of {recentQrClaims.length}
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

  const AnalyticsSection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
      <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${brandColor}15` }}
          >
            <BarChart3 className="w-5 h-5" style={{ color: brandColor }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Execution Trend</h2>
        </div>
        <div className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="colorBookings"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={brandColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                }}
              />
              <Area
                type="monotone"
                dataKey="bookings"
                stroke={brandColor}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorBookings)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
        <h2 className="text-xl font-bold text-gray-900 self-start mb-6">
          Services
        </h2>
        <div className="h-[200px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={serviceData}
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {serviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xl font-black text-gray-900 leading-none">
                {serviceData.reduce((acc, curr) => acc + curr.value, 0)}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                Total
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-2 w-full px-2">
          {serviceData.slice(0, 3).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs font-bold text-gray-600"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate max-w-[100px]">{item.name}</span>
              </div>
              <span>{item.value}</span>
            </div>
          ))}
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
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
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
                {activity.serviceName}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    activity.status === 'completed'
                      ? 'bg-[color:var(--brand-primary)/0.15] text-[color:var(--brand-primary)]'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {activity.status}
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

  const ScheduleList = () => (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-8">
        <div
          className="p-2 rounded-xl"
          style={{ backgroundColor: `${brandColor}15` }}
        >
          <Calendar className="w-5 h-5" style={{ color: brandColor }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Daily Schedule</h2>
      </div>
      <div className="space-y-4">
        {currentBookings.map((booking) => (
          <div
            key={booking._id}
            className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200/70 bg-white hover:bg-[color:var(--brand-primary)/0.06] transition-all"
          >
            <div className="text-center min-w-[50px] bg-[color:var(--brand-primary)/0.12] rounded-xl py-2">
              <p className="text-[10px] font-black text-[color:var(--brand-primary)] uppercase leading-none">
                {booking.time.split(' ')[1]}
              </p>
              <p className="text-lg font-black text-gray-900 leading-none mt-1">
                {booking.time.split(' ')[0]}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 truncate text-sm">
                {booking.serviceName}
              </p>
              <p className="text-xs text-gray-500 font-bold">
                {booking.userId?.name}
              </p>
            </div>
            <div
              className={`p-2 rounded-xl flex-shrink-0 ${
                booking.status === 'confirmed'
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400'
              }`}
              style={
                booking.status === 'confirmed'
                  ? {
                      background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})`,
                    }
                  : {}
              }
            >
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        ))}
        {currentBookings.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200/70">
              <Calendar className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
              Everything is clear
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const StatCard = ({ title, value, icon, growth }) => (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="p-2 sm:p-3 rounded-xl text-white"
          style={{
            background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})`,
          }}
        >
          {React.createElement(icon, { className: 'w-4 h-4 sm:w-5 sm:h-5' })}
        </div>
        <p className="text-xs sm:text-sm font-bold text-gray-500 truncate">
          {title}
        </p>
      </div>
      <div className="flex items-end justify-between">
        <h3 className="text-xl sm:text-3xl font-bold text-gray-900 leading-none">
          {value}
        </h3>
        {growth !== undefined && (
          <div className="flex items-center gap-0.5 text-[color:var(--brand-primary)] font-black text-[10px] sm:text-xs bg-[color:var(--brand-primary)/0.12] px-1.5 py-0.5 rounded-lg border border-[color:var(--brand-primary)/0.2]">
            <ArrowUpRight className="w-3 h-3" />
            {growth}%
          </div>
        )}
      </div>
    </Motion.div>
  )

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
            <TabButton id="analytics" label="Charts" icon={BarChart3} />
            <TabButton id="activity" label="Feed" icon={History} />
            <TabButton id="schedule" label="Today" icon={Calendar} />
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
            {activeTab === 'analytics' && (
              <Motion.div
                key="analytics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AnalyticsSection />
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
            {activeTab === 'schedule' && (
              <Motion.div
                key="schedule"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <ScheduleList />
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden sm:flex flex-col gap-8">
          <StatsGrid />
          <RecentCheckIns />
          <AnalyticsSection />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ActivityFeed />
            <ScheduleList />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpaDashboard
