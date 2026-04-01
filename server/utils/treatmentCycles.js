// File: server/utils/treatmentCycles.js
// Treatment cycle intelligence — calculates when clients are due for their next visit
// and drives rebooking reminders.

/**
 * Default recommended cycle weeks for common treatment types.
 * These are fallbacks used when a Service does not have recommendedCycleWeeks set.
 * Keys are lowercase substrings matched against the service name.
 */
const TREATMENT_CYCLE_DEFAULTS = [
  { keywords: ['botox', 'botulinum', 'dysport', 'xeomin'], weeks: 12 },
  { keywords: ['filler', 'juvederm', 'restylane', 'sculptra', 'radiesse'], weeks: 24 },
  { keywords: ['laser', 'ipl', 'bbl', 'photofacial'], weeks: 8 },
  { keywords: ['facial', 'hydrafacial', 'hydra facial', 'microdermabrasion'], weeks: 4 },
  { keywords: ['chemical peel', 'peel'], weeks: 6 },
  { keywords: ['microneedling', 'micro needling', 'prp'], weeks: 6 },
  { keywords: ['iv therapy', 'iv drip', 'infusion'], weeks: 4 },
  { keywords: ['massage', 'deep tissue', 'swedish'], weeks: 4 },
  { keywords: ['wax', 'waxing'], weeks: 4 },
  { keywords: ['lash', 'lashes', 'brow'], weeks: 3 },
  { keywords: ['spray tan', 'sunless tan'], weeks: 2 },
  { keywords: ['coolsculpting', 'cryolipolysis', 'body contouring'], weeks: 12 },
  { keywords: ['hair removal', 'laser hair'], weeks: 6 },
  { keywords: ['skin', 'skincare', 'treatment'], weeks: 6 },
]

/**
 * Returns the recommended cycle weeks for a service.
 * Priority:
 *   1. Service's own recommendedCycleWeeks field (if > 0)
 *   2. Keyword match against service name from TREATMENT_CYCLE_DEFAULTS
 *   3. null (no cycle — don't show reminder)
 *
 * @param {object} service - Mongoose Service document or plain object with .name and .recommendedCycleWeeks
 * @returns {number|null} weeks, or null if not applicable
 */
export const getCycleWeeksForService = (service) => {
  if (!service) return null

  // Explicit setting takes priority
  if (
    typeof service.recommendedCycleWeeks === 'number' &&
    service.recommendedCycleWeeks > 0
  ) {
    return service.recommendedCycleWeeks
  }

  // Keyword matching on service name
  const nameLower = (service.name || '').toLowerCase()
  for (const entry of TREATMENT_CYCLE_DEFAULTS) {
    if (entry.keywords.some((kw) => nameLower.includes(kw))) {
      return entry.weeks
    }
  }

  return null
}

/**
 * Given a completed booking date and cycle weeks, return the next recommended date.
 *
 * @param {Date|string} visitDate - The date of the completed visit
 * @param {number} cycleWeeks - Number of weeks in the cycle
 * @returns {Date} The recommended next visit date
 */
export const calculateNextRecommendedDate = (visitDate, cycleWeeks) => {
  const base = new Date(visitDate)
  const next = new Date(base)
  next.setDate(next.getDate() + cycleWeeks * 7)
  return next
}

/**
 * Categorise urgency based on days until due.
 *
 * @param {number} daysUntilDue - Negative means overdue
 * @returns {'overdue'|'urgent'|'soon'|'upcoming'}
 */
export const getCycleUrgency = (daysUntilDue) => {
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 7) return 'urgent'
  if (daysUntilDue <= 14) return 'soon'
  return 'upcoming'
}

/**
 * Human-readable label for days until due.
 *
 * @param {number} daysUntilDue
 * @returns {string}
 */
export const formatDaysUntilDue = (daysUntilDue) => {
  if (daysUntilDue < 0) {
    const overdue = Math.abs(daysUntilDue)
    return overdue === 1 ? 'Overdue by 1 day' : `Overdue by ${overdue} days`
  }
  if (daysUntilDue === 0) return 'Due today'
  if (daysUntilDue === 1) return 'Due tomorrow'
  if (daysUntilDue <= 14) return `Due in ${daysUntilDue} days`
  const weeks = Math.round(daysUntilDue / 7)
  return weeks === 1 ? 'Due in about 1 week' : `Due in about ${weeks} weeks`
}
