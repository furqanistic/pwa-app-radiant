import { useBranding } from '@/context/BrandingContext'
import { selectCurrentUser } from '@/redux/userSlice'
import { getCurrentSubdomain } from '@/utils/subdomain'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'

/** Hostname subdomains that are not tenant spas (aligned with subdomain validation). */
const RESERVED_HOST_SUBDOMAINS = new Set([
  'app',
  'www',
  'api',
  'admin',
  'mail',
  'localhost',
  'staging',
  'dev',
  'test',
])

/**
 * Canonical spa scope for regular-user flows.
 * - `?spa=` wins (deep links, login context from AuthPage).
 * - On a tenant subdomain site, branding location wins (single-spa branding lock).
 * - On the hub / multi-location app, prefer Redux selected spa so Stripe vs Square
 *   membership flows match the location the user picked, not stale branding cache.
 */
export function useScopedLocationId() {
  const { search } = useLocation()
  const { locationId: brandingLocationId } = useBranding()
  const currentUser = useSelector(selectCurrentUser)

  return useMemo(() => {
    const paramId = new URLSearchParams(search).get('spa')?.trim()
    if (paramId) return paramId

    const rawSub = getCurrentSubdomain()
    const tenantSubdomain =
      rawSub && !RESERVED_HOST_SUBDOMAINS.has(`${rawSub}`.trim().toLowerCase())

    const brandingId = brandingLocationId ? `${brandingLocationId}`.trim() : ''

    if (tenantSubdomain && brandingId) {
      return brandingId
    }

    const selectedId =
      `${currentUser?.selectedLocation?.locationId || ''}`.trim()
    if (selectedId) return selectedId

    if (brandingId) return brandingId

    const spaId = `${currentUser?.spaLocation?.locationId || ''}`.trim()
    return spaId || null
  }, [
    search,
    brandingLocationId,
    currentUser?.selectedLocation?.locationId,
    currentUser?.spaLocation?.locationId,
  ])
}
