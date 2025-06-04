import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  Gift,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const NotificationPanel = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'appointment',
      title: 'New Appointment Booked',
      message: 'Emma Wilson booked a Hydrafacial for tomorrow at 2:00 PM',
      time: '2 minutes ago',
      read: false,
      icon: Calendar,
      color: 'text-pink-600 bg-pink-100',
    },
    {
      id: 2,
      type: 'review',
      title: '5-Star Review Received',
      message: 'Sarah left an amazing review for her Botox treatment',
      time: '15 minutes ago',
      read: false,
      icon: Star,
      color: 'text-yellow-600 bg-yellow-100',
    },
    {
      id: 3,
      type: 'ai',
      title: 'AI Recommendation',
      message:
        'Suggest vitamin C serum to 3 clients based on their skin analysis',
      time: '1 hour ago',
      read: false,
      icon: Sparkles,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      id: 4,
      type: 'loyalty',
      title: 'Loyalty Milestone',
      message: 'Jessica Martinez reached VIP status - send congratulations!',
      time: '2 hours ago',
      read: true,
      icon: Gift,
      color: 'text-pink-600 bg-pink-100',
    },
    {
      id: 5,
      type: 'reminder',
      title: 'Treatment Reminder',
      message: 'Follow up with clients who had laser treatments last week',
      time: '3 hours ago',
      read: true,
      icon: Clock,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      id: 6,
      type: 'staff',
      title: 'Team Update',
      message: 'Monthly staff meeting scheduled for Friday at 10:00 AM',
      time: '1 day ago',
      read: true,
      icon: Users,
      color: 'text-indigo-600 bg-indigo-100',
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Prevent body scroll when mobile panel is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isMobile])

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    )
  }

  // Close dropdown when clicking outside (desktop only)
  useEffect(() => {
    if (!isMobile) {
      const handleClickOutside = (event) => {
        if (isOpen && !event.target.closest('.notification-panel')) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobile])

  // Desktop dropdown variants
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: {
        duration: 0.15,
      },
    },
  }

  // Mobile slide variants
  const slideVariants = {
    hidden: {
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      },
    },
    visible: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      },
    },
    exit: {
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      },
    },
  }

  // Mobile overlay variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.3 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  }

  const notificationVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.3 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  }

  const NotificationContent = () => (
    <>
      {/* Header */}
      <div
        className={cn(
          'border-b border-gray-100 bg-white',
          isMobile ? 'px-4 py-3' : 'px-3 py-2.5'
        )}
      >
        <div className='flex items-center justify-between'>
          {/* Mobile back button */}
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(false)}
              className='p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
            >
              <ArrowLeft className='h-4 w-4' />
            </motion.button>
          )}

          <h3
            className={cn(
              'font-semibold text-gray-900',
              isMobile ? 'text-base' : 'text-sm'
            )}
          >
            Notifications
          </h3>

          {unreadCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={markAllAsRead}
              className='text-xs text-pink-600 hover:text-pink-700 font-medium'
            >
              Mark all read
            </motion.button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div
        className={cn(
          'overflow-y-auto bg-white',
          isMobile ? 'flex-1' : 'max-h-80'
        )}
      >
        {notifications.length === 0 ? (
          <div className='p-6 text-center'>
            <Bell className='h-10 w-10 text-gray-300 mx-auto mb-2' />
            <p className='text-gray-500 text-sm'>No notifications yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notification) => {
              const Icon = notification.icon
              return (
                <motion.div
                  key={notification.id}
                  variants={notificationVariants}
                  initial='hidden'
                  animate='visible'
                  exit='exit'
                  layout
                  className={cn(
                    'border-b border-gray-50 hover:bg-gray-50 transition-colors relative',
                    isMobile ? 'p-3' : 'p-2.5',
                    !notification.read && 'bg-white'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-start',
                      isMobile ? 'space-x-3' : 'space-x-2.5'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex-shrink-0 rounded-lg flex items-center justify-center',
                        isMobile ? 'w-8 h-8' : 'w-7 h-7',
                        notification.color
                      )}
                    >
                      <Icon
                        className={cn(isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5')}
                      />
                    </div>

                    {/* Content */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <h4
                          className={cn(
                            'leading-tight pr-2',
                            isMobile ? 'text-sm' : 'text-xs',
                            notification.read
                              ? 'text-gray-700'
                              : 'text-gray-900 font-medium'
                          )}
                        >
                          {notification.title}
                        </h4>

                        {/* Unread Indicator */}
                        {!notification.read && (
                          <div className='flex-shrink-0 w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full'></div>
                        )}
                      </div>

                      <p
                        className={cn(
                          'text-gray-500 leading-relaxed',
                          isMobile ? 'text-xs mt-0.5' : 'text-xs mt-0.5'
                        )}
                      >
                        {notification.message}
                      </p>
                      <p
                        className={cn(
                          'text-gray-400',
                          isMobile ? 'text-xs mt-1' : 'text-xs mt-0.5'
                        )}
                      >
                        {notification.time}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && !isMobile && (
        <div className='px-3 py-2 border-t border-gray-100 bg-white'>
          <button className='text-xs text-gray-600 hover:text-gray-800 transition-colors w-full text-center'>
            View all notifications
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className={cn('relative notification-panel', className)}>
      {/* Notification Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
      >
        <Bell className='h-5 w-5' />

        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className='absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded-full flex items-center justify-center font-semibold shadow-lg'
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Mobile Full Screen Overlay */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            variants={overlayVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            className='fixed inset-0 bg-black/20 backdrop-blur-sm z-50'
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {isMobile ? (
              /* Mobile Slide Panel */
              <motion.div
                variants={slideVariants}
                initial='hidden'
                animate='visible'
                exit='exit'
                className='fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 flex flex-col'
              >
                <NotificationContent />
              </motion.div>
            ) : (
              /* Desktop Dropdown */
              <motion.div
                variants={dropdownVariants}
                initial='hidden'
                animate='visible'
                exit='exit'
                className='absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden'
              >
                <NotificationContent />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationPanel
