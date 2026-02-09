// File: client/src/pages/Layout/NotificationPanel.jsx - REDESIGNED
import BirthdayGiftVoicePlayer from '@/components/Dashboard/BirthdayGiftVoicePlayer'
import PushNotificationSettings from '@/components/Layout/PushNotificationSettings'
import { axiosInstance } from '@/config'
import { useBranding } from '@/context/BrandingContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Bell,
    BellRing,
    CheckCheck,
    ChevronRight,
    Clock,
    Crown,
    Gift,
    Heart,
    Loader2,
    MessageSquare,
    RefreshCw,
    Settings,
    Sparkles,
    Trash2,
    WifiOff,
    X,
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

const PushPrompt = () => {
  const { 
    isSubscribed, 
    sendTestNotification, 
    isTesting, 
    isSupported, 
    error 
  } = usePushNotifications()

  if (!isSupported) return null

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-br from-[color:var(--brand-primary)/0.14] via-white to-[color:var(--brand-primary)/0.06] rounded-3xl p-5 border border-gray-200/70 shadow-sm mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full shadow-sm",
            isSubscribed ? "bg-green-500 animate-pulse" : "bg-gray-300"
          )} />
          <h4 className="text-sm font-bold text-gray-900 tracking-tight">
            Push Alerts
          </h4>
        </div>
        
        {isSubscribed && (
          <button
            onClick={() => sendTestNotification()}
            disabled={isTesting}
            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 text-white rounded-full border border-transparent bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))] hover:brightness-105 transition-opacity active:scale-95 disabled:opacity-50 shadow-sm"
          >
            {isTesting ? 'Sending...' : 'Test Sync'}
          </button>
        )}
      </div>
      
      <p className="text-xs text-gray-500 leading-relaxed font-medium">
        {isSubscribed 
          ? "Your device is perfectly synced with RadiantAI. We'll alert you for every beauty milestone."
          : "Stay in the loop. Enable push alerts to get instant updates on bookings and exclusive rewards."}
      </p>

      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-[10px] text-red-500 mt-2 font-semibold"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const NotificationPanel = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('notifications') // 'notifications' or 'settings'
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMarkedAsSeen, setHasMarkedAsSeen] = useState(false)
  const token = useSelector((state) => state.user.token)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '')
    if (cleaned.length !== 6) return '#b0164e'
    const num = parseInt(cleaned, 16)
    const r = Math.max(0, ((num >> 16) & 255) - 24)
    const g = Math.max(0, ((num >> 8) & 255) - 24)
    const b = Math.max(0, (num & 255) - 24)
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()
  const queryClient = useQueryClient()
  const markAsSeenTimeoutRef = useRef(null)

  const isMobile = windowWidth < 768

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'unset' }
    }
  }, [isOpen, isMobile])

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true)
    queryClient.invalidateQueries(['notifications']).finally(() => {
      setTimeout(() => setIsRefreshing(false), 800)
    })
  }, [queryClient])

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetchUnreadCount(token),
    enabled: !!token && isOnline,
    refetchInterval: isOpen ? 30000 : 60000,
    staleTime: 15000,
  })

  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: () => fetchNotifications(token, { limit: 15 }),
    enabled: !!token && isOpen && isOnline,
    refetchInterval: isOpen ? 30000 : false,
    staleTime: 15000,
  })

  const markAsSeenMutation = useMutation({
    mutationFn: markAllAsSeen,
    onMutate: () => {
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

  useEffect(() => {
    if (isOpen && !hasMarkedAsSeen && unreadCount > 0 && token && activeTab === 'notifications') {
      if (markAsSeenTimeoutRef.current) clearTimeout(markAsSeenTimeoutRef.current)
      markAsSeenTimeoutRef.current = setTimeout(() => {
        markAsSeenMutation.mutate(token)
        setHasMarkedAsSeen(true)
      }, 1500)
    }
    if (!isOpen) {
      setHasMarkedAsSeen(false)
      if (markAsSeenTimeoutRef.current) clearTimeout(markAsSeenTimeoutRef.current)
    }
    return () => {
      if (markAsSeenTimeoutRef.current) clearTimeout(markAsSeenTimeoutRef.current)
    }
  }, [isOpen, hasMarkedAsSeen, unreadCount, token, markAsSeenMutation, activeTab])

  const getNotificationIcon = (category) => {
    const icons = {
      points: <Crown className="h-4 w-4" />,
      promotion: <Gift className="h-4 w-4" />,
      system: <Sparkles className="h-4 w-4" />,
      general: <Heart className="h-4 w-4" />,
    }
    return icons[category] || <MessageSquare className="h-4 w-4" />
  }

  const getIconContainerStyles = (category) => {
    const styles = {
      points: 'bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)]',
      promotion: 'bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)]',
      system: 'bg-purple-100 text-purple-600',
      general: 'bg-[color:var(--brand-primary)/0.08] text-[color:var(--brand-primary)]',
    }
    return styles[category] || 'bg-gray-100 text-gray-500'
  }

  const formatTime = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <div
      className={cn('relative', className)}
      style={{
        ['--brand-primary']: brandColor,
        ['--brand-primary-dark']: brandColorDark,
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
          className={cn(
          'relative p-2.5 rounded-2xl transition-colors active:scale-95 border group',
          isOpen 
            ? 'text-white border-transparent shadow-lg shadow-[color:var(--brand-primary)/0.25]' 
            : 'bg-white text-gray-600 border-gray-200/70 hover:text-[color:var(--brand-primary)]'
        )}
        style={isOpen ? { background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})` } : undefined}
      >
        <Bell className={cn('h-5 w-5 transition-transform duration-150 group-hover:scale-105', unreadCount > 0 && 'animate-wiggle')} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white text-[10px] rounded-full flex items-center justify-center font-black border border-white shadow-sm"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/5 z-[99]"
          />

          {/* Panel */}
          <div
            className={cn(
              'bg-white z-[100] shadow-2xl flex flex-col',
              isMobile 
                ? 'fixed inset-0 h-screen w-full' 
                : 'absolute right-0 top-full mt-4 w-[400px] max-h-[600px] rounded-[32px] border border-gray-200/70 overflow-hidden'
            )}
          >
              {/* Header */}
              <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[color:var(--brand-primary)/0.08] rounded-2xl flex items-center justify-center">
                      {activeTab === 'notifications' ? <BellRing className="text-[color:var(--brand-primary)] h-5 w-5" /> : <Settings className="text-[color:var(--brand-primary)] h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 leading-none">
                        {activeTab === 'notifications' ? 'Feed' : 'Settings'}
                      </h3>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        RadiantAI Updates
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {activeTab === 'notifications' && (
                      <button
                        onClick={handleManualRefresh}
                        className="p-2.5 text-gray-400 hover:text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary)/0.08] rounded-xl transition-colors"
                      >
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-[color:var(--brand-primary)/0.08] p-1 rounded-2xl flex gap-1 border border-gray-200/70">
                  <button
                    onClick={() => setActiveTab('notifications')}
                      className={cn(
                      'flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2',
                      activeTab === 'notifications'
                        ? 'bg-white text-[color:var(--brand-primary)] shadow-sm border border-gray-200/70'
                        : 'text-[color:var(--brand-primary)]/70 hover:text-[color:var(--brand-primary)]'
                    )}
                  >
                    Updates
                    {unreadCount > 0 && <span className="w-1.5 h-1.5 bg-[color:var(--brand-primary)] rounded-full" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                      className={cn(
                      'flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2',
                      activeTab === 'settings'
                        ? 'bg-white text-[color:var(--brand-primary)] shadow-sm border border-gray-200/70'
                        : 'text-[color:var(--brand-primary)]/70 hover:text-[color:var(--brand-primary)]'
                    )}
                  >
                    Preferences
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {activeTab === 'notifications' ? (
                    <motion.div
                      key="notifications-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4 pb-6"
                    >
                      {!isOnline ? (
                        <div className="py-12 text-center">
                          <WifiOff className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                          <h4 className="text-sm font-bold text-gray-900">Connection Lost</h4>
                          <p className="text-xs text-gray-400 mt-1 font-medium">Please check your network status.</p>
                        </div>
                      ) : notificationsLoading ? (
                        <div className="py-12 space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex gap-4">
                              <div className="w-12 h-12 bg-gray-100 rounded-2xl shrink-0" />
                              <div className="flex-1 space-y-2 py-2">
                                <div className="h-3 bg-gray-100 rounded w-1/3" />
                                <div className="h-2 bg-gray-50 rounded w-2/3" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !notificationsData?.data?.notifications?.length ? (
                        <div className="py-12 text-center">
                          <div className="w-20 h-20 bg-[color:var(--brand-primary)/0.08] rounded-[32px] flex items-center justify-center mx-auto mb-6">
                            <CheckCheck className="h-10 w-10 text-[color:var(--brand-primary)]" />
                          </div>
                          <h4 className="text-base font-black text-gray-900">All Captured!</h4>
                          <p className="text-xs text-gray-400 font-medium mt-2 max-w-[180px] mx-auto italic">
                            No new updates right now. You're doing great!
                          </p>
                        </div>
                      ) : (
                        notificationsData.data.notifications.map((notification) => (
                          <motion.div
                            key={notification._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              'group relative p-4 rounded-3xl border transition-colors duration-300',
                              notification.read 
                                ? 'bg-white border-gray-200/70 hover:border-gray-200/70' 
                                : 'bg-[color:var(--brand-primary)/0.06] border-gray-200/70 shadow-sm shadow-gray-100'
                            )}
                          >
                            {!notification.read && (
                              <div className="absolute top-4 right-4 w-2 h-2 bg-[color:var(--brand-primary)] rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)]" />
                            )}
                            
                            <div className="flex gap-4">
                              <div className={cn(
                                'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-gray-200/60',
                                getIconContainerStyles(notification.category)
                              )}>
                                {getNotificationIcon(notification.category)}
                              </div>
                              
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-[color:var(--brand-primary)]/60">
                                    {notification.category}
                                  </span>
                                  <span className="text-[10px] text-gray-400">•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5 text-gray-300" />
                                    <span className="text-[10px] font-bold text-gray-400">
                                      {formatTime(notification.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <h4 className={cn(
                                  'text-sm transition-colors mr-2',
                                  notification.read ? 'text-gray-600 font-semibold' : 'text-gray-900 font-black'
                                )}>
                                  {notification.title}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed font-medium">
                                  {notification.message}
                                </p>
                                {notification.metadata?.isBirthdayGift && notification.metadata?.voiceNoteUrl && (
                                  <BirthdayGiftVoicePlayer voiceNoteUrl={notification.metadata.voiceNoteUrl} />
                                )}
                              </div>
 
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteMutation.mutate({ notificationId: notification._id, token })
                                }}
                                className="absolute -right-2 -top-2 p-2 bg-white text-gray-300 hover:text-[color:var(--brand-primary)] hover:shadow-lg rounded-full opacity-0 group-hover:opacity-100 transition-colors border border-gray-200/70 shadow-sm scale-75 group-hover:scale-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="settings-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pb-6"
                    >
                      <PushPrompt />
                      <div className="space-y-6">
                        <div className="p-1 px-1">
                          <PushNotificationSettings />
                        </div>
                        
                        <div className="bg-gradient-to-br from-[color:var(--brand-primary)/0.12] via-white to-[color:var(--brand-primary)/0.06] rounded-3xl p-5 border border-gray-200/70">
                          <h4 className="text-xs font-black text-[color:var(--brand-primary)] uppercase tracking-widest mb-4">
                            Why Alerts?
                          </h4>
                          <div className="space-y-4">
                            {[
                              { icon: <Crown className="w-3 h-3" />, label: "Track your loyalty points" },
                              { icon: <Clock className="w-3 h-3" />, label: "Booking reminders" },
                              { icon: <Zap className="w-3 h-3" />, label: "Exclusive flash rewards" },
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg text-white border border-transparent bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))] flex items-center justify-center shadow-sm">
                                  {item.icon}
                                </div>
                                <span className="text-xs text-gray-600 font-bold">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-6 pt-2 border-t border-gray-50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-4 px-6 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-opacity active:scale-98 flex items-center justify-center gap-2 group bg-[radial-gradient(120%_120%_at_20%_0%,var(--brand-primary),var(--brand-dark))] hover:brightness-105"
                >
                  Dismiss Panel
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationPanel
