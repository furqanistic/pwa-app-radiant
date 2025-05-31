const cn = (...classes) => classes.filter(Boolean).join(' ')
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Calendar,
  Gamepad2,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Smartphone,
  Sparkles,
  Star,
  UserCircle,
  Users,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

const Layout = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeItem, setActiveItem] = useState('dashboard')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

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
      label: 'Smart Booking',
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
      icon: UserCircle,
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
      href: '/logout',
      isLogout: true,
    },
  ]

  const NavItem = ({ item, onClick }) => {
    const Icon = item.icon
    const isActive = activeItem === item.id
    const isLogout = item.isLogout

    return (
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (isLogout) {
            // Handle logout logic here
            console.log('Logout clicked')
            onClick?.()
          } else {
            setActiveItem(item.id)
            onClick?.()
          }
        }}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 group relative overflow-hidden',
          isLogout
            ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
            : isActive
            ? 'bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 shadow-sm border border-pink-200/60'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <div className='flex items-center space-x-2.5 flex-1 min-w-0'>
          <Icon
            className={cn(
              'w-5 h-5 transition-colors flex-shrink-0',
              isLogout
                ? 'text-red-500 group-hover:text-red-600'
                : isActive
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

        {isActive && !isLogout && (
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
    <>
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
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className='lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40'
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isDesktop ? 0 : isOpen ? 0 : '-100%',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
        className={cn(
          'fixed lg:relative top-0 left-0 h-screen w-64 z-50 lg:z-auto',
          'bg-white border-r border-gray-200',
          'flex flex-col',
          className
        )}
      >
        {/* Header */}
        <div className='relative px-4 py-4 border-b border-gray-100'>
          {/* Close button */}
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
            <div className='relative flex-shrink-0'>
              <img
                src='/favicon_io/android-chrome-512x512.png'
                alt='RadiantAI Logo'
                className='w-8 h-8 rounded-xl object-cover border border-gray-200'
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div
                className='w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center border border-gray-200'
                style={{ display: 'none' }}
              >
                <Sparkles className='w-4 h-4 text-white' />
              </div>
              <div className='absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border border-white'></div>
            </div>
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

        {/* Navigation */}
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

        {/* Bottom Section */}
        <div className='px-3 py-3 border-t border-gray-100'>
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
      </motion.aside>
    </>
  )
}

export default Layout
