const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''

const isCloudinaryUrl = (url) =>
  typeof url === 'string' && url.includes('res.cloudinary.com/')

const buildCloudinaryUrl = (publicId, options = {}) => {
  if (!CLOUDINARY_CLOUD_NAME || !publicId) return publicId
  const parts = ['f_auto', 'q_auto']
  if (options.width) parts.push(`w_${options.width}`)
  if (options.height) parts.push(`h_${options.height}`)
  if (options.width || options.height) parts.push('c_fill')
  const transform = parts.join(',')
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${publicId}`
}

const buildCloudinaryUrlFromFull = (url, options = {}) => {
  if (!isCloudinaryUrl(url)) return url
  const [base, rest] = url.split('/image/upload/')
  if (!base || !rest) return url
  const parts = ['f_auto', 'q_auto']
  if (options.width) parts.push(`w_${options.width}`)
  if (options.height) parts.push(`h_${options.height}`)
  if (options.width || options.height) parts.push('c_fill')
  const transform = parts.join(',')
  return `${base}/image/upload/${transform}/${rest}`
}

export const resolveImageUrl = (value, fallback, options = {}) => {
  if (!value || typeof value !== 'string') return fallback
  if (isCloudinaryUrl(value)) return buildCloudinaryUrlFromFull(value, options)
  if (value.startsWith('http')) return value
  return buildCloudinaryUrl(value, options) || fallback
}
