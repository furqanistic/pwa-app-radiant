// File: client/src/pages/Layout/NotificationPanel.jsx - UPDATED WITH PUSH INTEGRATION
import PushNotificationSettings from '@/components/Layout/PushNotificationSettings'
import { axiosInstance } from '@/config'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCheck,
  Clock,
  Crown,
  Gift,
  Heart,
  Loader2,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
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
  const [showSettings, setShowSettings] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [hasMarkedAsSeen, setHasMarkedAsSeen] = useState(false)
  const token = useSelector((state) => state.user.token)
  const queryClient = useQueryClient()
  const markAsSeenTimeoutRef = useRef(null)

  // Push notifications hook
  const { isSubscribed, canEnableNotifications } = usePushNotifications()

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

  // Professional refetch intervals
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
    staleTime: 15000,
    cacheTime: 300000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: () => fetchNotifications(token, { limit: 50 }),
    enabled: !!token && isOpen && isOnline,
    refetchInterval: isOpen ? 30000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 15000,
    cacheTime: 300000,
    retry: 2,
  })

  // Mark as seen mutation
  const markAsSeenMutation = useMutation({
    mutationFn: markAllAsSeen,
    onMutate: async () => {
      queryClient.setQueryData(['notifications', 'unread-count'], 0)
    },
    onError: () => {
      queryClient.invalidateQueries(['notifications', 'unread-count'])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
    },
  })

  // Auto-mark as seen when panel opens
  useEffect(() => {
    if (
      isOpen &&
      !hasMarkedAsSeen &&
      unreadCount > 0 &&
      token &&
      !showSettings
    ) {
      if (markAsSeenTimeoutRef.current) {
        clearTimeout(markAsSeenTimeoutRef.current)
      }

      markAsSeenTimeoutRef.current = setTimeout(() => {
        markAsSeenMutation.mutate(token)
        setHasMarkedAsSeen(true)
      }, 1000)
    }

    if (!isOpen || showSettings) {
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
  }, [
    isOpen,
    hasMarkedAsSeen,
    unreadCount,
    token,
    markAsSeenMutation,
    showSettings,
  ])

  const getIcon = (category) => {
    const icons = {
      points: Crown,
      promotion: Gift,
      system: Sparkles,
      general: Heart,
    }
    const Icon = icons[category] || MessageSquare
    return <Icon className={cn(isMobile ? 'h-4 w-4' : 'h-4 w-4')} />
  }

  const getIconColor = (category) => {
    const colors = {
      points: 'text-pink-600 bg-pink-100',
      promotion: 'text-rose-600 bg-rose-100',
      system: 'text-purple-600 bg-purple-100',
      general: 'text-pink-500 bg-pink-50',
    }
    return colors[category] || 'text-pink-500 bg-pink-50'
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
          'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
          isMobile ? 'px-4 py-4' : 'px-4 py-4'
        )}
      >
        <div className='flex items-center justify-between'>
          {isMobile && (
            <button
              onClick={() => {
                if (showSettings) {
                  setShowSettings(false)
                } else {
                  setIsOpen(false)
                }
              }}
              className='p-1.5 -ml-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
          )}

          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              {showSettings ? (
                <Settings className='h-5 w-5 text-white' />
              ) : (
                <Bell className='h-5 w-5 text-white' />
              )}
              <h3
                className={cn(
                  'font-bold text-white',
                  isMobile ? 'text-lg' : 'text-base'
                )}
              >
                {showSettings ? 'Notification Settings' : 'Notifications'}
              </h3>
            </div>

            {/* Connection indicator */}
            <div className='flex items-center gap-2'>
              {/* Push notification status */}
              {isSubscribed && !showSettings && (
                <div className='flex items-center'>
                  <BellRing
                    className='h-4 w-4 text-green-300'
                    title='Push notifications enabled'
                  />
                </div>
              )}

              {!isOnline && <WifiOff className='h-4 w-4 text-red-300' />}
              {isManualRefreshing && (
                <Loader2 className='h-4 w-4 animate-spin text-white/80' />
              )}
            </div>
          </div>

          {/* Header Actions */}
          <div className='flex items-center gap-2'>
            {!showSettings && (
              <>
                {/* Settings button */}
                <button
                  onClick={() => setShowSettings(true)}
                  className='p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200'
                  title='Notification settings'
                >
                  <Settings className='h-4 w-4' />
                </button>

                {/* Refresh button */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isManualRefreshing}
                  className='p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200'
                  title='Refresh notifications'
                >
                  <RefreshCw
                    className={cn(
                      'h-4 w-4',
                      isManualRefreshing && 'animate-spin'
                    )}
                  />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'overflow-y-auto bg-white',
          isMobile ? 'flex-1' : 'max-h-96'
        )}
      >
        {showSettings ? (
          <div className='p-4'>
            <PushNotificationSettings />

            {/* Additional settings info */}
            {canEnableNotifications && (
              <div className='mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200'>
                <div className='flex items-start gap-3'>
                  <Zap className='h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0' />
                  <div>
                    <h4 className='font-medium text-blue-900'>
                      Why enable push notifications?
                    </h4>
                    <ul className='text-blue-700 text-sm mt-2 space-y-1'>
                      <li>• Get notified instantly about new messages</li>
                      <li>• Never miss important updates</li>
                      <li>• Works even when the app is closed</li>
                      <li>• Available on Android and iOS devices</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : notificationsLoading ? (
          <div className='p-8 text-center'>
            <div className='w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
            <p className='text-gray-600 text-sm font-medium'>
              Loading your updates, sweetie!
            </p>
            <p className='text-gray-500 text-xs mt-1'>
              Getting everything ready for you...
            </p>
          </div>
        ) : !isOnline ? (
          <div className='p-8 text-center'>
            <div className='w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <WifiOff className='h-8 w-8 text-white' />
            </div>
            <p className='text-gray-900 text-sm font-semibold mb-1'>
              You're offline, sweetie!
            </p>
            <p className='text-gray-500 text-xs'>
              Don't worry! Your notifications will sync when you're back online
            </p>
          </div>
        ) : !notifications?.data?.notifications?.length ? (
          <div className='p-8 text-center'>
            <div className='w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <Heart className='h-8 w-8 text-white' />
            </div>
            <p className='text-gray-900 text-sm font-semibold mb-1'>
              All caught up, sweetie!
            </p>
            <p className='text-gray-500 text-xs'>
              No new notifications right now. You're amazing!
            </p>

            {/* Push notification CTA when no notifications */}
            {canEnableNotifications && (
              <button
                onClick={() => setShowSettings(true)}
                className='mt-4 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-lg transition-colors'
              >
                Enable Push Notifications
              </button>
            )}
          </div>
        ) : (
          <div className='divide-y divide-pink-100'>
            {notifications.data.notifications.map((notification, index) => (
              <div
                key={notification._id}
                className={cn(
                  'hover:bg-pink-50 transition-all duration-200 relative group border-l-4',
                  isMobile ? 'p-4' : 'p-4',
                  !notification.read
                    ? 'bg-pink-50/50 border-l-pink-500'
                    : 'border-l-transparent hover:border-l-pink-200'
                )}
              >
                <div className='flex items-start gap-3'>
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 rounded-xl flex items-center justify-center mt-0.5 border',
                      isMobile ? 'w-10 h-10' : 'w-10 h-10',
                      getIconColor(notification.category),
                      !notification.read ? 'border-pink-200' : 'border-pink-100'
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
                          <Clock className='h-3 w-3 text-pink-400' />
                          <p className='text-pink-400 text-xs font-medium'>
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() =>
                          deleteMutation.mutate({
                            notificationId: notification._id,
                            token,
                          })
                        }
                        className={cn(
                          'p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 border border-transparent hover:border-rose-200',
                          isMobile
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        )}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className='absolute top-4 right-4 w-3 h-3 bg-pink-500 rounded-full border-2 border-white'></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className={cn('relative notification-panel', className)}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-200 border border-transparent hover:border-pink-200'
      >
        <Bell className='h-5 w-5' />

        {/* Initial loading indicator */}
        {unreadLoading && unreadCount === 0 && (
          <div className='absolute -top-1 -left-1 w-4 h-4'>
            <div className='w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin'></div>
          </div>
        )}

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold border-2 border-white'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Push notification indicator */}
        {isSubscribed && (
          <div className='absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white'></div>
        )}
      </button>

      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div
          className='fixed inset-0 bg-black/40 backdrop-blur-sm z-50'
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel */}
      {isOpen && (
        <div
          className={
            isMobile
              ? 'fixed top-0 right-0 h-screen w-full bg-white z-50 flex flex-col border-l border-pink-100'
              : 'absolute right-0 top-full mt-2 w-96 max-w-[90vw] bg-white rounded-2xl border border-pink-100 z-50 overflow-hidden'
          }
        >
          <NotificationContent />
        </div>
      )}
    </div>
  )
}

export default NotificationPanel
