/**
 * Normalize a stored review URL for opening in the browser.
 */
export function normalizeReviewUrl(raw) {
  const trimmed = `${raw || ''}`.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/**
 * True when the link points at Google Maps / Business / g.page review flows.
 * Other platforms (e.g. Yelp) should not trigger the one-time Google review points API.
 */
export function isGoogleBusinessReviewUrl(raw) {
  const href = normalizeReviewUrl(raw)
  if (!href) return false

  let url
  try {
    url = new URL(href)
  } catch {
    return false
  }

  const host = url.hostname.toLowerCase()
  const h = host.replace(/^www\./, '')
  const path = `${url.pathname}`.toLowerCase()
  const search = `${url.search}`.toLowerCase()

  if (h === 'g.page') return true
  if (h === 'business.google.com') return true
  if (h === 'maps.app.goo.gl') return true

  if (h === 'goo.gl') {
    return path.includes('/maps') || search.includes('maps')
  }

  if (h === 'maps.google.com' || /^maps\.google\./.test(host)) {
    return true
  }

  const isGoogleMapsRelatedHost =
    h === 'google.com' ||
    h.endsWith('.google.com') ||
    /^google\.[a-z.]+$/i.test(h)

  if (isGoogleMapsRelatedHost) {
    if (path.includes('/maps')) return true
    if (path.includes('/local/')) return true
    if (path.includes('writereview')) return true
    if (search.includes('writereview')) return true
    if (url.searchParams.has('query_place_id')) return true
    if (url.searchParams.has('cid')) return true
  }

  if (host === 'search.google.com' || host.endsWith('.search.google.com')) {
    return path.includes('local') && search.includes('writereview')
  }

  return false
}
