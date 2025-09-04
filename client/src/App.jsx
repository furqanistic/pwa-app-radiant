// File: client/src/App.jsx - SIMPLIFIED VERSION FOR MOBILE
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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

// Protected Route Component - requires authentication
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (!currentUser) {
    return <Navigate to='/auth' replace />
  }

  return children
}

// Role Protected Route Component - requires authentication and specific roles
const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (!currentUser) {
    return <Navigate to='/auth' replace />
  }

  // Check if user has one of the allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    // Redirect to dashboard if user doesn't have required role
    return <Navigate to='/dashboard' replace />
  }

  return children
}

// Public Route Component - redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (currentUser) {
    return <Navigate to='/dashboard' replace />
  }

  return children
}

const App = () => {
  // SIMPLIFIED: Minimal mobile PWA setup
  useEffect(() => {
    // Basic mobile PWA optimizations
    const setupMobilePWA = () => {
      try {
        // iOS PWA detection
        if (window.navigator.standalone) {
          console.log('Running as iOS PWA')
          document.body.classList.add('ios-pwa')
        }

        // Basic viewport fixes for mobile
        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport) {
          viewport.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
          )
        }

        // Prevent mobile pull-to-refresh - SIMPLIFIED version
        let startY = 0
        let isScrollable = false

        const handleTouchStart = (e) => {
          startY = e.touches[0].pageY
          const scrollableElement = e.target.closest('[data-scrollable]')
          isScrollable = scrollableElement !== null
        }

        const handleTouchMove = (e) => {
          if (isScrollable) return // Allow scrolling in scrollable areas

          const currentY = e.touches[0].pageY
          const isAtTop = window.scrollY === 0
          const isPullingDown = currentY > startY

          // Prevent pull-to-refresh only when at top of page
          if (isAtTop && isPullingDown) {
            e.preventDefault()
          }
        }

        document.addEventListener('touchstart', handleTouchStart, {
          passive: true,
        })
        document.addEventListener('touchmove', handleTouchMove, {
          passive: false,
        })

        // Cleanup function
        return () => {
          document.removeEventListener('touchstart', handleTouchStart)
          document.removeEventListener('touchmove', handleTouchMove)
        }
      } catch (error) {
        console.error('Mobile PWA setup error:', error)
      }
    }

    const cleanup = setupMobilePWA()

    // Return cleanup function
    return cleanup
  }, [])

  return (
    <BrowserRouter>
      <Toaster position='top-center' />
      <InstallPrompt />
      <Routes>
        {/* Public routes - only accessible when not logged in */}
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

        {/* Protected routes - only accessible when logged in */}
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
          path='/contacts'
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/dashboard'
          element={
            <ProtectedRoute>
              <DashboardPage />
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
        <Route
          path='/welcome'
          element={
            <ProtectedRoute>
              <WelcomePage />
            </ProtectedRoute>
          }
        />

        {/* Management routes - only accessible by admin and team roles */}
        <Route
          path='/management'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team']}>
              <ManagementPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path='/management/services'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team']}>
              <ServiceManagementPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path='/management/spin'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team']}>
              <ScratchSpinManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path='/management/rewards'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team']}>
              <RewardManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path='/management/referral'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team']}>
              <ManageReferralPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path='/session'
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'team']}>
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
