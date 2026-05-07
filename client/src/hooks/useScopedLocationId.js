import { useBranding } from '@/context/BrandingContext'
import { selectCurrentUser } from '@/redux/userSlice'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'

/**
 * Canonical spa scope for regular-user flows: URL wins (deep links), then branding
 * context, then Redux selectedLocation / spaLocation fallbacks.
 */
export function useScopedLocationId() {
  const { search } = useLocation()
  const { locationId: brandingLocationId } = useBranding()
  const currentUser = useSelector(selectCurrentUser)

  return useMemo(() => {
    const paramId = new URLSearchParams(search).get('spa')?.trim()
    if (paramId) return paramId

    const brandingId = brandingLocationId ? `${brandingLocationId}`.trim() : ''
    if (brandingId) return brandingId

    const selectedId =
      `${currentUser?.selectedLocation?.locationId || ''}`.trim()
    if (selectedId) return selectedId

    const spaId = `${currentUser?.spaLocation?.locationId || ''}`.trim()
    return spaId || null
  }, [
    search,
    brandingLocationId,
    currentUser?.selectedLocation?.locationId,
    currentUser?.spaLocation?.locationId,
  ])
}
