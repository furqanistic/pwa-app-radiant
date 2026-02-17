// File: server/utils/pointsSettings.js
import Location from '../models/Location.js'

const formatPointsLabel = (pointsValue) => {
  if (typeof pointsValue !== 'number') return ''
  if (pointsValue > 0) return `+${pointsValue}`
  return `${pointsValue}`
}

export const DEFAULT_POINTS_METHODS = [
  {
    key: 'referral',
    title: 'Referral Bonus (Friend Books & Shows)',
    description: 'Earn points when your referred friend books and shows up',
    pointsValue: 300,
    pointsLabel: '+300',
    icon: 'UserPlus',
    action: 'Share Now',
    actionType: 'navigate',
    path: '/referrals',
    frequency: '1 per referred friend',
    verification: 'Friend appointment marked showed',
    notes: 'Award after successful show status',
    isActive: true,
  },
  {
    key: 'share_referral_link',
    title: 'Share Referral Link',
    description: 'Earn points for sharing your referral link',
    pointsValue: 25,
    pointsLabel: '+25',
    icon: 'Share2',
    action: 'Share Now',
    actionType: 'navigate',
    path: '/referrals',
    frequency: '1 per week',
    verification: 'Link share event',
    notes: 'Encourages invites',
    isActive: true,
  },
  {
    key: 'booking',
    title: 'Book Appointments',
    description: 'Get 50 points per booking',
    pointsValue: 50,
    pointsLabel: '+50',
    icon: 'Calendar',
    action: 'Book Now',
    actionType: 'navigate',
    path: '/services',
    frequency: 'Per booking',
    verification: 'Appointment created from app',
    notes: 'Encourages in-app booking behavior',
    isActive: true,
  },
  {
    key: 'purchase',
    title: 'Purchase Products',
    description: 'Earn 1 point per $1 spent',
    pointsValue: 1,
    pointsLabel: '+1/$1',
    icon: 'ShoppingBag',
    action: 'Shop Now',
    actionType: 'navigate',
    path: '/services',
    frequency: 'Per purchase',
    verification: 'Invoice total',
    notes: 'Base earning rule',
    perDollar: true,
    isActive: true,
  },
  {
    key: 'review',
    title: 'Leave Verified Google Review',
    description: 'Get 200 points after your review is verified',
    pointsValue: 200,
    pointsLabel: '+200',
    icon: 'Star',
    action: 'Review',
    actionType: 'review',
    frequency: '1 per 90 days',
    verification: 'Review verified by team',
    notes: 'High ROI for local SEO',
    isActive: true,
  },
  {
    key: 'daily_check_in',
    title: 'Daily Check In',
    description: 'Check in once per day to earn points',
    pointsValue: 10,
    pointsLabel: '+10',
    icon: 'Calendar',
    action: 'Check In',
    actionType: 'passive',
    frequency: '1 per day',
    verification: 'App check in event',
    notes: 'Award instantly',
    isActive: true,
  },
  {
    key: 'weekly_streak',
    title: 'Weekly Streak (5 check-ins)',
    description: 'Earn bonus points for 5 check-ins in one week',
    pointsValue: 75,
    pointsLabel: '+75',
    icon: 'TrendingUp',
    action: 'Keep Streak',
    actionType: 'passive',
    frequency: '1 per week',
    verification: 'System counts 5 check-ins in same week',
    notes: 'Award on 5th check-in',
    isActive: true,
  },
  {
    key: 'monthly_streak',
    title: 'Monthly Streak (20 check-ins)',
    description: 'Earn major bonus for 20 check-ins in one month',
    pointsValue: 300,
    pointsLabel: '+300',
    icon: 'TrendingUp',
    action: 'Keep Streak',
    actionType: 'passive',
    frequency: '1 per month',
    verification: 'System counts 20 check-ins in same month',
    notes: 'Big motivator for daily opens',
    isActive: true,
  },
  {
    key: 'profile_completion',
    title: 'Profile Completion',
    description: 'Complete required profile fields to earn points',
    pointsValue: 100,
    pointsLabel: '+100',
    icon: 'UserCheck',
    action: 'Complete Profile',
    actionType: 'navigate',
    path: '/profile',
    frequency: '1 time only',
    verification: 'Required fields completed',
    notes: 'Award after profile save',
    isActive: true,
  },
  {
    key: 'add_birthday',
    title: 'Add Birthday To Profile',
    description: 'Add your birthday details to earn points',
    pointsValue: 50,
    pointsLabel: '+50',
    icon: 'Gift',
    action: 'Update Profile',
    actionType: 'navigate',
    path: '/profile',
    frequency: '1 time only',
    verification: 'Birthday field completed',
    notes: 'Optional extra push if needed',
    isActive: true,
  },
  {
    key: 'enable_push_notifications',
    title: 'Enable Push Notifications',
    description: 'Turn on app notifications to earn points',
    pointsValue: 50,
    pointsLabel: '+50',
    icon: 'Bell',
    action: 'Enable Push',
    actionType: 'passive',
    frequency: '1 time only',
    verification: 'App permission enabled',
    notes: 'Increases reactivation power',
    isActive: true,
  },
  {
    key: 'quick_skin_goals_quiz',
    title: 'Quick Skin Goals Quiz',
    description: 'Complete the quick quiz to earn points',
    pointsValue: 100,
    pointsLabel: '+100',
    icon: 'ClipboardList',
    action: 'Take Quiz',
    actionType: 'passive',
    frequency: '1 time only',
    verification: 'Quiz submission',
    notes: 'Helps segmentation and upsells',
    isActive: true,
  },
  {
    key: 'confirm_appointment_within_2h',
    title: 'Confirm Appointment Within 2 Hours',
    description: 'Confirm quickly after booking to earn bonus points',
    pointsValue: 25,
    pointsLabel: '+25',
    icon: 'Clock',
    action: 'Confirm',
    actionType: 'passive',
    frequency: 'Per booking',
    verification: 'Confirmation timestamp',
    notes: 'Reduces no-shows',
    isActive: true,
  },
  {
    key: 'show_up_to_appointment',
    title: 'Show Up To Appointment',
    description: 'Earn points when your appointment is marked showed',
    pointsValue: 50,
    pointsLabel: '+50',
    icon: 'CheckCircle',
    action: 'Attend',
    actionType: 'passive',
    frequency: 'Per visit',
    verification: 'Appointment marked showed',
    notes: 'Retention driver',
    isActive: true,
  },
  {
    key: 'on_time_arrival',
    title: 'On-Time Arrival Bonus',
    description: 'Arrive on time and earn 25 bonus points',
    pointsValue: 25,
    pointsLabel: '+25',
    icon: 'Clock',
    action: 'Be On Time',
    actionType: 'passive',
    frequency: 'Per visit',
    verification: 'Staff marks on time',
    notes: 'Reduces schedule chaos',
    isActive: true,
    windowMinutes: 10,
  },
  {
    key: 'rebook_within_48_hours',
    title: 'Rebook Within 48 Hours Of Visit',
    description: 'Book your next appointment within 48 hours',
    pointsValue: 75,
    pointsLabel: '+75',
    icon: 'Calendar',
    action: 'Rebook',
    actionType: 'navigate',
    path: '/services',
    frequency: 'Per visit',
    verification: 'Next booking within 48 hours',
    notes: 'Drives consistent routines fast',
    isActive: true,
  },
  {
    key: 'rebook_within_7_days',
    title: 'Rebook Within 7 Days Of Visit',
    description: 'Book your next appointment within 7 days',
    pointsValue: 50,
    pointsLabel: '+50',
    icon: 'Calendar',
    action: 'Rebook',
    actionType: 'navigate',
    path: '/services',
    frequency: 'Per visit',
    verification: 'Next booking within 7 days',
    notes: 'Softer version of 48 hours',
    isActive: true,
  },
  {
    key: 'add_on_any_service',
    title: 'Add-On To Any Service',
    description: 'Add an extra service item to earn bonus points',
    pointsValue: 50,
    pointsLabel: '+50',
    icon: 'Plus',
    action: 'Add-On',
    actionType: 'passive',
    frequency: 'Per visit',
    verification: 'Invoice line item',
    notes: 'Increases average order value',
    isActive: true,
  },
  {
    key: 'upgrade_higher_tier_service',
    title: 'Upgrade To Higher Tier Service',
    description: 'Earn points when upgrading service tier',
    pointsValue: 150,
    pointsLabel: '+150',
    icon: 'TrendingUp',
    action: 'Upgrade',
    actionType: 'passive',
    frequency: 'Per upgrade',
    verification: 'Invoice line item',
    notes: 'Encourages upsells',
    isActive: true,
  },
  {
    key: 'buy_package_or_bundle',
    title: 'Buy Package Or Bundle',
    description: 'Earn points when purchasing a package or bundle',
    pointsValue: 300,
    pointsLabel: '+300',
    icon: 'Package',
    action: 'Buy Bundle',
    actionType: 'passive',
    frequency: 'Per purchase',
    verification: 'Invoice tagged package or bundle',
    notes: 'Big lever for cash flow and retention',
    isActive: true,
  },
  {
    key: 'hit_3_visits_30_days',
    title: 'Hit 3 Visits In 30 Days',
    description: 'Earn milestone points after 3 visits in 30 days',
    pointsValue: 200,
    pointsLabel: '+200',
    icon: 'Target',
    action: 'Keep Visiting',
    actionType: 'passive',
    frequency: '1 per 30 days',
    verification: 'Visit count',
    notes: 'Pushes consistency fast',
    isActive: true,
  },
  {
    key: 'hit_6_visits_90_days',
    title: 'Hit 6 Visits In 90 Days',
    description: 'Earn milestone points after 6 visits in 90 days',
    pointsValue: 500,
    pointsLabel: '+500',
    icon: 'Target',
    action: 'Keep Visiting',
    actionType: 'passive',
    frequency: '1 per 90 days',
    verification: 'Visit count',
    notes: 'Rewards high-value clients',
    isActive: true,
  },
  {
    key: 'referral_buys_package',
    title: 'Referral Buys A Package',
    description: 'Earn extra points when your referral buys a package',
    pointsValue: 500,
    pointsLabel: '+500',
    icon: 'UserPlus',
    action: 'Share Now',
    actionType: 'navigate',
    path: '/referrals',
    frequency: 'Per referred friend',
    verification: 'Friend package invoice',
    notes: 'Higher value referral reward',
    isActive: true,
  },
  {
    key: 'bring_friend_same_day_booking',
    title: 'Bring A Friend Same Day Booking',
    description: 'Earn points when two linked bookings are same day',
    pointsValue: 200,
    pointsLabel: '+200',
    icon: 'Users',
    action: 'Invite Friend',
    actionType: 'navigate',
    path: '/referrals',
    frequency: 'Per occurrence',
    verification: 'Two bookings linked',
    notes: 'Great for machine days',
    isActive: true,
  },
  {
    key: 'birthday_bonus',
    title: 'Birthday Bonus',
    description: 'Get annual points on your birthday',
    pointsValue: 200,
    pointsLabel: '+200',
    icon: 'Gift',
    action: 'Celebrate',
    actionType: 'passive',
    frequency: '1 per year',
    verification: 'Birthday on file before birthday',
    notes: 'Award on birthday',
    isActive: true,
  },
  {
    key: 'win_back_inactive_30_days',
    title: 'Win Back Bonus (Inactive 30+ Days)',
    description: 'Earn points when returning after 30 inactive days',
    pointsValue: 250,
    pointsLabel: '+250',
    icon: 'RotateCcw',
    action: 'Book Now',
    actionType: 'navigate',
    path: '/services',
    frequency: 'Per win back',
    verification: 'No visit for 30 days then booking',
    notes: 'Reactivation without discounting',
    isActive: true,
  },
  {
    key: 'upload_progress_photo',
    title: 'Upload Progress Photo',
    description: 'Upload a progress photo and earn points',
    pointsValue: 50,
    pointsLabel: '+50',
    icon: 'Image',
    action: 'Upload',
    actionType: 'passive',
    frequency: '1 per week',
    verification: 'Photo uploaded in app',
    notes: 'Engagement loop',
    isActive: true,
  },
  {
    key: 'wellness_check_in',
    title: 'Log Wellness Check In',
    description: 'Log sleep, water, or step goals to earn points',
    pointsValue: 5,
    pointsLabel: '+5',
    icon: 'HeartPulse',
    action: 'Check In',
    actionType: 'passive',
    frequency: '1 per day',
    verification: 'App action',
    notes: 'Only if your app supports it',
    isActive: true,
  },
  {
    key: 'no_show_or_late_cancel_penalty',
    title: 'No Show Or Late Cancel Penalty',
    description: 'Deduct points for late cancel or no-show',
    pointsValue: -200,
    pointsLabel: '-200',
    icon: 'AlertCircle',
    action: 'Penalty',
    actionType: 'passive',
    frequency: 'Per occurrence',
    verification: 'Appointment marked no-show or late cancel',
    notes: 'Only if your system supports point deductions',
    isActive: true,
  },
  {
    key: 'no_show_penalty_stronger',
    title: 'No Show Penalty (Optional Stronger)',
    description: 'Stronger no-show deduction rule',
    pointsValue: -300,
    pointsLabel: '-300',
    icon: 'AlertCircle',
    action: 'Penalty',
    actionType: 'passive',
    frequency: 'Per occurrence',
    verification: 'Appointment marked no-show',
    notes: 'Use instead of -200 if you want stricter rules',
    isActive: false,
  },
]

const normalizePointsMethod = (method, fallback) => {
  const pointsValue =
    typeof method.pointsValue === 'number'
      ? method.pointsValue
      : typeof fallback?.pointsValue === 'number'
      ? fallback.pointsValue
      : null

  return {
    ...fallback,
    ...method,
    pointsValue,
    pointsLabel:
      method.pointsLabel ||
      fallback?.pointsLabel ||
      formatPointsLabel(pointsValue),
  }
}

export const mergePointsMethodsWithDefaults = (methods = []) => {
  const cleaned = Array.isArray(methods) ? methods.filter(Boolean) : []
  const byKey = new Map(cleaned.map((method) => [method.key, method]))
  const merged = DEFAULT_POINTS_METHODS.map((fallback) => {
    const existing = byKey.get(fallback.key)
    return existing ? normalizePointsMethod(existing, fallback) : { ...fallback }
  })

  cleaned.forEach((method) => {
    if (!method?.key) return
    if (!DEFAULT_POINTS_METHODS.some((fallback) => fallback.key === method.key)) {
      merged.push(method)
    }
  })

  return merged.filter((method) => method.key !== 'read_tip')
}

export const ensureLocationPointsSettings = async (location) => {
  if (!location) return { updated: false, methods: [] }

  const existingMethods = location.pointsSettings?.methods || []
  let mergedMethods = mergePointsMethodsWithDefaults(existingMethods)

  // One-time migration: enable the full standard ruleset for legacy locations.
  const needsBootstrap = !location.pointsSettings?.allMethodsBootstrapped
  if (needsBootstrap) {
    mergedMethods = mergedMethods.map((method) => ({
      ...method,
      // Keep optional stronger no-show rule off by default.
      isActive: method.key === 'no_show_penalty_stronger' ? false : true,
    }))
  }

  const updated =
    !location.pointsSettings ||
    !location.pointsSettings.methods ||
    needsBootstrap ||
    mergedMethods.length !== existingMethods.length ||
    mergedMethods.some((method, index) => {
      const existing = existingMethods[index]
      return JSON.stringify(method) !== JSON.stringify(existing)
    })

  if (updated) {
    location.pointsSettings = {
      ...location.pointsSettings,
      allMethodsBootstrapped: true,
      methods: mergedMethods,
    }
    location.markModified('pointsSettings')
    await location.save()
  }

  return { updated, methods: mergedMethods }
}

export const getPointsMethodForLocation = async (locationId, key) => {
  if (!locationId || !key) return null
  const location = await Location.findOne({ locationId })
  if (!location) return null
  const methods = mergePointsMethodsWithDefaults(location.pointsSettings?.methods || [])
  return methods.find((method) => method.key === key) || null
}
