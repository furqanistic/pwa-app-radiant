// File: client/src/App.jsx - UPDATED SpaSelectionGuard with better UX
import { Toaster } from '@/components/ui/sonner'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
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
import ClientRevenuePage from './pages/Management/ClientRevenuePage'
import ManagementPage from './pages/Management/ManagementPage'
import ServiceManagementPage from './pages/Management/ServiceManagementPage'
import SessionTrackerPage from './pages/Management/SessionTrackerPage'
import MembershipPage from './pages/Membership/MembershipPage'
import WelcomePage from './pages/Other/WelcomePage'
import ClientProfile from './pages/Profile/ClientProfile'
import ProfilePage from './pages/Profile/ProfilePage'
import ClaimRewardPage from './pages/QRCode/ClaimRewardPage'
import ManageReferralPage from './pages/Referral/ManageReferralPage'
import ReferralPage from './pages/Referral/ReferralPage'
import RewardManagement from './pages/Rewards/RewardManagement'
import RewardsCatalogPage from './pages/Rewards/RewardsCatalogPage'
import ScratchSpinManagement from './pages/Spin/ScratchSpinManagement'
import ScratchSpinPage from './pages/Spin/ScratchSpinPage'
import { loginFailure, loginSuccess, logout, updateProfile } from './redux/userSlice'
import { authService } from './services/authService'

// Scroll to top whenever the route changes
const ScrollToTop = () => {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return null
}

const adjustHex = (hex, amount) => {
  const sanitized = hex.replace('#', '')
  const num = parseInt(sanitized, 16)
  const clamp = (value) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0x00ff) + amount)
  const b = clamp((num & 0x0000ff) + amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// IMPROVED SpaSelectionGuard - Much better UX
const SpaSelectionGuard = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { locationId, branding, hasBranding } = useBranding()
  const location = useLocation()
  const dispatch = useDispatch()
  const [hasInitialCheck, setHasInitialCheck] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)

  // Check if user already has spa data in Redux
  const userHasSpaInRedux = !!(
    (['admin', 'super-admin'].includes(currentUser?.role)) ||
    (currentUser?.role === 'spa' && currentUser?.spaLocation?.locationId) ||
    (currentUser?.selectedLocation?.locationId &&
     currentUser?.selectedLocation?.locationName &&
     currentUser?.selectedLocation?.locationName.trim() !== '')
  )

  // Only query onboarding status if we don't have spa data in Redux
  const shouldCheckOnboarding =
    !!currentUser && !userHasSpaInRedux && !hasInitialCheck

  const {
    data: onboardingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: authService.getOnboardingStatus,
    enabled: shouldCheckOnboarding,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    onSuccess: (data) => {
      setHasInitialCheck(true)
      // Update Redux with the latest user data
      if (data?.data?.onboardingStatus) {
        const updatedUser = {
          ...currentUser,
          selectedLocation: data.data.onboardingStatus.selectedLocation,
          spaLocation: data.data.onboardingStatus.spaLocation, // Added for spa role
          hasSelectedSpa: data.data.onboardingStatus.hasSelectedSpa,
        }
        dispatch(updateProfile(updatedUser))
      }
    },
    onError: () => {
      setHasInitialCheck(true)
    },
  })

  // Determine spa selection status from Redux first, then API
  let hasSelectedSpa = userHasSpaInRedux

  if (!userHasSpaInRedux && onboardingData?.data?.onboardingStatus) {
    hasSelectedSpa = onboardingData.data.onboardingStatus.hasSelectedSpa
  }

  useEffect(() => {
    if (shouldCheckOnboarding && isLoading && !hasInitialCheck) {
      const timer = setTimeout(() => setShowLoader(true), 350)
      return () => clearTimeout(timer)
    }
    setShowLoader(false)
  }, [shouldCheckOnboarding, isLoading, hasInitialCheck])

  const isOnWelcomePage = location.pathname === '/welcome'
  const buildSpaPath = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path

  // IMPROVED: Only show loader when actually needed
  if (shouldCheckOnboarding && isLoading && !hasInitialCheck && showLoader) {
    return (
      <div
        className='min-h-screen flex items-center justify-center relative overflow-hidden'
        style={{
          background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColorDark} 100%)`,
        }}
      >
        {/* Animated background pattern */}
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-32 -translate-y-32 blur-3xl animate-pulse'></div>
          <div
            className='absolute bottom-0 right-0 w-96 h-96 rounded-full translate-x-32 translate-y-32 blur-3xl animate-pulse'
            style={{ backgroundColor: `${brandColor}66` }}
          ></div>
        </div>

        <div className='relative z-10 text-center'>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className='bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl'
          >
            {hasBranding && branding?.logo ? (
              <div className='w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/15 border border-white/25 shadow-lg flex items-center justify-center'>
                <img
                  src={branding.logo}
                  alt={branding.name}
                  className='w-10 h-10 object-contain'
                />
              </div>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className='w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6 shadow-lg'
              />
            )}
            <h2 className='text-2xl font-bold text-white mb-2 tracking-wide'>
              {branding?.name || 'RadiantAI'}
            </h2>
            <p className='text-white/80 text-sm font-medium animate-pulse'>
              Loading your experience...
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  // Handle errors gracefully without blocking navigation
  if (error && !hasInitialCheck) {
    console.error('Onboarding status error:', error)
    // Allow navigation but log the error - don't block user
    setHasInitialCheck(true)
  }

  // No longer need to redirect based on SPA selection since it happens before login
  // Just pass through - location selection is now handled at /auth
  return children
}

// Rest of the component remains the same...
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)
  const token = localStorage.getItem('token')

  if (!currentUser && token) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='text-sm font-semibold text-gray-500'>Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to='/auth' replace />
  }

  return <SpaSelectionGuard>{children}</SpaSelectionGuard>
}

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser } = useSelector((state) => state.user)
  const token = localStorage.getItem('token')

  if (!currentUser && token) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='text-sm font-semibold text-gray-500'>Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to='/auth' replace />
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

const WelcomeRoute = ({ children }) => {
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

  if (!currentUser || !token) {
    return <Navigate to={buildSpaPath('/auth')} replace />
  }

  return children
}

const App = () => {
  const dispatch = useDispatch()
  const { currentUser } = useSelector((state) => state.user)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0', 10)
    const maxIdleMs = 30 * 24 * 60 * 60 * 1000
    if (lastActivity && Date.now() - lastActivity > maxIdleMs) {
      dispatch(logout())
      localStorage.removeItem('token')
      return
    }

    const fetchCurrentUser = async () => {
      try {
        const response = await authService.getCurrentUser()
        const user = response?.data?.user || response?.data || response?.user
        if (user) {
          dispatch(loginSuccess({ data: { user }, token }))
          localStorage.setItem('lastActivity', `${Date.now()}`)
        }
      } catch (error) {
        dispatch(loginFailure(error.response?.data?.message || 'Session expired'))
        dispatch(logout())
        localStorage.removeItem('token')
      }
    }

    if (!currentUser) {
      fetchCurrentUser()
    }
  }, [currentUser, dispatch])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const refreshActivity = () => {
      localStorage.setItem('lastActivity', `${Date.now()}`)
    }

    refreshActivity()

    const events = ['click', 'keydown', 'touchstart', 'scroll', 'mousemove']
    events.forEach((event) => window.addEventListener(event, refreshActivity, { passive: true }))
    document.addEventListener('visibilitychange', refreshActivity)

    return () => {
      events.forEach((event) => window.removeEventListener(event, refreshActivity))
      document.removeEventListener('visibilitychange', refreshActivity)
    }
  }, [])

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
      <BrandingProvider>
        <Toaster 
          richColors 
          position="top-center" 
          toastOptions={{
            style: { background: 'var(--brand-primary)', color: 'white', border: 'none' },
            classNames: {
              toast: 'bg-[color:var(--brand-primary)]',
              title: 'text-white',
              description: 'text-white',
              actionButton: 'bg-white text-[color:var(--brand-primary)]',
              cancelButton: 'bg-white text-[color:var(--brand-primary)]',
              success: 'bg-[color:var(--brand-primary)] text-white border-none',
              error: 'bg-[color:var(--brand-primary)] text-white border-none', 
            }
          }}
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
            <WelcomeRoute>
              <WelcomePage />
            </WelcomeRoute>
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
