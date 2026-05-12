export const getLocationCredits = (user, locationId) => {
  if (!user?.credits) return 0
  if (typeof user.credits === 'number') return Math.max(0, Math.floor(user.credits))
  const map = user.credits instanceof Map ? user.credits : null
  if (map) return Math.max(0, Math.floor(Number(map.get(locationId) || 0)))
  const obj = user.credits
  if (typeof obj === 'object') return Math.max(0, Math.floor(Number(obj[locationId] || 0)))
  return 0
}

export const setLocationCredits = (user, locationId, value) => {
  const cleanValue = Math.max(0, Math.floor(Number(value || 0)))
  if (typeof user.credits === 'number' || !user.credits || typeof user.credits !== 'object') {
    user.credits = { [locationId]: cleanValue }
    return
  }
  if (user.credits instanceof Map) {
    user.credits.set(locationId, cleanValue)
  } else {
    user.credits[locationId] = cleanValue
  }
}

export const incrementLocationCredits = (user, locationId, amount) => {
  const current = getLocationCredits(user, locationId)
  const next = current + Math.max(0, Math.floor(Number(amount || 0)))
  setLocationCredits(user, locationId, next)
  return next
}
