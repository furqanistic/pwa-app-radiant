// File: client/src/App.jsx - UPDATED WITH SERVICE WORKER REGISTRATION
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
  // Service Worker Registration and Push Notification Setup
  useEffect(() => {
    // Register service worker and set up push notifications
    const setupServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) {
        console.log('Service Workers not supported')
        return
      }

      try {
        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready
        console.log('Service Worker is ready:', registration)

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('Message from service worker:', event.data)

          if (event.data.type === 'NOTIFICATION_CLICKED') {
            // Handle notification click
            const { notificationId, category, url } = event.data

            // You can dispatch Redux actions or navigate here
            console.log('Notification clicked:', {
              notificationId,
              category,
              url,
            })

            // Navigate to URL if provided
            if (url && url !== window.location.pathname) {
              window.location.href = url
            }
          }

          if (event.data.type === 'SYNC_COMPLETE') {
            // Handle sync complete
            console.log('Background sync completed')
            // You could refresh notifications or other data here
          }
        })

        // Listen for controller changes (service worker updates)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service worker updated, reloading page...')
          window.location.reload()
        })

        // Check for updates periodically
        setInterval(() => {
          registration.update().catch((err) => {
            console.error('SW update check failed:', err)
          })
        }, 60 * 60 * 1000) // Check every hour

        // iOS PWA specific handling
        if (window.navigator.standalone) {
          console.log('Running as iOS PWA')
          document.body.classList.add('ios-pwa')
        }

        // Handle visibility change for syncing
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            // App became visible, could refresh data
            console.log('App became visible')

            // Check for new notifications when app becomes visible
            if (registration.sync) {
              registration.sync.register('sync-notifications').catch((err) => {
                console.error('Background sync registration failed:', err)
              })
            }
          }
        })

        // Register periodic background sync if supported
        if ('periodicSync' in registration) {
          try {
            await registration.periodicSync.register('check-notifications', {
              minInterval: 60 * 60 * 1000, // 1 hour
            })
            console.log('Periodic background sync registered')
          } catch (err) {
            console.error('Periodic sync registration failed:', err)
          }
        }
      } catch (error) {
        console.error('Service Worker setup failed:', error)
      }
    }

    setupServiceWorker()

    // Prevent overscroll/pull-to-refresh on mobile
    const preventPullToRefresh = (e) => {
      if (e.touches.length !== 1) return

      const scrollY =
        window.pageYOffset ||
        document.body.scrollTop ||
        document.documentElement.scrollTop

      if (scrollY === 0 && e.touches[0].clientY > 0) {
        // User is at top and pulling down
        const target = e.target
        if (
          target.scrollTop === 0 &&
          target.scrollHeight <= target.clientHeight
        ) {
          e.preventDefault()
        }
      }
    }

    // Add touch event listeners for mobile PWA experience
    document.addEventListener('touchstart', preventPullToRefresh, {
      passive: false,
    })

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', preventPullToRefresh)
    }
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

        {/* Fallback route - redirect to auth if not logged in, dashboard if logged in */}
        <Route path='*' element={<Navigate to='/auth' replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
