// File: client/src/App.jsx - UPDATED SpaSelectionGuard with better UX

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import AuthPage from './pages/Auth/AuthPage'
import ServiceCatalogPage from './pages/Bookings/ServiceCatalogPage'
import ServiceDetailPage from './pages/Bookings/ServiceDetailPage'
import BookingSuccessPage from './pages/Bookings/BookingSuccessPage'
import CartPage from './pages/Cart/CartPage'
import ContactsPage from './pages/Contacts/ContactsPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import InstallPrompt from './pages/Layout/InstallPrompt'
import ManagementPage from './pages/Management/ManagementPage'
import ServiceManagementPage from './pages/Management/ServiceManagementPage'
import SessionTrackerPage from './pages/Management/SessionTrackerPage'
import WelcomePage from './pages/Other/WelcomePage'
import ClientProfile from './pages/Profile/ClientProfile'
import ProfilePage from './pages/Profile/ProfilePage'
import ManageReferralPage from './pages/Referral/ManageReferralPage'
import ReferralPage from './pages/Referral/ReferralPage'
import RewardManagement from './pages/Rewards/RewardManagement'
import RewardsCatalogPage from './pages/Rewards/RewardsCatalogPage'
import ScratchSpinManagement from './pages/Spin/ScratchSpinManagement'
import ScratchSpinPage from './pages/Spin/ScratchSpinPage'
import { updateProfile } from './redux/userSlice'
import { authService } from './services/authService'

// IMPROVED SpaSelectionGuard - Much better UX
const SpaSelectionGuard = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)
  const location = useLocation()
  const dispatch = useDispatch()
  const [hasInitialCheck, setHasInitialCheck] = useState(false)

  // Check if user already has spa data in Redux
  const userHasSpaInRedux = !!(
    currentUser?.selectedLocation?.locationId &&
    currentUser?.selectedLocation?.locationName &&
    currentUser?.selectedLocation?.locationName.trim() !== ''
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

  // IMPROVED: Only show loader when actually needed
  if (shouldCheckOnboarding && isLoading && !hasInitialCheck) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2'></div>
          <p className='text-gray-500 text-sm'>Loading...</p>
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
    return <Navigate to='/welcome' replace />
  }

  if (hasSelectedSpa && isOnWelcomePage) {
    return <Navigate to='/dashboard' replace />
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

  if (currentUser) {
    return <Navigate to='/dashboard' replace />
  }

  return children
}

const WelcomeRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (!currentUser) {
    return <Navigate to='/auth' replace />
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
      <Toaster
        position='top-center'
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: '14px',
            padding: '12px 16px',
          },
        }}
      />
      <InstallPrompt />

      <Routes>
        {/* Public routes */}
        <Route
          path='/'
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path='/auth'
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />

        {/* Welcome route */}
        <Route
          path='/welcome'
          element={
            <WelcomeRoute>
              <WelcomePage />
            </WelcomeRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path='/dashboard'
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/spin'
          element={
            <ProtectedRoute>
              <ScratchSpinPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/bookings'
          element={
            <ProtectedRoute>
              <ServiceCatalogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/bookings/:serviceId'
          element={
            <ProtectedRoute>
              <ServiceDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/booking-success'
          element={
            <ProtectedRoute>
              <BookingSuccessPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/cart'
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/services'
          element={
            <ProtectedRoute>
              <RewardsCatalogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/profile'
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/client/:userId'
          element={
            <ProtectedRoute>
              <ClientProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path='/referrals'
          element={
            <ProtectedRoute>
              <ReferralPage />
            </ProtectedRoute>
          }
        />

        {/* Admin-only routes */}
        <Route
          path='/contacts'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'super-admin']}>
              <ContactsPage />
            </RoleProtectedRoute>
          }
        />

        {/* Management routes */}
        <Route
          path='/management'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team', 'super-admin']}>
              <ManagementPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path='/management/services'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team', 'super-admin']}>
              <ServiceManagementPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path='/management/spin'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team', 'super-admin']}>
              <ScratchSpinManagement />
            </RoleProtectedRoute>
          }
        />

        <Route
          path='/management/rewards'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team', 'super-admin']}>
              <RewardManagement />
            </RoleProtectedRoute>
          }
        />

        <Route
          path='/management/referral'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team', 'super-admin']}>
              <ManageReferralPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path='/session'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team', 'super-admin']}>
              <SessionTrackerPage />
            </RoleProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path='*' element={<Navigate to='/auth' replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
