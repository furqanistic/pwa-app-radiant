/**
 * Normalize phone to E.164 format.
 * - If already starts with '+', keep as-is (just clean non-digits after +)
 * - If 10 digits (US), prepend +1
 * - If 11 digits starting with 1, replace leading 1 with +1
 */
export const normalizePhone = (value = '') => {
  const trimmed = `${value || ''}`.trim()
  if (!trimmed) return ''

  // Already has + prefix
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return `+${digits}`
  }

  // Strip all non-digits
  const digits = trimmed.replace(/\D/g, '')

  // 10 digits = US number, add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }

  // 11 digits starting with 1 = US number with country code, replace with +1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1${digits.slice(1)}`
  }

  // Return as-is with + prefix if it looks like it has a country code
  if (digits.length >= 7 && digits.length <= 15) {
    return `+${digits}`
  }

  return trimmed
}

/**
 * Validates phone number (accepts with or without country code).
 * Returns true if the number can be normalized to valid E.164 format.
 */
export const isValidProfilePhone = (value = '') => {
  const normalized = normalizePhone(value)
  if (!normalized.startsWith('+')) return false
  const digits = normalized.slice(1).replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export const PHONE_FORMAT_HINT = 'e.g. +1 555 000 0000 or 555 000 0000'
export const PHONE_FORMAT_ERROR = 'Please enter a valid phone number'
