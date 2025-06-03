import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
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

const Layout = ({ children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

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

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      badge: null,
    },
    {
      id: 'bookings',
      label: 'Bookings',
      icon: Calendar,
      href: '/bookings',
      badge: { count: 12, color: 'bg-pink-500' },
    },
    {
      id: 'clients',
      label: 'Client Management',
      icon: Users,
      href: '/clients',
      badge: null,
    },
    {
      id: 'loyalty',
      label: 'Loyalty & Rewards',
      icon: Star,
      href: '/loyalty',
      badge: {
        text: 'NEW',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      },
    },
    {
      id: 'referrals',
      label: 'Referral System',
      icon: Gift,
      href: '/referrals',
      badge: null,
    },
    {
      id: 'gamification',
      label: 'Scratch & Spin',
      icon: Gamepad2,
      href: '/gamification',
      badge: {
        text: 'HOT',
        color: 'bg-gradient-to-r from-orange-500 to-red-500',
      },
    },
  ]

  const bottomItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '/profile',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/settings',
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: LogOut,
      href: '/auth',
      isLogout: true,
    },
  ]

  const NavItem = ({ item, onClick }) => {
    const Icon = item.icon
    const isActive =
      typeof window !== 'undefined' && window.location.pathname === item.href
    const isLogout = item.isLogout

    if (isLogout) {
      return (
        <motion.button
          variants={navItemVariants}
          whileHover='hover'
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            console.log('Logout clicked')
            onClick?.()
          }}
          className='w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 group relative overflow-hidden text-red-600 hover:bg-red-50 hover:text-red-700'
        >
          <div className='flex items-center space-x-2.5 flex-1 min-w-0'>
            <Icon className='w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors flex-shrink-0' />
            <span className='font-medium text-sm truncate'>{item.label}</span>
          </div>
        </motion.button>
      )
    }

    return (
      <motion.button
        variants={navItemVariants}
        whileHover='hover'
        whileTap={{ scale: 0.98 }}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden cursor-pointer',
          isActive
            ? 'bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 shadow-sm border border-pink-200/60'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
        onClick={() => {
          console.log(`Navigate to ${item.href}`)
          onClick?.()
        }}
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
        {item.badge && (
          <span
            className={cn(
              'flex-shrink-0 px-1.5 py-0.5 text-xs font-semibold text-white rounded-full ml-1.5',
              item.badge.color
            )}
          >
            {item.badge.count || item.badge.text}
          </span>
        )}
        {isActive && (
          <motion.div
            layoutId='activeIndicator'
            className='absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-purple-500 rounded-r-full'
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
      </motion.button>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Mobile Menu Button */}
      <div className='lg:hidden fixed top-4 left-4 z-50'>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(true)}
          className='p-2.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-200'
        >
          <Menu className='h-4 w-4 text-gray-700' />
        </motion.button>
      </div>

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
                    <NavItem item={item} onClick={() => setIsOpen(false)} />
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
                    <NavItem item={item} onClick={() => setIsOpen(false)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area - With proper margin for sidebar */}
      <main
        className={cn(
          'min-h-screen transition-all duration-200',
          // Desktop: always have left margin for sidebar
          'lg:ml-64',
          // Mobile: no margin when sidebar is closed
          !isDesktop && 'ml-0'
        )}
      >
        <div className='relative'>{children}</div>
      </main>
    </div>
  )
}

export default Layout
