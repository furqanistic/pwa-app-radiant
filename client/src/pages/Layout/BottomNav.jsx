// File: client/src/pages/Layout/BottomNav.jsx
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
import {
 logout,
 selectIsElevatedUser,
 selectIsSuperAdmin,
} from '@/redux/userSlice';
import { AnimatePresence, motion } from 'framer-motion';
import {
 Calendar,
 CompassIcon,
 Contact2,
 Gamepad2,
 Gift,
 LayoutDashboard,
 LogOut,
 Menu,
 QrCode,
 Star,
 User,
 Users,
 X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

const cn = (...classes) => classes.filter(Boolean).join(' ')

const BottomNav = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Selector for role-based access
  const isSuperAdmin = useSelector(selectIsSuperAdmin)
  const isElevatedUser = useSelector(selectIsElevatedUser)

  // Navigation logic mirrored from Layout.jsx
  const baseNavigationItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      href: '/dashboard',
      inBottomBar: true,
    },
    {
      id: 'services',
      label: 'Explore',
      icon: CompassIcon,
      href: '/services',
      inBottomBar: true,
    },
    {
      id: 'scanner',
      label: 'Scan',
      icon: QrCode,
      isScanner: true,
      onClick: () => setQrScannerOpen(true),
      inBottomBar: true,
    },
    {
      id: 'rewards',
      label: 'Rewards',
      icon: Star,
      href: '/rewards',
      inBottomBar: true,
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Contact2,
      href: '/contacts',
      superAdminOnly: true,
    },
    {
      id: 'booking',
      label: 'Booking',
      icon: Calendar,
      href: '/Booking',
    },
    {
      id: 'clients',
      label: 'Management',
      icon: Users,
      href: '/management',
      elevatedAccessRequired: true,
    },
    {
      id: 'referrals',
      label: 'Referrals',
      icon: Gift,
      href: '/referrals',
    },
    {
      id: 'gamification',
      label: 'Games',
      icon: Gamepad2,
      href: '/spin',
      hideForElevated: true,
    },
  ]

  // Filter items based on user role
  const allowedItems = baseNavigationItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin
    if (item.elevatedAccessRequired) return isElevatedUser
    if (item.hideForElevated && isElevatedUser) return false
    return true
  })

  // Split into bottom bar and "More" menu
  const bottomNavItems = [
    ...allowedItems.filter(item => item.inBottomBar),
    {
        id: 'more',
        label: 'More',
        icon: Menu,
        onClick: () => setShowMoreMenu(true),
    }
  ]

  const moreItems = [
    ...allowedItems.filter(item => !item.inBottomBar),
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      href: '/profile',
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: LogOut,
      onClick: () => {
        dispatch(logout())
        localStorage.removeItem('userToken')
        sessionStorage.clear()
        navigate('/auth')
      },
      className: 'text-red-500 hover:bg-red-50',
    },
  ]

  const handleMoreItemClick = (item) => {
    setShowMoreMenu(false)
    if (item.onClick) {
      item.onClick()
    } else if (item.href) {
      navigate(item.href)
    }
  }

  return (
    <>
      <nav className='lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border-t border-gray-100 pb-[env(safe-area-inset-bottom)]'>
        <div className='flex items-center justify-around h-16 max-w-lg mx-auto px-4 relative'>
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.href ? location.pathname === item.href : false

            if (item.isScanner) {
              return (
                <div key={item.id} className='relative -top-6 flex flex-col items-center w-14'>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={item.onClick}
                    className='flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 shadow-[0_8px_20px_-4px_rgba(252,42,115,0.4)] text-white border-4 border-white'
                  >
                    <Icon className='w-7 h-7' />
                  </motion.button>
                  <span className='absolute -bottom-8 text-[10px] font-bold text-pink-600 uppercase tracking-tighter w-20 text-center whitespace-nowrap bg-white/50 backdrop-blur-md rounded-full py-0.5 border border-pink-100/50 shadow-sm'>
                    {item.label}
                  </span>
                </div>
              )
            }

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => (item.onClick ? item.onClick() : navigate(item.href))}
                className={cn(
                  'relative flex flex-col items-center justify-center min-w-[50px] h-full transition-all duration-200',
                  isActive ? 'text-pink-600' : 'text-gray-400'
                )}
              >
                <div className='relative'>
                  <Icon className={cn('w-6 h-6 mb-1 transition-transform', isActive ? 'scale-110' : 'scale-100')} />
                  {isActive && (
                    <motion.div
                      layoutId='bottomNavIndicator'
                      className='absolute -top-1 -right-1 w-1.5 h-1.5 bg-pink-500 rounded-full'
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn('text-[10px] font-bold uppercase tracking-tighter', isActive ? 'text-pink-600' : 'text-gray-500')}>
                  {item.label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* More Menu Popover */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className='lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50'
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className='lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] pb-[calc(env(safe-area-inset-bottom)+1rem)] px-6 pt-8'
            >
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-xl font-bold text-gray-900'>Menu</h3>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className='p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors'
                >
                  <X className='w-5 h-5 text-gray-600' />
                </button>
              </div>

              <div className='grid grid-cols-1 gap-1 max-h-[60vh] overflow-y-auto pr-2'>
                {moreItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMoreItemClick(item)}
                      className={cn(
                        'flex items-center space-x-4 p-3.5 rounded-2xl transition-all duration-200',
                        item.className || 'hover:bg-pink-50 text-gray-700'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-xl flex-shrink-0',
                        item.id === 'logout' ? 'bg-red-100 text-red-600' : 'bg-pink-50 text-pink-600'
                      )}>
                        <Icon className='w-5 h-5' />
                      </div>
                      <span className='font-bold text-base'>{item.label}</span>
                    </motion.button>
                  )
                })}
              </div>

              <div className='mt-6 pt-6 border-t border-gray-100'>
                <p className='text-center text-xs text-gray-400 font-medium'>
                  RadiantAI • Beauty & Wellness v1.0
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
      />
    </>
  )
}

export default BottomNav
