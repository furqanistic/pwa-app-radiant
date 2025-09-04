// File: client/src/hooks/usePushNotifications.js - CLIENT SIDE
import { axiosInstance } from '@/config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// Utility function to convert VAPID key
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// API functions
const getVapidPublicKey = async () => {
  const response = await axiosInstance.get('/notifications/vapid-public-key')
  return response.data.data.publicKey
}

const subscribeToPush = async ({ subscription, token }) => {
  await axiosInstance.post(
    '/notifications/push/subscribe',
    { subscription },
    { headers: { Authorization: `Bearer ${token}` } }
  )
}

const unsubscribeFromPush = async ({ endpoint, token }) => {
  await axiosInstance.post(
    '/notifications/push/unsubscribe',
    { endpoint },
    { headers: { Authorization: `Bearer ${token}` } }
  )
}

const testPushNotification = async (token) => {
  const response = await axiosInstance.post(
    '/notifications/push/test',
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data
}

export const usePushNotifications = () => {
  const [permission, setPermission] = useState('default')
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const token = useSelector((state) => state.user.token)
  const queryClient = useQueryClient()

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      setIsSupported(supported)

      if (supported) {
        setPermission(Notification.permission)
      }

      setIsLoading(false)
    }

    checkSupport()
  }, [])

  // Get VAPID public key
  const { data: vapidPublicKey } = useQuery({
    queryKey: ['vapid-public-key'],
    queryFn: getVapidPublicKey,
    enabled: isSupported,
    staleTime: Infinity, // VAPID key doesn't change often
    cacheTime: Infinity,
  })

  // Get current subscription
  const getCurrentSubscription = useCallback(async () => {
    if (!isSupported || !('serviceWorker' in navigator)) return null

    try {
      const registration = await navigator.serviceWorker.ready
      const currentSubscription =
        await registration.pushManager.getSubscription()
      setSubscription(currentSubscription)
      return currentSubscription
    } catch (err) {
      console.error('Error getting push subscription:', err)
      setError(err.message)
      return null
    }
  }, [isSupported])

  // Check subscription on mount
  useEffect(() => {
    getCurrentSubscription()
  }, [getCurrentSubscription])

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: subscribeToPush,
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      setError(null)
    },
    onError: (err) => {
      setError(err.response?.data?.message || err.message)
    },
  })

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: unsubscribeFromPush,
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      setError(null)
    },
    onError: (err) => {
      setError(err.response?.data?.message || err.message)
    },
  })

  // Test notification mutation
  const testMutation = useMutation({
    mutationFn: testPushNotification,
    onError: (err) => {
      setError(err.response?.data?.message || err.message)
    },
  })

  // Request permission and subscribe
  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser')
      return false
    }

    if (!token) {
      setError('You must be logged in to enable notifications')
      return false
    }

    if (!vapidPublicKey) {
      setError('Unable to get VAPID public key')
      return false
    }

    try {
      setError(null)

      // Request permission
      const permission = await Notification.requestPermission()
      setPermission(permission)

      if (permission !== 'granted') {
        setError('Notification permission denied')
        return false
      }

      // Register service worker if not already registered
      let registration
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })
        await navigator.serviceWorker.ready
      } catch (swError) {
        console.error('Service worker registration failed:', swError)
        setError('Failed to register service worker')
        return false
      }

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      setSubscription(pushSubscription)

      // Send subscription to server
      await subscribeMutation.mutateAsync({
        subscription: pushSubscription.toJSON(),
        token,
      })

      return true
    } catch (err) {
      console.error('Error subscribing to push notifications:', err)
      setError(err.message || 'Failed to enable push notifications')
      return false
    }
  }, [isSupported, token, vapidPublicKey, subscribeMutation])

  // Unsubscribe from push notifications
  const unsubscribeFromPushNotifications = useCallback(async () => {
    if (!subscription || !token) return false

    try {
      setError(null)

      // Unsubscribe from browser
      await subscription.unsubscribe()
      setSubscription(null)

      // Notify server
      await unsubscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        token,
      })

      return true
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err)
      setError(err.message || 'Failed to disable push notifications')
      return false
    }
  }, [subscription, token, unsubscribeMutation])

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!token || !subscription) {
      setError('You must be subscribed to receive test notifications')
      return false
    }

    try {
      setError(null)
      const result = await testMutation.mutateAsync(token)
      return result
    } catch (err) {
      console.error('Error sending test notification:', err)
      return false
    }
  }, [token, subscription, testMutation])

  // Handle service worker messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event) => {
      const { data } = event

      if (data && data.type === 'NOTIFICATION_CLICKED') {
        // Handle notification click
        console.log('Notification clicked:', data)

        // You can dispatch actions or navigate here
        // For example, mark notification as read
        if (data.notificationId) {
          queryClient.invalidateQueries(['notifications'])
        }
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [queryClient])

  // Monitor permission changes
  useEffect(() => {
    if (!isSupported) return

    const handlePermissionChange = () => {
      setPermission(Notification.permission)

      if (Notification.permission !== 'granted' && subscription) {
        // Permission was revoked, clean up subscription
        setSubscription(null)
        if (token) {
          unsubscribeMutation.mutate({
            endpoint: subscription.endpoint,
            token,
          })
        }
      }
    }

    // Check for permission changes periodically
    const interval = setInterval(() => {
      if (Notification.permission !== permission) {
        handlePermissionChange()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isSupported, permission, subscription, token, unsubscribeMutation])

  return {
    // State
    isSupported,
    permission,
    subscription,
    error,
    isLoading,
    isSubscribed: !!subscription,

    // Actions
    requestPermissionAndSubscribe,
    unsubscribeFromPushNotifications,
    sendTestNotification,
    refreshSubscription: getCurrentSubscription,

    // Loading states
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    isTesting: testMutation.isPending,

    // Computed state
    canEnableNotifications:
      isSupported && permission !== 'denied' && !subscription,
    canDisableNotifications: isSupported && !!subscription,
    needsPermission: permission === 'default',
    permissionDenied: permission === 'denied',
  }
}
