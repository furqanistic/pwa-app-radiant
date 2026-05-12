import { Button } from '@/components/ui/button'
import { useBranding } from '@/context/BrandingContext'
import { locationService } from '@/services/locationService'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BadgeCent,
  BadgeCheck,
  Bell,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Coins,
  Coffee,
  Crown,
  Filter,
  Gift,
  HeartHandshake,
  Image,
  LayoutGrid,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '@/pages/Layout/Layout'

const METHOD_CATEGORIES = [
  { key: 'all', label: 'All Rules', icon: LayoutGrid },
  { key: 'referrals', label: 'Referrals', icon: UserPlus },
  { key: 'engagement', label: 'Engagement', icon: HeartHandshake },
  { key: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { key: 'visits', label: 'Visits', icon: Coffee },
  { key: 'milestones', label: 'Milestones', icon: Target },
  { key: 'penalties', label: 'Penalties', icon: AlertCircle },
]

const METHOD_CATEGORY_MAP = {
  referral: 'referrals',
  share_referral_link: 'referrals',
  referral_buys_package: 'referrals',
  bring_friend_same_day_booking: 'referrals',
  booking: 'visits',
  purchase: 'purchases',
  review: 'engagement',
  daily_check_in: 'engagement',
  weekly_streak: 'engagement',
  monthly_streak: 'engagement',
  profile_completion: 'engagement',
  add_birthday: 'engagement',
  enable_push_notifications: 'engagement',
  quick_skin_goals_quiz: 'engagement',
  confirm_appointment_within_2h: 'visits',
  show_up_to_appointment: 'visits',
  on_time_arrival: 'visits',
  rebook_within_48_hours: 'visits',
  rebook_within_7_days: 'visits',
  add_on_any_service: 'purchases',
  upgrade_higher_tier_service: 'purchases',
  buy_package_or_bundle: 'purchases',
  hit_3_visits_30_days: 'milestones',
  hit_6_visits_90_days: 'milestones',
  birthday_bonus: 'milestones',
  win_back_inactive_30_days: 'milestones',
  upload_progress_photo: 'engagement',
  wellness_check_in: 'engagement',
  no_show_or_late_cancel_penalty: 'penalties',
  no_show_penalty_stronger: 'penalties',
}

const CATEGORY_META = {
  referrals: { gradient: 'from-fuchsia-500 to-violet-500', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700' },
  engagement: { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  purchases: { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  visits: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  milestones: { gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  penalties: { gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
}

const clampChannel = (v) => Math.max(0, Math.min(255, v))

const adjustHex = (hex, amount) => {
  if (!hex) return '#ec4899'
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#ec4899'
  const n = parseInt(c, 16)
  const r = clampChannel(((n >> 16) & 255) + amount)
  const g = clampChannel(((n >> 8) & 255) + amount)
  const b = clampChannel((n & 255) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const hexToRgba = (hex, a = 1) => {
  if (!hex || typeof hex !== 'string') return `rgba(236,72,153,${a})`
  const c = hex.replace('#', '')
  if (c.length !== 6) return `rgba(236,72,153,${a})`
  const n = Number.parseInt(c, 16) || 0
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

const cloneMethods = (m = []) => (Array.isArray(m) ? m.map((x) => ({ ...x })) : [])

const buildLabel = (m, v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return m?.pointsLabel || ''
  if (m?.perDollar) return `${n > 0 ? '+' : ''}${n}/$1`
  return n > 0 ? `+${n}` : `${n}`
}

const resolveLocation = (locations = [], user = null) => {
  if (!locations.length) return null
  const prefs = [user?.selectedLocation?.locationId, user?.spaLocation?.locationId].filter(Boolean)
  for (const id of prefs) {
    const loc = locations.find((l) => l?.locationId === id)
    if (loc?._id) return loc._id
  }
  return locations[0]?._id || null
}

const SPA_KEYS = ['referral', 'share_referral_link', 'booking', 'purchase']

const TABS = [
  { key: 'rules', label: 'Earning Rules', icon: Award },
  { key: 'cashback', label: 'Cashback Redemption', icon: BadgeCent, adminOnly: true },
  { key: 'preview', label: 'Member Preview', icon: Star },
]

export default function PointsSettingsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentUser } = useSelector((s) => s.user)
  const { branding } = useBranding()
  const isSpa = currentUser?.role === 'spa'
  const isAdmin = currentUser?.role === 'super-admin'
  const color = branding?.themeColor || '#ec4899'
  const colorDark = adjustHex(color, -24)
  const soft = hexToRgba(color, 0.14)
  const softer = hexToRgba(color, 0.07)

  const [tab, setTab] = useState('rules')
  const [methods, setMethods] = useState([])
  const [dirty, setDirty] = useState(false)
  const [cashback, setCashback] = useState({ isEnabled: false, pointsStep: 100, dollarValue: 5 })
  const [progress, setProgress] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [locId, setLocId] = useState(null)
  const local = useRef(false)

  const { data: locsData } = useQuery({ queryKey: ['locations'], queryFn: () => locationService.getAllLocations() })
  const locations = locsData?.data?.locations || []

  const selected = useMemo(() => locations.find((l) => l?._id === locId) || null, [locations, locId])

  useEffect(() => {
    if (!locations.length) return
    setLocId((p) => p || resolveLocation(locations, currentUser))
  }, [locations, currentUser])

  useEffect(() => {
    const inc = selected?.pointsSettings?.methods
    if (!inc) return
    if (local.current) return
    setMethods(cloneMethods(isSpa ? inc.filter((m) => SPA_KEYS.includes(m.key)) : inc))
    const pr = selected?.pointsRedemption || {}
    setCashback({ isEnabled: pr.isEnabled ?? false, pointsStep: pr.pointsStep ?? 100, dollarValue: pr.dollarValue ?? 5 })
    setDirty(false)
  }, [selected, isSpa])

  const mutation = useMutation({
    mutationFn: (data) => locationService.updateLocation(locId, data),
    onSuccess: () => {
      local.current = false; setDirty(false)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'data'] })
      toast.success('Points settings updated!')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  })
  const saving = mutation.isPending

  useEffect(() => {
    if (!saving) { setProgress(0); return }
    setProgress(12)
    const t = setInterval(() => setProgress((p) => (p >= 92 ? p : p + (p < 60 ? 12 : 4))), 180)
    return () => clearInterval(t)
  }, [saving])

  const toggle = (i) => {
    if (saving) return; local.current = true
    setMethods((p) => { const u = [...p]; u[i] = { ...u[i], isActive: !u[i].isActive }; return u })
    setDirty(true)
  }

  const change = (i, f, v) => {
    if (saving) return; local.current = true
    setMethods((p) => {
      const u = [...p]
      const n = { ...u[i], [f]: v }
      if (f === 'pointsValue') n.pointsLabel = buildLabel(n, v)
      u[i] = n
      return u
    })
    setDirty(true)
  }

  const setAll = (enabled) => { if (saving) return; local.current = true; setMethods((p) => p.map((m) => ({ ...m, isActive: enabled }))); setDirty(true) }

  const save = async () => {
    if (!locId || saving) return
    const payload = { pointsSettings: { methods } }
    if (isAdmin) payload.pointsRedemption = cashback
    await mutation.mutateAsync(payload)
    setProgress(100)
    setTimeout(() => setProgress(0), 500)
  }

  const discard = () => {
    local.current = false; setDirty(false)
    const inc = selected?.pointsSettings?.methods
    if (inc) setMethods(cloneMethods(isSpa ? inc.filter((m) => SPA_KEYS.includes(m.key)) : inc))
    const pr = selected?.pointsRedemption || {}
    setCashback({ isEnabled: pr.isEnabled ?? false, pointsStep: pr.pointsStep ?? 100, dollarValue: pr.dollarValue ?? 5 })
    toast.info('Changes discarded')
  }

  const filtered = useMemo(() => {
    let list = methods
    if (category !== 'all') list = list.filter((m) => METHOD_CATEGORY_MAP[m.key] === category)
    if (status === 'enabled') list = list.filter((m) => m.isActive)
    if (status === 'disabled') list = list.filter((m) => !m.isActive)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((m) => [m.title, m.description, m.key, m.pointsLabel, m.frequency, m.verification, m.notes].filter(Boolean).join(' ').toLowerCase().includes(q))
    return list
  }, [methods, category, status, search])

  const counts = useMemo(() => {
    const c = { all: methods.length }
    methods.forEach((m) => { const k = METHOD_CATEGORY_MAP[m.key] || 'engagement'; c[k] = (c[k] || 0) + 1 })
    return c
  }, [methods])

  const totalEnabled = useMemo(() => methods.filter((m) => m.isActive).length, [methods])

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <Layout>
      <div className="min-h-screen bg-[#f8fafc]">
        {/* Brand accent line */}
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${color}, ${colorDark})` }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          {/* ── HEADER ── */}
          <div className="mb-8">
            <button onClick={() => navigate('/management')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-slate-700 transition-colors mb-4">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Management
            </button>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight text-slate-900">Points Settings</h1>
                <p className="mt-1.5 text-[15px] text-slate-500">Configure earning rules, cashback rates, and loyalty mechanics.</p>
              </div>
              <select
                value={locId || ''}
                onChange={(e) => { local.current = false; setLocId(e.target.value || null); setSearch(''); setCategory('all'); setStatus('all') }}
                disabled={saving || locations.length < 2}
                className="h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 disabled:opacity-50 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, '--tw-ring-color': soft }}

              >
                {locations.map((l) => <option key={l._id} value={l._id}>{l.name || l.locationId}</option>)}
              </select>
            </div>
          </div>

          {/* ── STATS ROW ── */}
          {methods.length > 0 && (
            <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Total Rules', value: methods.length, color: 'text-slate-900' },
                { label: 'Enabled', value: totalEnabled, accent: true },
                { label: 'Disabled', value: methods.length - totalEnabled, color: 'text-slate-400' },
                { label: 'Positive', value: methods.filter((m) => m.isActive && (m.pointsValue || 0) > 0).length, color: 'text-emerald-600' },
                { label: 'Penalties', value: methods.filter((m) => m.isActive && (m.pointsValue || 0) < 0).length, color: 'text-red-500' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{s.label}</p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight" style={s.accent ? { color } : {}}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── TABS ── */}
          <div className="mb-8">
            <div className="flex gap-6 border-b border-slate-200">
              {visibleTabs.map((t) => {
                const active = tab === t.key
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`relative pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                    {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: color }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ════════════════════════════════════ EARNING RULES ════════════════════════════════════ */}
          {tab === 'rules' && (
            <div>
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search rules by name, description, or keyword..."
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow"
                      style={{ '--tw-ring-color': soft }}
                    />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
                  </div>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': soft }}
                  >
                    <option value="all">All Status</option>
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {METHOD_CATEGORIES.map((c) => {
                    const active = category === c.key
                    const Icon = c.icon
                    return (
                      <button key={c.key} onClick={() => setCategory(c.key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${active ? 'text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                        style={active ? { backgroundColor: color, borderColor: color } : {}}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {c.label}
                        <span className={`ml-0.5 inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{counts[c.key] || 0}</span>
                      </button>
                    )
                  })}
                </div>

                {isSpa && (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                    <p className="text-xs font-medium text-amber-700 flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      You can only edit the rules shown in the member dashboard "Earn More Points" section.
                    </p>
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">{filtered.length} rule{filtered.length !== 1 ? 's' : ''} found</p>
                    <div className="flex gap-2">
                      <button onClick={() => setAll(true)} disabled={saving || !methods.length}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-50">Enable All</button>
                      <button onClick={() => setAll(false)} disabled={saving || !methods.length}
                        className="px-3 py-1.5 bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50">Disable All</button>
                    </div>
                  </div>
                )}
              </div>

              {!locations.length ? (
                <div className="text-center py-24"><MapPin className="mx-auto h-10 w-10 text-slate-200 mb-4" /><p className="text-sm font-semibold text-slate-500">No locations found.</p></div>
              ) : !filtered.length ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200"><Search className="mx-auto h-9 w-9 text-slate-200 mb-3" /><p className="text-sm font-semibold text-slate-500">No matches</p><p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p></div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((method) => {
                    const idx = methods.findIndex((m) => m === method)
                    const cat = METHOD_CATEGORY_MAP[method.key] || 'engagement'
                    const meta = CATEGORY_META[cat] || {}
                    return (
                      <div key={method.key || idx}
                        className="group rounded-xl border border-slate-200 bg-white px-5 py-4 transition-all hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] hover:border-slate-300"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.border} border`}>
                              <Zap className="h-4 w-4" style={{ color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 truncate">{method.title}</h4>
                                {method.pointsLabel && (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${method.isActive ? `${meta.bg} ${meta.text}` : 'bg-slate-100 text-slate-500'}`}>
                                    <Coins className="h-3 w-3" />
                                    {method.pointsLabel} pts
                                  </span>
                                )}
                                {method.perDollar && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">per $</span>}
                                {!method.isActive && <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1.5">Disabled</span>}
                              </div>
                              <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{method.description}</p>
                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                {method.frequency && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"><Clock className="h-3 w-3" />{method.frequency}</span>}
                                {method.verification && <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600 border border-indigo-100"><CheckCircle className="h-3 w-3" />{method.verification}</span>}
                              </div>
                              {method.notes && <p className="mt-2 text-[12px] text-slate-400 italic">{method.notes}</p>}
                              {method.key === 'on_time_arrival' && (
                                <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-[12px] font-medium text-slate-600">On-Time Window:</span>
                                  <input type="number" min="0" value={method.windowMinutes || 0} disabled={saving}
                                    onChange={(e) => change(idx, 'windowMinutes', parseInt(e.target.value || '0', 10))}
                                    className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-slate-300"
                                  />
                                  <span className="text-[12px] text-slate-500">minutes</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {typeof method.pointsValue === 'number' && (
                              <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{method.perDollar ? 'pts/$1' : 'pts'}</span>
                                <input type="number" min="-1000" value={method.pointsValue} disabled={saving}
                                  onChange={(e) => change(idx, 'pointsValue', parseInt(e.target.value || '0', 10))}
                                  className="w-14 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-slate-300"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                            <button onClick={() => toggle(idx)} disabled={saving}
                              className={`relative h-7 w-12 shrink-0 rounded-full transition-all ${method.isActive ? 'shadow-sm' : 'bg-slate-200'} ${saving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                              style={method.isActive ? { backgroundColor: color } : {}}
                            >
                              <div className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${method.isActive ? 'translate-x-5' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════ CASHBACK ════════════════════════════════════ */}
          {tab === 'cashback' && isAdmin && (
            <div className="grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: softer }}>
                      <BadgeCent className="h-5 w-5" style={{ color }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Cashback Redemption</h2>
                      <p className="text-sm text-slate-500">Let members redeem points for a dollar discount at checkout.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Enable Cashback</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Show "Use Points" option at service checkout</p>
                    </div>
                    <button onClick={() => { setCashback((p) => ({ ...p, isEnabled: !p.isEnabled })); setDirty(true) }} disabled={saving}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-all ${cashback.isEnabled ? 'shadow-sm' : 'bg-slate-200'} ${saving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      style={cashback.isEnabled ? { backgroundColor: color } : {}}
                    >
                      <div className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${cashback.isEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
                  <h3 className="text-sm font-semibold text-slate-900 mb-5">Redemption Rate</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">Points Required</label>
                      <div className="flex items-center gap-3">
                        <input type="number" min="1" value={cashback.pointsStep} disabled={saving}
                          onChange={(e) => { setCashback((p) => ({ ...p, pointsStep: Math.max(1, Number(e.target.value || 1)) })); setDirty(true) }}
                          className="w-full max-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xl font-bold text-slate-800 text-center focus:outline-none focus:ring-2 transition-shadow"
                          style={{ '--tw-ring-color': soft }}
                        />
                        <span className="text-sm font-medium text-slate-500">points</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">Discount Value</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-slate-300">$</span>
                        <input type="number" min="1" step="0.01" value={cashback.dollarValue} disabled={saving}
                          onChange={(e) => { setCashback((p) => ({ ...p, dollarValue: Math.max(1, Number(e.target.value || 1)) })); setDirty(true) }}
                          className="w-full max-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xl font-bold text-slate-800 text-center focus:outline-none focus:ring-2 transition-shadow"
                          style={{ '--tw-ring-color': soft }}
                        />
                        <span className="text-sm font-medium text-slate-500">off</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] overflow-hidden sticky top-24">
                  <div className="p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-4 w-4" style={{ color }} />
                      <h3 className="text-sm font-bold text-slate-900">Live Preview</h3>
                    </div>
                    {cashback.isEnabled ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500">How it appears to members at checkout:</p>
                        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Redeem Points</span>
                            <BadgeCent className="h-4 w-4 text-slate-300" />
                          </div>
                          <div className="space-y-2">
                            {[1, 2, 3, 4].map((step) => (
                              <div key={step}
                                className="flex items-center justify-between rounded-lg bg-white border border-slate-100 px-3.5 py-2.5 hover:border-slate-200 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: step === 1 ? color : '#cbd5e1' }} />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700">{step * cashback.pointsStep.toLocaleString()} pts</span>
                                </div>
                                <span className="text-sm font-bold text-emerald-600">-${(step * cashback.dollarValue).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Rate: every <span className="font-semibold text-slate-600">{cashback.pointsStep} pts</span> = <span className="font-semibold text-slate-600">${Number(cashback.dollarValue).toFixed(2)} off</span>. Members choose from multiples at checkout.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <BadgeCent className="mx-auto h-8 w-8 text-slate-200 mb-3" />
                        <p className="text-sm font-semibold text-slate-500">Cashback is off</p>
                        <p className="text-xs text-slate-400 mt-1">Enable it to see a live preview.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════ MEMBER PREVIEW ════════════════════════════════════ */}
          {tab === 'preview' && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: softer }}>
                      <Star className="h-5 w-5" style={{ color }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Member Experience Preview</h2>
                      <p className="text-sm text-slate-500">See your configuration from a member's perspective.</p>
                    </div>
                  </div>
                </div>

                {/* Points Card */}
                <div className="rounded-2xl p-6 md:p-8 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${color}, ${colorDark})` }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">Available Balance</span>
                      <p className="text-5xl md:text-6xl font-black tracking-tight mt-2">
                        {methods.filter((m) => m.isActive).reduce((s, m) => s + Math.max(0, m.pointsValue || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-sm font-semibold opacity-70 mt-1 uppercase tracking-[0.15em]">Loyalty Points</p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3.5 py-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{totalEnabled} earning rules active</span>
                    </div>
                  </div>
                </div>

                {/* Ways to Earn */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
                  <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Ways to Earn Points
                  </h3>
                  {methods.filter((m) => m.isActive && (m.pointsValue || 0) > 0).length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {methods.filter((m) => m.isActive && (m.pointsValue || 0) > 0).slice(0, 8).map((m) => (
                        <div key={m.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                              <Zap className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">{m.title}</span>
                          </div>
                          <span className="text-sm font-bold rounded-lg px-2.5 py-1" style={{ backgroundColor: softer, color }}>{m.pointsLabel} pts</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-6">No active earning rules configured.</p>
                  )}
                </div>

                {/* Cashback Preview */}
                {cashback.isEnabled && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
                    <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                      <BadgeCent className="h-4 w-4" style={{ color }} />
                      Cashback at Checkout
                    </h3>
                    <p className="text-sm text-slate-500 mb-5">Every <span className="font-semibold text-slate-700">{cashback.pointsStep} points</span> = <span className="font-semibold text-slate-700">${Number(cashback.dollarValue).toFixed(2)} off</span>. Choose from:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:shadow-sm hover:border-slate-300 transition-all">
                          <p className="text-xl font-bold text-slate-800">{step * cashback.pointsStep.toLocaleString()}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">points</p>
                          <div className="mt-2 h-px bg-slate-100" />
                          <p className="text-sm font-bold text-emerald-600 mt-2">-${(step * cashback.dollarValue).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!cashback.isEnabled && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <BadgeCent className="mx-auto h-8 w-8 text-slate-200 mb-3" />
                    <p className="text-sm font-semibold text-slate-500">Cashback is disabled</p>
                    <p className="text-xs text-slate-400 mt-1">Switch to the Cashback tab to enable it.</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sticky top-24">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Configuration Summary</h3>
                  <div className="space-y-3.5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Earning Rules</p>
                      <p className="text-xl font-bold" style={{ color }}>{totalEnabled}</p>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Penalty Rules</p>
                      <p className="text-xl font-bold text-slate-800">{methods.filter((m) => m.isActive && (m.pointsValue || 0) < 0).length}</p>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cashback</p>
                      <p className={`text-xl font-bold ${cashback.isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>{cashback.isEnabled ? 'Active' : 'Off'}</p>
                    </div>
                    {cashback.isEnabled && (
                      <>
                        <div className="h-px bg-slate-100" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Redemption Rate</p>
                          <p className="text-lg font-bold text-slate-800">{cashback.pointsStep} pts = ${Number(cashback.dollarValue).toFixed(2)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FLOATING SAVE BAR ── */}
          <div className={`fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur-lg supports-[backdrop-filter]:bg-white/80 transition-all duration-300 ${dirty ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
                </span>
                <span className="text-sm font-medium text-slate-700">Unsaved changes</span>
              </div>
              <div className="flex items-center gap-3">
                {saving && (
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-28 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-200" style={{ background: `linear-gradient(90deg, ${color}, ${colorDark})`, width: `${Math.max(8, Math.min(100, progress))}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">{progress}%</span>
                  </div>
                )}
                <button onClick={discard} disabled={saving}
                  className="rounded-xl h-10 px-5 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50">Discard</button>
                <button onClick={save} disabled={saving || !locId}
                  className="rounded-xl h-10 px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${color}, ${colorDark})` }}
                >
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
