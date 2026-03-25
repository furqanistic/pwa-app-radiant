// File: client/src/App.jsx
import { Toaster } from '@/components/ui/sonner'
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useLocation,
} from 'react-router-dom'
import AppIconManager from './components/Common/AppIconManager'
import AuthPage from './pages/Auth/AuthPage'
import BookingsPage from './pages/Bookings/BookingsPage'
import BookingSuccessPage from './pages/Bookings/BookingSuccessPage'

import { BrandingProvider, useBranding } from './context/BrandingContext'
import ServiceCatalogPage from './pages/Bookings/ServiceCatalogPage'
import ServiceDetailPage from './pages/Bookings/ServiceDetailPage'
import CartPage from './pages/Cart/CartPage'
import ContactsPage from './pages/Contacts/ContactsPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import InstallPrompt from './pages/Layout/InstallPrompt'
import BookingsManagementPage from './pages/Management/BookingsManagementPage'
import BookingsDatabasePage from './pages/Management/BookingsDatabasePage'
import ClientRevenuePage from './pages/Management/ClientRevenuePage'
import ManagementPage from './pages/Management/ManagementPage'
import CalendarManagementPage from './pages/Management/CalendarManagementPage'
import MembershipManagementPage from './pages/Management/MembershipManagementPage'
import ServiceManagementPage from './pages/Management/ServiceManagementPage'
import ServicesDatabasePage from './pages/Management/ServicesDatabasePage'
import SessionTrackerPage from './pages/Management/SessionTrackerPage'
import MembershipPage from './pages/Membership/MembershipPage'
import ClientProfile from './pages/Profile/ClientProfile'
import ProfilePage from './pages/Profile/ProfilePage'
import ClaimRewardPage from './pages/QRCode/ClaimRewardPage'
import ManageReferralPage from './pages/Referral/ManageReferralPage'
import ReferralPage from './pages/Referral/ReferralPage'
import RewardManagement from './pages/Rewards/RewardManagement'
import RewardsCatalogPage from './pages/Rewards/RewardsCatalogPage'
import ScratchSpinManagement from './pages/Spin/ScratchSpinManagement'
import ScratchSpinPage from './pages/Spin/ScratchSpinPage'
import { loginFailure, loginSuccess, logout } from './redux/userSlice'
import { brandingService } from './services/brandingService'
import { authService } from './services/authService'
import { qrCodeService } from './services/qrCodeService'

// Scroll to top whenever the route changes
const ScrollToTop = () => {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return null
}

const MIN_FORCE_SYNC_GAP_MS = 10 * 1000
const USER_SYNC_INTERVAL_MS = 2 * 60 * 1000

const getUserSyncSignature = (user) =>
  JSON.stringify({
    id: user?._id || null,
    role: user?.role || null,
    name: user?.name || null,
    email: user?.email || null,
    points: user?.points ?? null,
    hasSelectedSpa: user?.hasSelectedSpa ?? null,
    selectedLocationId: user?.selectedLocation?.locationId || null,
    selectedLocationName: user?.selectedLocation?.locationName || null,
    selectedLocationLogo: user?.selectedLocation?.logo || null,
    spaLocationId: user?.spaLocation?.locationId || null,
    spaLocationName: user?.spaLocation?.locationName || null,
    spaLocationLogo: user?.spaLocation?.logo || null,
    updatedAt: user?.updatedAt || null,
  })

const SpaSelectionGuard = ({ children }) => {
  // Location selection is handled before auth (or via subdomain), so no extra onboarding gate is needed.
  return children
}

// Rest of the component remains the same...
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { locationId } = useBranding()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const spaFromUrl = new URLSearchParams(location.search).get('spa')
  const spaId = spaFromUrl || locationId
  const buildSpaPath = (path) =>
    spaId ? `${path}?spa=${encodeURIComponent(spaId)}` : path

  if (!currentUser && token) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='text-sm font-semibold text-gray-500'>Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to={buildSpaPath('/auth')} replace />
  }

  return <SpaSelectionGuard>{children}</SpaSelectionGuard>
}

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { locationId } = useBranding()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const spaFromUrl = new URLSearchParams(location.search).get('spa')
  const spaId = spaFromUrl || locationId
  const buildSpaPath = (path) =>
    spaId ? `${path}?spa=${encodeURIComponent(spaId)}` : path

  if (!currentUser && token) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='text-sm font-semibold text-gray-500'>Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to={buildSpaPath('/auth')} replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to='/dashboard' replace />
  }

  return <SpaSelectionGuard>{children}</SpaSelectionGuard>
}

const PublicRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { locationId } = useBranding()
  const token = localStorage.getItem('token')
  const buildSpaPath = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path

  if (!currentUser && token) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='text-sm font-semibold text-gray-500'>Loading...</div>
      </div>
    )
  }

  if (currentUser && token) {
    const targetPath =
      currentUser?.role === 'super-admin' ? '/management' : '/dashboard'
    return <Navigate to={buildSpaPath(targetPath)} replace />
  }

  return children
}

const WelcomeRoute = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { locationId } = useBranding()
  const token = localStorage.getItem('token')
  const buildSpaPath = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path
  const targetPath =
    currentUser?.role === 'super-admin' ? '/management' : '/dashboard'

  if (!currentUser && token) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='text-sm font-semibold text-gray-500'>Loading...</div>
      </div>
    )
  }

  if (!currentUser || !token) {
    return <Navigate to={buildSpaPath('/auth')} replace />
  }

  return <Navigate to={buildSpaPath(targetPath)} replace />
}

const LegacySpaSubdomainRedirect = () => {
  const location = useLocation()
  const inFlightRef = useRef(false)

  useEffect(() => {
    const redirectToSpaSubdomain = async () => {
      if (typeof window === 'undefined' || inFlightRef.current) return

      const hostname = window.location.hostname.toLowerCase()
      const isCxrHost =
        hostname === 'cxrsystems.com' || hostname.endsWith('.cxrsystems.com')
      const isLocalHost =
        hostname === 'localhost' || hostname === '127.0.0.1'
      const isSpaSubdomain = /^([a-z0-9-]+)\.cxrsystems\.com$/.test(hostname)
      const isNonSpaRootHost = ['app', 'www', 'api'].includes(
        hostname.split('.')[0]
      )

      // Redirect only for legacy/root hosts, never inside local/dev or already-correct spa subdomains.
      if (!isCxrHost || isLocalHost || (isSpaSubdomain && !isNonSpaRootHost))
        return

      const params = new URLSearchParams(location.search)
      const spaLocationId = params.get('spa')?.trim()
      const qrId = params.get('qrId')?.trim()

      if (!spaLocationId && !qrId) return

      try {
        inFlightRef.current = true

        let targetSubdomain = null

        if (spaLocationId) {
          const brandingResponse =
            await brandingService.getBrandingByLocationId(spaLocationId)
          targetSubdomain =
            brandingResponse?.data?.subdomain?.trim()?.toLowerCase() || null
        } else if (qrId) {
          const qrResolution = await qrCodeService.resolveQRCodeLocation(qrId)
          const resolvedLocationId = qrResolution?.data?.locationId
          targetSubdomain =
            qrResolution?.data?.subdomain?.trim()?.toLowerCase() || null

          if (!targetSubdomain && resolvedLocationId) {
            const brandingResponse =
              await brandingService.getBrandingByLocationId(resolvedLocationId)
            targetSubdomain =
              brandingResponse?.data?.subdomain?.trim()?.toLowerCase() || null
          }
        }

        if (!targetSubdomain || ['app', 'www', 'api'].includes(targetSubdomain))
          return

        const targetHost = `${targetSubdomain}.cxrsystems.com`
        if (hostname === targetHost) return

        const targetUrl = `${window.location.protocol}//${targetHost}${location.pathname}${location.search}${location.hash}`
        window.location.replace(targetUrl)
      } catch {
        // Keep the user on current host if lookup fails.
      } finally {
        inFlightRef.current = false
      }
    }

    redirectToSpaSubdomain()
  }, [location.pathname, location.search, location.hash])

  return null
}

const App = () => {
  const dispatch = useDispatch()
  const { currentUser } = useSelector((state) => state.user)
  const currentUserRef = useRef(currentUser)
  const syncInFlightRef = useRef(false)
  const lastSyncAtRef = useRef(0)

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const fetchCurrentUser = async ({ forceRefresh = false } = {}) => {
      if (syncInFlightRef.current) return
      if (
        forceRefresh &&
        Date.now() - lastSyncAtRef.current < MIN_FORCE_SYNC_GAP_MS
      ) {
        return
      }

      try {
        syncInFlightRef.current = true
        const response = await authService.getCurrentUser()
        const user = response?.data?.user || response?.data || response?.user
        if (user) {
          const currentSignature = getUserSyncSignature(currentUserRef.current)
          const nextSignature = getUserSyncSignature(user)

          // Avoid unnecessary store writes when server payload hasn't changed.
          if (currentSignature === nextSignature) {
            return
          }
          dispatch(loginSuccess({ data: { user }, token }))
        }
      } catch (error) {
        dispatch(loginFailure(error.response?.data?.message || 'Session expired'))
        dispatch(logout())
        localStorage.removeItem('token')
      } finally {
        syncInFlightRef.current = false
        lastSyncAtRef.current = Date.now()
      }
    }

    if (!currentUser) {
      fetchCurrentUser()
    }

    if (currentUser) {
      // Immediate refresh for persisted sessions so stale points are corrected quickly.
      fetchCurrentUser({ forceRefresh: true })

      // Keep user profile (including points) in sync with server-side updates.
      const syncOnFocusOrVisible = () => fetchCurrentUser({ forceRefresh: true })
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          syncOnFocusOrVisible()
        }
      }
      window.addEventListener('focus', syncOnFocusOrVisible)
      document.addEventListener('visibilitychange', onVisibilityChange)
      const intervalId = window.setInterval(() => {
        fetchCurrentUser({ forceRefresh: true })
      }, USER_SYNC_INTERVAL_MS)

      return () => {
        window.clearInterval(intervalId)
        window.removeEventListener('focus', syncOnFocusOrVisible)
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
    }
  }, [currentUser?._id, dispatch])

  // PWA setup (keep existing code)
  useEffect(() => {
    const setupPWA = () => {
      try {
        if (window.navigator.standalone) {
          document.body.classList.add('ios-pwa')
        }

        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport) {
          viewport.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
          )
        }

        let startY = 0
        const handleTouchStart = (e) => {
          startY = e.touches[0].pageY
        }

        const handleTouchMove = (e) => {
          const currentY = e.touches[0].pageY
          const isAtTop = window.scrollY === 0
          const isPullingDown = currentY > startY

          if (
            isAtTop &&
            isPullingDown &&
            !e.target.closest('[data-scrollable]')
          ) {
            e.preventDefault()
          }
        }

        document.addEventListener('touchstart', handleTouchStart, {
          passive: true,
        })
        document.addEventListener('touchmove', handleTouchMove, {
          passive: false,
        })

        return () => {
          document.removeEventListener('touchstart', handleTouchStart)
          document.removeEventListener('touchmove', handleTouchMove)
        }
      } catch (error) {
        console.error('PWA setup error:', error)
      }
    }

    return setupPWA()
  }, [])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <LegacySpaSubdomainRedirect />
      <BrandingProvider>
        <Toaster 
          richColors 
          position="top-center" 
        />
        <InstallPrompt />
        <AppIconManager />

        <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/auth"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />

        <Route
          path="/claim-reward"
          element={
            <ClaimRewardPage />
          }
        />

        {/* Welcome route */}
        <Route
          path="/welcome"
          element={
            <WelcomeRoute />
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/spin"
          element={
            <ProtectedRoute>
              <ScratchSpinPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <ServiceCatalogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/membership"
          element={
            <ProtectedRoute>
              <MembershipPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/services/:serviceId"
          element={
            <ProtectedRoute>
              <ServiceDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking-success"
          element={
            <ProtectedRoute>
              <BookingSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rewards"
          element={
            <ProtectedRoute>
              <RewardsCatalogPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/management/bookings"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <BookingsManagementPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/management/bookings-database"
          element={
            <RoleProtectedRoute allowedRoles={["super-admin"]}>
              <BookingsDatabasePage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/Booking"
          element={
            <ProtectedRoute>
              <BookingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/:userId"
          element={
            <ProtectedRoute>
              <ClientProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <ReferralPage />
            </ProtectedRoute>
          }
        />

        {/* Admin-only routes */}
        <Route
          path="/contacts"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <ContactsPage />
            </RoleProtectedRoute>
          }
        />

        {/* Management routes */}
        <Route
          path="/management"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <ManagementPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/management/services"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <ServiceManagementPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/management/services-database"
          element={
            <RoleProtectedRoute allowedRoles={["super-admin"]}>
              <ServicesDatabasePage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/management/spin"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <ScratchSpinManagement />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/management/rewards"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <RewardManagement />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/management/referral"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <ManageReferralPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/management/revenue"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <ClientRevenuePage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/management/membership"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <MembershipManagementPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/management/calendar"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa"]}>
              <CalendarManagementPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/session"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "spa", "super-admin"]}>
              <SessionTrackerPage />
            </RoleProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
      </BrandingProvider>
    </BrowserRouter>
  );
}

export default App
