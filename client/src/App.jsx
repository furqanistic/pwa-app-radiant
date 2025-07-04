import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/Auth/AuthPage'
import BookingsPage from './pages/Bookings/BookingsPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import HomePage from './pages/Home/HomePage'
import InstallPrompt from './pages/Layout/InstallPrompt'
import ManagementPage from './pages/Management/ManagementPage'
import WelcomePage from './pages/Other/WelcomePage'
import ProfilePage from './pages/Profile/ProfilePage'
import ReferralPage from './pages/Referral/ReferralPage'
import RewardsLoyaltyPage from './pages/Rewards/RewardsPage'
import ScratchSpinPage from './pages/Spin/ScratchSpinPage'

const App = () => {
  return (
    <BrowserRouter>
      <Toaster position='top-center' />
      <InstallPrompt />
      <Routes>
        <Route path='/' element={<AuthPage />} />
        <Route path='/auth' element={<AuthPage />} />
        <Route path='/spin' element={<ScratchSpinPage />} />
        <Route path='/bookings' element={<BookingsPage />} />
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/loyalty' element={<RewardsLoyaltyPage />} />
        <Route path='/profile' element={<ProfilePage />} />
        <Route path='/referrals' element={<ReferralPage />} />
        <Route path='/welcome' element={<WelcomePage />} />
        <Route path='/management' element={<ManagementPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
