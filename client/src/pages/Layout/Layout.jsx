// File: client/src/pages/Layout/Layout.jsx
import PushNotificationPrompt from '@/components/Notifications/PushNotificationPrompt'
import {
  logout,
  selectIsElevatedUser,
  selectIsSuperAdmin,
} from '@/redux/userSlice'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  CompassIcon,
  Contact2,
  Gamepad2,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Star,
  User,
  Users,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'; // Add useSelector
import { useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'; // Import the BottomNav component
import Topbar from './Topbar'; // Import the Topbar component

const cn = (...classes) => classes.filter(Boolean).join(' ')

// Animation variants
const sidebarVariants = {
  open: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  closed: {
    x: '-100%',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
}

const overlayVariants = {
  open: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  closed: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

const navItemVariants = {
  hover: {
    x: 4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
}

const Layout = ({
  children,
  className = '',
  showTopbarNotifications = true,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  // Initialize isDesktop properly to prevent flash
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return false
  })
  const [isNavigating, setIsNavigating] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()

  // Add selectors to check user roles
  const isSuperAdmin = useSelector(selectIsSuperAdmin)
  const isElevatedUser = useSelector(selectIsElevatedUser)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    if (isOpen && !isDesktop) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isDesktop])

  // Close mobile menu when route changes and reset loading state
  useEffect(() => {
    setIsOpen(false)
    setIsNavigating(false)
  }, [location.pathname, location.search, location.hash])

  // Base navigation items with role-based access control
  const baseNavigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      badge: null,
      // Available to everyone
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Contact2,
      href: '/contacts',
      superAdminOnly: true, // Only super-admin can access
    },
    {
      id: 'services',
      label: 'Services',
      icon: CompassIcon,
      href: '/services',
    },
    {
      id: 'booking',
      label: 'Booking',
      icon: Calendar,
      href: '/Booking',
      badge: null,
      // Available to everyone
    },
    {
      id: 'clients',
      label: 'Client Management',
      icon: Users,
      href: '/management',
      badge: null,
      elevatedAccessRequired: true, // Requires elevated access (super-admin, admin, team, enterprise)
    },
    {
      id: 'rewards',
      label: 'Claim Rewards',
      icon: Star,
      href: '/rewards',
      badge: {
        text: 'NEW',
        color:
          'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-600 ',
      },
      // Available to everyone
    },
    {
      id: 'referrals',
      label: 'Referral System',
      icon: Gift,
      href: '/referrals',
      badge: null,
      // Available to everyone
    },
    {
      id: 'gamification',
      label: 'Scratch & Spin',
      icon: Gamepad2,
      href: '/spin',
      badge: {
        text: 'HOT',
        color:
          'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-600 ',
      },
      hideForElevated: true,
      // Available to everyone
    },
  ]

  // Filter navigation items based on user role
  const navigationItems = baseNavigationItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin
    if (item.elevatedAccessRequired) return isElevatedUser
    if (item.hideForElevated && isElevatedUser) return false // 👈 hide for elevated
    return true
  })

  const bottomItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '/profile',
    },

    {
      id: 'logout',
      label: 'Logout',
      icon: LogOut,
      href: '/auth',
      isLogout: true,
    },
  ]

  const handleNavigation = async (href, isLogout = false) => {
    try {
      // If we're already on this route and it's not a logout, just close the menu
      if (location.pathname === href && !isLogout) {
        setIsOpen(false)
        return
      }

      setIsNavigating(true)

      if (isLogout) {
        dispatch(logout())
        localStorage.removeItem('userToken')
        sessionStorage.clear()
      }

      // Navigate to the new route
      navigate(href)

      // Close mobile menu
      setIsOpen(false)

      // Fallback: Reset loading state after a short delay in case route doesn't change
      setTimeout(() => {
        setIsNavigating(false)
      }, 500)
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigating(false)
    }
  }

  const NavItem = ({ item }) => {
    const Icon = item.icon
    const isActive = location.pathname === item.href
    const isLogout = item.isLogout

    if (isLogout) {
      return (
        <motion.button
          variants={navItemVariants}
          whileHover='hover'
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation(item.href, true)}
          disabled={isNavigating}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 group relative overflow-hidden text-red-600 hover:bg-red-50 hover:text-red-700',
            isNavigating && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className='flex items-center space-x-2.5 flex-1 min-w-0'>
            <Icon className='w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors flex-shrink-0' />
            <span className='font-medium text-sm truncate'>{item.label}</span>
          </div>
          {isNavigating && (
            <div className='w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin flex-shrink-0' />
          )}
        </motion.button>
      )
    }

    return (
      <motion.button
        variants={navItemVariants}
        whileHover='hover'
        whileTap={{ scale: 0.98 }}
        onClick={() => handleNavigation(item.href)}
        disabled={isNavigating || isActive}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden',
          isActive
            ? 'bg-gradient-to-r from-pink-50 to-pink-50 text-pink-700 shadow-sm border border-pink-200/60 cursor-default'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer',
          isNavigating && !isActive && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className='flex items-center space-x-2.5 flex-1 min-w-0'>
          <Icon
            className={cn(
              'w-5 h-5 transition-colors flex-shrink-0',
              isActive
                ? 'text-pink-600'
                : 'text-gray-400 group-hover:text-gray-600'
            )}
          />
          <span className='font-medium text-sm truncate'>{item.label}</span>
        </div>
        <div className='flex items-center space-x-2'>
          {item.badge && (
            <span
              className={cn(
                'flex-shrink-0 px-1.5 py-0.5 text-xs font-semibold text-white rounded-full',
                item.badge.color
              )}
            >
              {item.badge.count || item.badge.text}
            </span>
          )}
          {isNavigating && location.pathname !== item.href && (
            <div className='w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin flex-shrink-0' />
          )}
        </div>
        {isActive && (
          <motion.div
            layoutId='activeIndicator'
            className='absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-600  rounded-r-full'
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
      </motion.button>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && !isDesktop && (
          <motion.div
            variants={overlayVariants}
            initial='closed'
            animate='open'
            exit='closed'
            onClick={() => setIsOpen(false)}
            className='lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40'
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Fixed positioning for desktop, animated for mobile */}
      <motion.aside
        variants={sidebarVariants}
        initial={false}
        animate={isDesktop ? 'open' : isOpen ? 'open' : 'closed'}
        className={cn(
          // Fixed positioning and size
          'fixed top-0 left-0 h-screen w-64 z-50',
          // Desktop styles
          'lg:z-auto',
          // Background and styling
          'bg-white border-r border-gray-200',
          'flex flex-col',
          className
        )}
      >
        {/* Header - Fixed height */}
        <div className='relative px-4 py-4 border-b border-gray-100 flex-shrink-0'>
          {/* Close button for mobile */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(false)}
            className='lg:hidden absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <X className='h-4 w-4 text-gray-500' />
          </motion.button>

          {/* Brand */}
          <div className='flex items-center space-x-2.5 pr-6'>
            <div className='min-w-0 flex-1'>
              <h1 className='text-base font-bold text-gray-900 truncate'>
                RadiantAI
              </h1>
              <p className='text-xs text-gray-500 font-medium'>
                Beauty & Wellness
              </p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable content */}
        <div className='flex-1 flex flex-col min-h-0'>
          {/* Main Navigation - Scrollable */}
          <nav className='flex-1 px-3 py-3 overflow-y-auto'>
            <div className='mb-4'>
              <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2'>
                Navigation
              </h2>
              <div className='space-y-0.5'>
                {navigationItems.map((item) => (
                  <div key={item.id}>
                    <NavItem item={item} />
                  </div>
                ))}
              </div>
            </div>
          </nav>

          {/* Bottom Section - Fixed at bottom */}
          <div className='flex-shrink-0 px-3 py-3 border-t border-gray-100'>
            <div className='mb-2'>
              <h2 className='text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2'>
                Account
              </h2>
              <div className='space-y-0.5'>
                {bottomItems.map((item) => (
                  <div key={item.id}>
                    <NavItem item={item} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
      <BottomNav />

      {/* Main Content Area - With proper margin for sidebar */}
      <main
        className={cn(
          'min-h-screen transition-all duration-200',
          // Desktop: always have left margin for sidebar
          'lg:ml-64',
          // Mobile: no margin when sidebar is closed, add padding for bottom nav
          !isDesktop && 'ml-0 pb-20'
        )}
      >
        {/* Topbar */}
        <Topbar
          showNotifications={showTopbarNotifications}
          onMenuClick={() => setIsOpen(true)}
          showMobileMenu={!isDesktop}
        />

        <div className='relative'>
          {/* Loading overlay for navigation */}
          {isNavigating && (
            <div className='absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center'>
              <div className='flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-lg'>
                <div className='w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin' />
                <span className='text-sm text-gray-600'>Loading...</span>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Push Notification prompt for PWA user engagement */}
      <PushNotificationPrompt />
    </div>
  )
}

export default Layout
