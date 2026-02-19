import { useBranding } from '@/context/BrandingContext'
import { useReferralUsersAnalytics, useRegenerateReferralCode } from '@/hooks/useReferral'
import { selectCurrentUser } from '@/redux/userSlice'
import { Loader2, Search, Sparkles, Users } from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import Layout from '../Layout/Layout'

const tabItems = [{ id: 'users', label: 'User Analytics', icon: Users }]

const toBrandDark = (brandColor) => {
  const cleaned = (brandColor || '#ec4899').replace('#', '')
  if (cleaned.length !== 6) return '#b0164e'
  const num = parseInt(cleaned, 16)
  const r = Math.max(0, ((num >> 16) & 255) - 24)
  const g = Math.max(0, ((num >> 8) & 255) - 24)
  const b = Math.max(0, (num & 255) - 24)
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const fmtDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const fmtNumber = (value) => (Number.isFinite(value) ? value : 0)

const ManageReferralPage = () => {
  const currentUser = useSelector(selectCurrentUser)
  const role = currentUser?.role
  const isSuperAdmin = role === 'super-admin'
  const isSpaUser = role === 'spa'
  const { branding } = useBranding()

  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = toBrandDark(brandColor)

  const [activeTab, setActiveTab] = useState('users')

  const [usersFilters, setUsersFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'invitedCount',
    sortOrder: 'desc',
  })

  const { data: usersData, isLoading: usersLoading } = useReferralUsersAnalytics(
    usersFilters
  )
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [confirmUser, setConfirmUser] = useState(null)
  const regenerateMutation = useRegenerateReferralCode({
    onSuccess: () => setRegeneratingId(null),
    onError: () => setRegeneratingId(null),
  })
  const activeCodesOnPage =
    usersData?.users?.filter((user) => user.referralCode)?.length || 0

  const tableShell =
    'rounded-[1.4rem] border border-gray-200/70 bg-white/85 backdrop-blur-md overflow-hidden'

  return (
    <Layout>
      <div
        className='min-h-screen bg-gradient-to-br from-[color:var(--brand-primary)/0.08] to-white pb-16'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        <div className='max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-6'>
          <div className='relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white p-6 md:p-10 shadow-xl shadow-[color:var(--brand-primary)/0.25]'>
            <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-10' />
            <div className='relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div>
                <div className='inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-3'>
                  <Sparkles size={12} />
                  Referral Management
                </div>
                <h1 className='text-3xl md:text-5xl font-black tracking-tight'>
                  Referral Analytics
                </h1>
                <p className='text-white/90 mt-2 text-sm md:text-base font-medium'>
                  {isSuperAdmin
                    ? 'Platform-wide referral analytics and user performance.'
                    : 'Track referrals, performance, and reward outcomes.'}
                </p>
              </div>

              <div className='grid grid-cols-2 gap-3 md:min-w-[260px]'>
                <div className='rounded-2xl bg-white/15 border border-white/25 p-3 text-center'>
                  <div className='text-2xl font-black'>
                    {usersData?.pagination?.totalItems || 0}
                  </div>
                  <div className='text-[11px] uppercase tracking-wider text-white/85'>
                    Users
                  </div>
                </div>
                <div className='rounded-2xl bg-white text-[color:var(--brand-primary)] p-3 text-center shadow-md'>
                  <div className='text-2xl font-black'>
                    {activeCodesOnPage}
                  </div>
                  <div className='text-[11px] uppercase tracking-wider font-bold'>
                    Codes (Page)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='flex flex-wrap gap-2'>
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'border-transparent bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white shadow-md shadow-[color:var(--brand-primary)/0.25]'
                    : 'border-gray-200 bg-white/80 text-gray-600 hover:text-[color:var(--brand-primary)]'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'users' && (
            <div className='space-y-4'>
              <div className='flex flex-col md:flex-row gap-3'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={16} />
                  <input
                    value={usersFilters.search}
                    onChange={(e) =>
                      setUsersFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
                    }
                    placeholder='Search user, email, or referral code'
                    className='w-full rounded-xl border border-gray-200 bg-white/85 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)/0.35]'
                  />
                </div>
                <select
                  value={usersFilters.sortBy}
                  onChange={(e) =>
                    setUsersFilters((prev) => ({ ...prev, sortBy: e.target.value, page: 1 }))
                  }
                  className='rounded-xl border border-gray-200 bg-white/85 px-3 py-2.5 text-sm'
                >
                  <option value='invitedCount'>Sort: Invites</option>
                  <option value='completedCount'>Sort: Completed</option>
                  <option value='conversionRate'>Sort: Conversion</option>
                  <option value='totalPointsEarned'>Sort: Earnings</option>
                  <option value='name'>Sort: Name</option>
                </select>
              </div>

              <div className={tableShell}>
                {usersLoading ? (
                  <div className='p-8 text-center text-gray-500 text-sm'>
                    <Loader2 className='animate-spin mx-auto mb-2' size={18} />
                    Loading user analytics...
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead className='bg-[color:var(--brand-primary)/0.08] text-gray-600 uppercase text-xs tracking-wider'>
                        <tr>
                          <th className='text-left px-4 py-3'>User</th>
                          <th className='text-left px-4 py-3'>Code</th>
                          <th className='text-left px-4 py-3'>Invited</th>
                          <th className='text-left px-4 py-3'>Completed</th>
                          <th className='text-left px-4 py-3'>Conversion</th>
                          <th className='text-left px-4 py-3'>Tier</th>
                          <th className='text-left px-4 py-3'>Earned</th>
                          <th className='text-left px-4 py-3'>Last Invite</th>
                          {!isSpaUser && (
                            <th className='text-left px-4 py-3'>Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100'>
                        {(usersData?.users || []).map((user) => (
                          <tr key={user.userId} className='hover:bg-gray-50/70'>
                            <td className='px-4 py-3'>
                              <div className='font-semibold text-gray-900'>{user.name || '-'}</div>
                              <div className='text-xs text-gray-500'>{user.email || '-'}</div>
                            </td>
                            <td className='px-4 py-3 font-mono font-bold text-[color:var(--brand-primary)]'>
                              {user.referralCode || '-'}
                            </td>
                            <td className='px-4 py-3 font-semibold'>{fmtNumber(user.invitedCount)}</td>
                            <td className='px-4 py-3'>{fmtNumber(user.completedCount)}</td>
                            <td className='px-4 py-3'>{fmtNumber(user.conversionRate)}%</td>
                            <td className='px-4 py-3 capitalize'>{user.currentTier || 'bronze'}</td>
                            <td className='px-4 py-3'>{fmtNumber(user.totalPointsEarned)}</td>
                            <td className='px-4 py-3'>{fmtDate(user.lastReferralAt)}</td>
                            {!isSpaUser && (
                              <td className='px-4 py-3'>
                                <button
                                  onClick={() => {
                                    if (!user.userId) return
                                    setConfirmUser(user)
                                  }}
                                  disabled={
                                    regenerateMutation.isPending &&
                                    regeneratingId === user.userId
                                  }
                                  className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-[color:var(--brand-primary)] hover:border-[color:var(--brand-primary)/0.6] disabled:opacity-50'
                                >
                                  {regeneratingId === user.userId
                                    ? 'Regenerating...'
                                    : 'Regenerate'}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-xs text-gray-500'>
                  Page {usersData?.pagination?.currentPage || 1} of{' '}
                  {usersData?.pagination?.totalPages || 1}
                </span>
                <div className='flex gap-2'>
                  <button
                    onClick={() =>
                      setUsersFilters((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1),
                      }))
                    }
                    disabled={(usersData?.pagination?.currentPage || 1) <= 1}
                    className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs disabled:opacity-50'
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setUsersFilters((prev) => ({
                        ...prev,
                        page: Math.min(
                          usersData?.pagination?.totalPages || 1,
                          prev.page + 1
                        ),
                      }))
                    }
                    disabled={
                      (usersData?.pagination?.currentPage || 1) >=
                      (usersData?.pagination?.totalPages || 1)
                    }
                    className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs disabled:opacity-50'
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmUser && (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
              <div className='w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl'>
                <div className='text-lg font-black text-gray-900 mb-2'>
                  Regenerate referral code?
                </div>
                <p className='text-sm text-gray-600'>
                  This will create a new referral code for{' '}
                  <span className='font-semibold text-gray-900'>
                    {confirmUser.name || 'this user'}
                  </span>
                  . Existing referral stats and earnings stay the same.
                </p>
                <div className='mt-5 flex gap-3'>
                  <button
                    onClick={() => setConfirmUser(null)}
                    className='flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setRegeneratingId(confirmUser.userId)
                      regenerateMutation.mutate({ userId: confirmUser.userId })
                      setConfirmUser(null)
                    }}
                    className='flex-1 rounded-xl bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] px-4 py-2 text-sm font-semibold text-white'
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  )
}

export default ManageReferralPage
