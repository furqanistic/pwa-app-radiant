// File: client/src/App.jsx - FIXED SPA SELECTION GUARD
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useSelector } from 'react-redux'
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
import { authService } from './services/authService'

// Fixed Spa Selection Guard
const SpaSelectionGuard = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)
  const location = useLocation()

  // Get onboarding status
  const {
    data: onboardingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: authService.getOnboardingStatus,
    enabled: !!currentUser,
    retry: 1,
  })

  // Show loading while checking onboarding status
  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-600'>Checking spa selection...</p>
        </div>
      </div>
    )
  }

  // Handle errors
  if (error) {
    console.error('Onboarding status error:', error)
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-red-600'>
            Error checking spa selection. Please refresh.
          </p>
        </div>
      </div>
    )
  }

  // Check if user has selected spa - updated logic
  const hasSelectedSpa = onboardingData?.data?.onboardingStatus?.hasSelectedSpa
  const isOnWelcomePage = location.pathname === '/welcome'

  console.log('SpaSelectionGuard Debug:', {
    hasSelectedSpa,
    isOnWelcomePage,
    onboardingData: onboardingData?.data?.onboardingStatus,
    currentPath: location.pathname,
  })

  // If user hasn't selected spa and not on welcome page, redirect to welcome
  if (!hasSelectedSpa && !isOnWelcomePage) {
    console.log('Redirecting to welcome page - no spa selected')
    return <Navigate to='/welcome' replace />
  }

  // If user has selected spa and is on welcome page, redirect to dashboard
  if (hasSelectedSpa && isOnWelcomePage) {
    console.log('Redirecting to dashboard - spa already selected')
    return <Navigate to='/dashboard' replace />
  }

  return children
}

// Protected Route - requires authentication
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (!currentUser) {
    return <Navigate to='/auth' replace />
  }

  return <SpaSelectionGuard>{children}</SpaSelectionGuard>
}

// Role Protected Route - requires authentication and specific roles
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

// Public Route - redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (currentUser) {
    return <Navigate to='/dashboard' replace />
  }

  return children
}

// Welcome Route - special route that bypasses spa selection guard
const WelcomeRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (!currentUser) {
    return <Navigate to='/auth' replace />
  }

  return children
}

const App = () => {
  // PWA setup
  useEffect(() => {
    const setupPWA = () => {
      try {
        // iOS PWA detection
        if (window.navigator.standalone) {
          document.body.classList.add('ios-pwa')
        }

        // Viewport optimization
        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport) {
          viewport.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
          )
        }

        // Prevent pull-to-refresh
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

        {/* Welcome route - special handling */}
        <Route
          path='/welcome'
          element={
            <WelcomeRoute>
              <WelcomePage />
            </WelcomeRoute>
          }
        />

        {/* Protected routes - require auth and spa selection */}
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

        {/* Management routes - admin and team */}
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
