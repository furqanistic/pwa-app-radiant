const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''

const isCloudinaryUrl = (url) =>
  typeof url === 'string' && url.includes('res.cloudinary.com/')

const CLOUDINARY_VERSION_SEGMENT = /^v\d+$/

/**
 * Remove transformation segments already baked into the path after `/image/upload/`,
 * so we can prepend a fresh transform chain. Without this, URLs like
 * `.../upload/f_auto,q_auto,w_800/...` become malformed when we prepend another `f_png,...`.
 */
export const stripCloudinaryUploadPathSuffix = (rest) => {
  if (!rest || typeof rest !== 'string') return ''
  const segments = rest.split('/').filter(Boolean)
  let i = 0
  while (i < segments.length) {
    const seg = segments[i]
    if (CLOUDINARY_VERSION_SEGMENT.test(seg)) {
      return segments.slice(i).join('/')
    }
    if (seg.includes(',')) {
      i += 1
      continue
    }
    if (isSingleSegmentCloudinaryTransform(seg)) {
      i += 1
      continue
    }
    return segments.slice(i).join('/')
  }
  return ''
}

function isSingleSegmentCloudinaryTransform(seg) {
  if (/^fl_[a-z0-9_]+$/i.test(seg)) return true
  if (/^f_(auto|png|jpg|jpeg|webp|heif|avif|gif|bmp|ico|pdf|svg)$/i.test(seg)) return true
  if (/^q_(auto|auto:best|auto:good|auto:eco|auto:low|\d{1,3})$/i.test(seg)) return true
  if (/^w_\d{1,4}$/.test(seg)) return true
  if (/^h_\d{1,4}$/.test(seg)) return true
  if (/^dpr_(auto|[\d.]+)$/i.test(seg)) return true
  if (/^ar_[\d.]+:[\d.]+$/.test(seg)) return true
  if (/^c_(fill|fit|pad|limit|scale|thumb|crop|imag|if|ip)$/.test(seg)) return true
  if (/^b_(auto|white|black|transparent|rgb:[0-9a-f]{3,8})$/i.test(seg)) return true
  if (/^g_(north|south|east|west|center|face|custom)$/i.test(seg)) return true
  if (/^x_\d+$/i.test(seg)) return true
  if (/^y_\d+$/i.test(seg)) return true
  if (/^z_\d+$/i.test(seg)) return true
  if (/^u_[a-z]/i.test(seg)) return true
  return false
}

const buildCloudinaryUrl = (publicId, options = {}) => {
  if (!CLOUDINARY_CLOUD_NAME || !publicId) return publicId
  const parts = []
  // f_auto may deliver JPEG — transparent PNGs show black. Logos need alpha kept.
  if (options.preserveTransparency) {
    parts.push('f_png', 'q_auto')
    if (options.width) parts.push(`w_${options.width}`)
    if (options.height) parts.push(`h_${options.height}`)
    if (options.width || options.height) parts.push('c_limit')
  } else {
    parts.push('f_auto', 'q_auto')
    if (options.width) parts.push(`w_${options.width}`)
    if (options.height) parts.push(`h_${options.height}`)
    if (options.width || options.height) parts.push('c_fill')
  }
  const transform = parts.join(',')
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${publicId}`
}

const buildCloudinaryUrlFromFull = (url, options = {}) => {
  if (!isCloudinaryUrl(url)) return url
  const splitMarker = '/image/upload/'
  const idx = url.indexOf(splitMarker)
  if (idx === -1) return url
  const base = url.slice(0, idx)
  const rawRest = url.slice(idx + splitMarker.length)
  const rest = stripCloudinaryUploadPathSuffix(rawRest) || rawRest
  const parts = []
  if (options.preserveTransparency) {
    parts.push('f_png', 'q_auto')
    if (options.width) parts.push(`w_${options.width}`)
    if (options.height) parts.push(`h_${options.height}`)
    if (options.width || options.height) parts.push('c_limit')
  } else {
    parts.push('f_auto', 'q_auto')
    if (options.width) parts.push(`w_${options.width}`)
    if (options.height) parts.push(`h_${options.height}`)
    if (options.width || options.height) parts.push('c_fill')
  }
  const transform = parts.join(',')
  return `${base}${splitMarker}${transform}/${rest}`
}

export const resolveImageUrl = (value, fallback, options = {}) => {
  if (!value || typeof value !== 'string') return fallback
  if (isCloudinaryUrl(value)) return buildCloudinaryUrlFromFull(value, options)
  if (value.startsWith('http')) return value
  return buildCloudinaryUrl(value, options) || fallback
}

/** Prefer path-style logoPublicId so Cloudinary URLs are rebuilt without stale transforms. */
export const resolveBrandingLogoUrl = (branding, options = {}) => {
  const pid = `${branding?.logoPublicId || ''}`.trim()
  const logo = `${branding?.logo || ''}`.trim()
  const value = pid && !/^https?:\/\//i.test(pid) ? pid : logo || pid
  const fallback = logo || pid
  return resolveImageUrl(value, fallback, { preserveTransparency: true, ...options })
}

/** Favicon: prefer faviconPublicId path, else favicon URL, else fall back to logo. */
export const resolveBrandingFaviconUrl = (branding, options = {}) => {
  const fpid = `${branding?.faviconPublicId || ''}`.trim()
  const fav = `${branding?.favicon || ''}`.trim()
  if (fpid && !/^https?:\/\//i.test(fpid)) {
    return resolveImageUrl(fpid, fav || fpid, { preserveTransparency: true, ...options })
  }
  if (fav) return resolveImageUrl(fav, fav, { preserveTransparency: true, ...options })
  return resolveBrandingLogoUrl(branding, options)
}

/** Shared placeholder when a service has no image (catalog + detail + cart). */
export const SERVICE_CARD_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&auto=format&fit=crop&q=60'

export const getServiceImageSource = (service) =>
  service?.image ||
  service?.imageUrl ||
  service?.serviceImage ||
  service?.service?.image ||
  service?.serviceId?.image ||
  service?.linkedService?.image ||
  service?.linkedServiceId?.image ||
  ''

export const hasServiceImage = (service) => {
  const imageSource = getServiceImageSource(service)
  return Boolean(imageSource && typeof imageSource === 'string' && imageSource.trim().length > 0)
}

/** Same URL rules everywhere (Cloudinary public id, full URL, fallbacks). */
export const resolveServiceImageUrl = (service, options = {}) =>
  resolveImageUrl(getServiceImageSource(service), SERVICE_CARD_IMAGE_FALLBACK, {
    width: 800,
    height: 600,
    ...options,
  })
