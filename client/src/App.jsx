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

import { BrandingProvider } from './context/BrandingContext'
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
import { updateProfile } from './redux/userSlice'
import { authService } from './services/authService'
import { useBranding } from './context/BrandingContext'

// IMPROVED SpaSelectionGuard - Much better UX
const SpaSelectionGuard = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { locationId } = useBranding()
  const location = useLocation()
  const dispatch = useDispatch()
  const [hasInitialCheck, setHasInitialCheck] = useState(false)

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

  const isOnWelcomePage = location.pathname === '/welcome'
  const buildSpaPath = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path

  // IMPROVED: Only show loader when actually needed
  if (shouldCheckOnboarding && isLoading && !hasInitialCheck) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 flex items-center justify-center relative overflow-hidden'>
        {/* Animated background pattern */}
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-32 -translate-y-32 blur-3xl animate-pulse'></div>
          <div className='absolute bottom-0 right-0 w-96 h-96 bg-rose-300 rounded-full translate-x-32 translate-y-32 blur-3xl animate-pulse'></div>
        </div>

        <div className='relative z-10 text-center'>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className='bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl'
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className='w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6 shadow-lg'
            />
            <h2 className='text-2xl font-bold text-white mb-2 tracking-wide'>
              RadiantAI
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

  // Redirect logic remains the same
  if (!hasSelectedSpa && !isOnWelcomePage) {
    return <Navigate to={buildSpaPath('/welcome')} replace />
  }

  if (hasSelectedSpa && isOnWelcomePage) {
    return <Navigate to={buildSpaPath('/dashboard')} replace />
  }

  return children
}

// Rest of the component remains the same...
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (!currentUser) {
    return <Navigate to='/auth' replace />
  }

  return <SpaSelectionGuard>{children}</SpaSelectionGuard>
}

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser } = useSelector((state) => state.user)

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
  const buildSpaPath = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path

  if (currentUser) {
    return <Navigate to={buildSpaPath('/dashboard')} replace />
  }

  return children
}

const WelcomeRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { locationId } = useBranding()
  const buildSpaPath = (path) =>
    locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path

  if (!currentUser) {
    return <Navigate to={buildSpaPath('/auth')} replace />
  }

  return children
}

const App = () => {
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
      <BrandingProvider>
        <Toaster 
          richColors 
          position="top-center" 
          toastOptions={{
            style: { background: '#fc2a73', color: 'white', border: 'none' },
            classNames: {
              toast: 'bg-[#fc2a73]',
              title: 'text-white',
              description: 'text-white',
              actionButton: 'bg-white text-[#fc2a73]',
              cancelButton: 'bg-white text-[#fc2a73]',
              success: 'bg-[#fc2a73] text-white border-none',
              error: 'bg-red-500 text-white border-none', 
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
