import { useBranding } from '@/context/BrandingContext'
import { useSpaSync } from '@/context/SpaSyncContext'
import { dashboardQueryKeys } from '@/hooks/useDashboard'
import { rewardQueryKeys } from '@/hooks/useRewards'
import { updateProfile } from '@/redux/userSlice'
import { authService } from '@/services/authService'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

const shouldSyncSelectedLocationForRole = (role) => {
  if (['admin', 'super-admin', 'spa'].includes(role)) return false
  return true
}

export function useSyncSelectedSpaFromBranding() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { pathname } = useLocation()
  const { locationId, loading: brandingLoading } = useBranding()
  const { setSpaSyncing } = useSpaSync()
  const currentUser = useSelector((state) => state.user.currentUser)

  const inFlightRef = useRef(false)
  const selectSpaFailedForTargetRef = useRef(null)

  useEffect(() => {
    if (!shouldSyncSelectedLocationForRole(currentUser?.role)) return
    if (!currentUser || !localStorage.getItem('token')) return
    if (brandingLoading) return
    if (!locationId) return
    if (pathname === '/auth') return

    const selectedId =
      `${currentUser?.selectedLocation?.locationId || ''}`.trim()
    const targetId = `${locationId}`.trim()

    if (
      selectSpaFailedForTargetRef.current &&
      selectSpaFailedForTargetRef.current !== targetId
    ) {
      selectSpaFailedForTargetRef.current = null
    }

    if (selectedId === targetId) {
      selectSpaFailedForTargetRef.current = null
      return
    }

    if (selectSpaFailedForTargetRef.current === targetId) return

    let cancelled = false

    const run = async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      setSpaSyncing(true)
      try {
        const selectionResponse = await authService.selectSpa(targetId)
        if (cancelled) return

        selectSpaFailedForTargetRef.current = null

        const selectedLocation =
          selectionResponse?.data?.user?.selectedLocation
        if (selectedLocation?.locationId) {
          dispatch(
            updateProfile({
              selectedLocation,
              assignedLocations:
                selectionResponse?.data?.user?.assignedLocations,
              profileCompleted:
                selectionResponse?.data?.user?.profileCompleted ?? true,
              points:
                selectionResponse?.data?.user?.locationPoints ??
                selectionResponse?.data?.user?.points,
              locationPoints:
                selectionResponse?.data?.user?.locationPoints ??
                selectionResponse?.data?.user?.points,
              hasSelectedSpa: true,
            })
          )
        }

        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
        queryClient.invalidateQueries({ queryKey: rewardQueryKeys.catalog })
        queryClient.invalidateQueries({ queryKey: ['gameWheel'] })
        queryClient.invalidateQueries({ queryKey: ['referral'] })
        queryClient.invalidateQueries({ queryKey: ['treatment-cycles'] })
      } catch (error) {
        if (!cancelled) {
          selectSpaFailedForTargetRef.current = targetId
          const message =
            error.response?.data?.message ||
            'Could not switch to this location. Please try again.'
          toast.error(message)
        }
      } finally {
        if (!cancelled) {
          setSpaSyncing(false)
        }
        inFlightRef.current = false
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [
    brandingLoading,
    currentUser,
    currentUser?.role,
    currentUser?.selectedLocation?.locationId,
    dispatch,
    locationId,
    pathname,
    queryClient,
    setSpaSyncing,
  ])
}
