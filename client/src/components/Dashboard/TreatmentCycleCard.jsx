// File: client/src/components/Dashboard/TreatmentCycleCard.jsx
// Shows upcoming treatment refresh reminders on the client dashboard.
// Renders nothing if the user has no cycles due within 30 days.

import { useBranding } from '@/context/BrandingContext'
import { useScopedLocationId } from '@/hooks/useScopedLocationId'
import { bookingService } from '@/services/bookingService'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, ChevronRight, Clock, Sparkles, Zap } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

const Motion = motion

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const URGENCY_CONFIG = {
  overdue: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: Zap,
    iconColor: 'text-red-500',
    dot: 'bg-red-500',
  },
  urgent: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    icon: Clock,
    iconColor: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  soon: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: Calendar,
    iconColor: 'text-amber-500',
    dot: 'bg-amber-400',
  },
  upcoming: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    icon: Calendar,
    iconColor: 'text-blue-500',
    dot: 'bg-blue-400',
  },
}

// ─── Single cycle row ────────────────────────────────────────────────────────

const CycleRow = ({ cycle, onBook, brandColor }) => {
  const config = URGENCY_CONFIG[cycle.urgency] || URGENCY_CONFIG.upcoming
  const UrgencyIcon = config.icon

  return (
    <Motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${config.bg} ${config.border} transition-all duration-200`}
    >
      {/* Urgency dot */}
      <div className='flex-shrink-0 flex flex-col items-center gap-1'>
        <div className={`w-2.5 h-2.5 rounded-full ${config.dot} animate-pulse`} />
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold text-gray-800 truncate'>
          {cycle.serviceName}
        </p>
        <p className='text-xs text-gray-500 mt-0.5'>
          Last visit: {formatDate(cycle.lastVisitDate)}
        </p>
        <div className='mt-1.5 flex items-center gap-1.5 flex-wrap'>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.badge}`}
          >
            <UrgencyIcon size={9} />
            {cycle.dueDateLabel}
          </span>
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={() => onBook(cycle.serviceId)}
        className='flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm active:scale-95 transition-transform duration-100'
        style={{ backgroundColor: brandColor }}
        aria-label={`Book ${cycle.serviceName} refresh`}
      >
        Book
        <ChevronRight size={12} />
      </button>
    </Motion.div>
  )
}

// ─── Main card ───────────────────────────────────────────────────────────────

const TreatmentCycleCard = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding, locationId } = useBranding()
  const scopedLocationId = useScopedLocationId()
  const navigate = useNavigate()

  const brandColor = branding?.themeColor || '#ec4899'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['treatment-cycles', currentUser?._id, scopedLocationId ?? 'global'],
    queryFn: bookingService.getTreatmentCycles,
    enabled: !!currentUser?._id && currentUser?.role === 'user',
    staleTime: 10 * 60 * 1000, // 10 minutes — cycles don't change that fast
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const cycles = data?.data?.cycles || []

  // Navigate to the service catalog, keeping the spa param
  const handleBook = (serviceId) => {
    const path = serviceId ? `/services/${serviceId}` : '/services'
    const destination = locationId
      ? `${path}?spa=${encodeURIComponent(locationId)}`
      : path
    navigate(destination)
  }

  // Don't render if loading, error, or no cycles
  if (isLoading || isError || cycles.length === 0) return null

  // Separate overdue/urgent from upcoming for visual priority
  const overdueOrUrgent = cycles.filter(
    (c) => c.urgency === 'overdue' || c.urgency === 'urgent'
  )
  const rest = cycles.filter(
    (c) => c.urgency !== 'overdue' && c.urgency !== 'urgent'
  )

  const hasUrgent = overdueOrUrgent.length > 0

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className='w-full rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden'
    >
      {/* Header */}
      <div className='flex items-center justify-between px-4 pt-4 pb-3'>
        <div className='flex items-center gap-2'>
          <div
            className='w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0'
            style={{ backgroundColor: `${brandColor}18` }}
          >
            <Sparkles size={14} style={{ color: brandColor }} />
          </div>
          <div>
            <p className='text-sm font-semibold text-gray-800'>
              Treatment Reminders
            </p>
            <p className='text-[11px] text-gray-400'>
              {cycles.length} refresh{cycles.length !== 1 ? 'es' : ''} coming up
            </p>
          </div>
        </div>
        {hasUrgent && (
          <span className='text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full'>
            Action needed
          </span>
        )}
      </div>

      {/* Cycles list */}
      <div className='px-4 pb-4 flex flex-col gap-2'>
        <AnimatePresence>
          {overdueOrUrgent.map((cycle) => (
            <CycleRow
              key={cycle.bookingId}
              cycle={cycle}
              onBook={handleBook}
              brandColor={brandColor}
            />
          ))}
          {rest.map((cycle) => (
            <CycleRow
              key={cycle.bookingId}
              cycle={cycle}
              onBook={handleBook}
              brandColor={brandColor}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div
        className='px-4 py-2.5 border-t border-gray-50 flex items-center gap-1.5'
        style={{ backgroundColor: `${brandColor}08` }}
      >
        <Clock size={10} style={{ color: brandColor }} />
        <p className='text-[10px]' style={{ color: brandColor }}>
          Stay on schedule for the best results from your treatments
        </p>
      </div>
    </Motion.div>
  )
}

export default TreatmentCycleCard
