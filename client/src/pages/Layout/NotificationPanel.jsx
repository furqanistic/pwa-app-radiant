// client/src/pages/Layout/NotificationPanel.jsx
import { axiosInstance } from '@/config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Clock,
  Gift,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

const cn = (...classes) => classes.filter(Boolean).join(' ')

// API functions
const fetchNotifications = async (token, params = {}) => {
  const response = await axiosInstance.get('/notifications', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  })
  return response.data
}

const fetchUnreadCount = async (token) => {
  const response = await axiosInstance.get('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data.data.unreadCount
}

const markAllAsSeen = async (token) => {
  await axiosInstance.put(
    '/notifications/mark-all-seen',
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
}

const deleteNotification = async ({ notificationId, token }) => {
  await axiosInstance.delete(`/notifications/${notificationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

const NotificationPanel = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [hasMarkedAsSeen, setHasMarkedAsSeen] = useState(false)
  const token = useSelector((state) => state.user.token)
  const queryClient = useQueryClient()
  const markAsSeenTimeoutRef = useRef(null)

  // Detect mobile
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      queryClient.invalidateQueries(['notifications'])
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queryClient])

  // Prevent body scroll on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, isMobile])

  // Close on outside click (desktop)
  useEffect(() => {
    if (!isMobile && isOpen) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.notification-panel')) setIsOpen(false)
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobile])

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    setIsManualRefreshing(true)
    queryClient.invalidateQueries(['notifications']).finally(() => {
      setTimeout(() => setIsManualRefreshing(false), 800)
    })
  }, [queryClient])

  // Professional refetch intervals - less aggressive
  const getRefetchInterval = () => {
    if (!isOnline) return false
    if (isOpen) return 30000 // 30 seconds when open
    return 60000 // 1 minute when closed
  }

  // Queries with professional intervals
  const { data: unreadCount = 0, isLoading: unreadLoading } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetchUnreadCount(token),
    enabled: !!token && isOnline,
    refetchInterval: getRefetchInterval(),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 15000, // 15 seconds stale time
    cacheTime: 300000, // 5 minutes cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: () => fetchNotifications(token, { limit: 50 }),
    enabled: !!token && isOpen && isOnline,
    refetchInterval: isOpen ? 30000 : false,
    refetchOnWindowFocus: false, // Less aggressive
    refetchOnReconnect: true,
    staleTime: 15000,
    cacheTime: 300000,
    retry: 2,
  })

  // Mark as seen mutation
  const markAsSeenMutation = useMutation({
    mutationFn: markAllAsSeen,
    onMutate: async () => {
      // Optimistically set unread count to 0
      queryClient.setQueryData(['notifications', 'unread-count'], 0)
    },
    onError: () => {
      // Refetch to get correct state
      queryClient.invalidateQueries(['notifications', 'unread-count'])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
    },
  })

  // Auto-mark as seen when panel opens (like WhatsApp, Slack)
  useEffect(() => {
    if (isOpen && !hasMarkedAsSeen && unreadCount > 0 && token) {
      // Clear any existing timeout
      if (markAsSeenTimeoutRef.current) {
        clearTimeout(markAsSeenTimeoutRef.current)
      }

      // Mark as seen after 1 second of viewing (professional delay)
      markAsSeenTimeoutRef.current = setTimeout(() => {
        markAsSeenMutation.mutate(token)
        setHasMarkedAsSeen(true)
      }, 1000)
    }

    // Reset the flag when panel closes
    if (!isOpen) {
      setHasMarkedAsSeen(false)
      if (markAsSeenTimeoutRef.current) {
        clearTimeout(markAsSeenTimeoutRef.current)
      }
    }

    return () => {
      if (markAsSeenTimeoutRef.current) {
        clearTimeout(markAsSeenTimeoutRef.current)
      }
    }
  }, [isOpen, hasMarkedAsSeen, unreadCount, token, markAsSeenMutation])

  const getIcon = (category) => {
    const icons = {
      points: Star,
      promotion: Gift,
      system: Sparkles,
      general: MessageSquare,
    }
    const Icon = icons[category] || MessageSquare
    return <Icon className={cn(isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
  }

  const getIconColor = (category) => {
    const colors = {
      points: 'text-yellow-600 bg-yellow-100',
      promotion: 'text-pink-600 bg-pink-100',
      system: 'text-purple-600 bg-purple-100',
      general: 'text-blue-600 bg-blue-100',
    }
    return colors[category] || 'text-gray-600 bg-gray-100'
  }

  const formatTime = (date) => {
    const now = new Date()
    const diff = Math.floor((now - new Date(date)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const NotificationContent = () => (
    <>
      {/* Header */}
      <div
        className={cn(
          'border-b border-gray-200 bg-white',
          isMobile ? 'px-4 py-3' : 'px-4 py-3'
        )}
      >
        <div className='flex items-center justify-between'>
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(false)}
              className='p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg'
            >
              <ArrowLeft className='h-5 w-5' />
            </motion.button>
          )}

          <div className='flex items-center gap-3'>
            <h3
              className={cn(
                'font-semibold text-gray-900',
                isMobile ? 'text-lg' : 'text-base'
              )}
            >
              Notifications
            </h3>

            {/* Simple connection indicator */}
            <div className='flex items-center'>
              {!isOnline && <WifiOff className='h-4 w-4 text-red-500' />}
              {isManualRefreshing && (
                <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
              )}
            </div>
          </div>

          {/* Refresh button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
            title='Refresh notifications'
          >
            <RefreshCw
              className={cn('h-4 w-4', isManualRefreshing && 'animate-spin')}
            />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'overflow-y-auto bg-white',
          isMobile ? 'flex-1' : 'max-h-96'
        )}
      >
        {notificationsLoading ? (
          <div className='p-8 text-center'>
            <Loader2 className='h-6 w-6 text-blue-500 mx-auto mb-3 animate-spin' />
            <p className='text-gray-500 text-sm'>Loading notifications...</p>
          </div>
        ) : !isOnline ? (
          <div className='p-8 text-center'>
            <WifiOff className='h-12 w-12 text-gray-300 mx-auto mb-3' />
            <p className='text-gray-500 text-sm font-medium'>You're offline</p>
            <p className='text-gray-400 text-xs mt-1'>
              Notifications will sync when reconnected
            </p>
          </div>
        ) : !notifications?.data?.notifications?.length ? (
          <div className='p-8 text-center'>
            <Bell className='h-12 w-12 text-gray-300 mx-auto mb-3' />
            <p className='text-gray-500 text-sm font-medium'>
              No notifications
            </p>
            <p className='text-gray-400 text-xs mt-1'>You're all caught up!</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
            <AnimatePresence>
              {notifications.data.notifications.map((notification, index) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'hover:bg-gray-50 transition-colors relative group',
                    isMobile ? 'p-4' : 'p-4',
                    !notification.read && 'bg-blue-50/50'
                  )}
                >
                  <div className='flex items-start gap-3'>
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex-shrink-0 rounded-lg flex items-center justify-center mt-0.5',
                        isMobile ? 'w-9 h-9' : 'w-8 h-8',
                        getIconColor(notification.category)
                      )}
                    >
                      {getIcon(notification.category)}
                    </div>

                    {/* Content */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between'>
                        <div className='flex-1 pr-4'>
                          <h4
                            className={cn(
                              'leading-tight',
                              isMobile ? 'text-sm' : 'text-sm',
                              notification.read
                                ? 'text-gray-700'
                                : 'text-gray-900 font-semibold'
                            )}
                          >
                            {notification.title}
                          </h4>
                          <p
                            className={cn(
                              'text-gray-600 leading-relaxed mt-1',
                              isMobile ? 'text-sm' : 'text-sm'
                            )}
                          >
                            {notification.message}
                          </p>
                          <div className='flex items-center gap-2 mt-2'>
                            <Clock className='h-3 w-3 text-gray-400' />
                            <p className='text-gray-400 text-xs'>
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Delete button - only shown on hover/mobile */}
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() =>
                            deleteMutation.mutate({
                              notificationId: notification._id,
                              token,
                            })
                          }
                          className={cn(
                            'p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors',
                            isMobile
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          )}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className='h-4 w-4' />
                        </motion.button>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className='absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full'></div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className={cn('relative notification-panel', className)}>
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
      >
        <Bell className='h-5 w-5' />

        {/* Initial loading indicator */}
        {unreadLoading && unreadCount === 0 && (
          <div className='absolute -top-1 -left-1 w-3 h-3'>
            <Loader2 className='w-3 h-3 animate-spin text-blue-500' />
          </div>
        )}

        {/* Unread count badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className='absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold shadow-lg'
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/20 backdrop-blur-sm z-50'
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={
              isMobile ? { x: '100%' } : { opacity: 0, scale: 0.95, y: -10 }
            }
            animate={isMobile ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={
              isMobile ? { x: '100%' } : { opacity: 0, scale: 0.95, y: -10 }
            }
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={
              isMobile
                ? 'fixed top-0 right-0 h-screen w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col'
                : 'absolute right-0 top-full mt-2 w-96 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden'
            }
          >
            <NotificationContent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationPanel
