// File: client/src/App.jsx
// client/src/App.jsx
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
import ProfilePage from './pages/Profile/ProfilePage'
import ManageReferralPage from './pages/Referral/ManageReferralPage'
import ReferralPage from './pages/Referral/ReferralPage'
import RewardManagement from './pages/Rewards/RewardManagement'
import RewardsCatalogPage from './pages/Rewards/RewardsCatalogPage'
import ScratchSpinPage from './pages/Spin/ScratchSpinPage'

// Protected Route Component - requires authentication
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user)

  if (!currentUser) {
    return <Navigate to='/auth' replace />
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
        <Route
          path='/management'
          element={
            <ProtectedRoute>
              <ManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/management/services'
          element={
            <ProtectedRoute>
              <ServiceManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/management/rewards'
          element={
            <ProtectedRoute>
              <RewardManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path='/management/referral'
          element={
            <ProtectedRoute>
              <ManageReferralPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/session'
          element={
            <ProtectedRoute>
              <SessionTrackerPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback route - redirect to auth if not logged in, dashboard if logged in */}
        <Route path='*' element={<Navigate to='/auth' replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
