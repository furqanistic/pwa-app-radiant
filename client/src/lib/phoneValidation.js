/** Lenient international check: enough digits for SMS providers (e.g. GHL). */
export const isValidProfilePhone = (value = '') => {
  const digits = `${value || ''}`.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 17
}
