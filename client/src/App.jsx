import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/Auth/AuthPage'
import BookingsPage from './pages/Bookings/BookingsPage'
import HomePage from './pages/Home/HomePage'

const App = () => {
  return (
    <BrowserRouter>
      <Toaster position='top-center' />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/auth' element={<AuthPage />} />
        <Route path='/bookings' element={<BookingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
