/**
 * Requires international format: starts with '+' followed by 7–15 digits.
 * GHL SMS needs a full E.164 number to deliver messages.
 */
export const isValidProfilePhone = (value = '') => {
  const trimmed = `${value || ''}`.trim()
  if (!trimmed.startsWith('+')) return false
  const digits = trimmed.slice(1).replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export const PHONE_FORMAT_HINT = 'Include your country code, e.g. +1 555 000 0000'
export const PHONE_FORMAT_ERROR = 'Add your country code — must start with +, e.g. +1 555 000 0000'
