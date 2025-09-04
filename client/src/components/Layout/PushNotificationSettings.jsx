// File: client/src/components/Layout/PushNotificationSettings.jsx - CLIENT SIDE
import { usePushNotifications } from '@/hooks/usePushNotifications'
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  Check,
  Loader2,
  Settings,
  Smartphone,
  X,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const PushNotificationSettings = ({ className = '' }) => {
  const [showDetails, setShowDetails] = useState(false)
  const {
    isSupported,
    permission,
    subscription,
    error,
    isLoading,
    isSubscribed,
    requestPermissionAndSubscribe,
    unsubscribeFromPushNotifications,
    sendTestNotification,
    isSubscribing,
    isUnsubscribing,
    isTesting,
    canEnableNotifications,
    canDisableNotifications,
    needsPermission,
    permissionDenied,
  } = usePushNotifications()

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribeFromPushNotifications()
    } else {
      await requestPermissionAndSubscribe()
    }
  }

  const handleTestNotification = async () => {
    const result = await sendTestNotification()
    if (result) {
      // Could show a success message here
    }
  }

  if (isLoading) {
    return (
      <div className={cn('p-4 bg-gray-50 rounded-lg', className)}>
        <div className='flex items-center gap-3'>
          <div className='w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin'></div>
          <span className='text-gray-600'>
            Checking notification support...
          </span>
        </div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div
        className={cn(
          'p-4 bg-red-50 rounded-lg border border-red-200',
          className
        )}
      >
        <div className='flex items-start gap-3'>
          <AlertCircle className='h-5 w-5 text-red-600 mt-0.5 flex-shrink-0' />
          <div>
            <h4 className='font-medium text-red-900'>
              Push Notifications Not Supported
            </h4>
            <p className='text-red-700 text-sm mt-1'>
              Your browser doesn't support push notifications. Please use a
              modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('bg-white rounded-xl border border-gray-200', className)}
    >
      {/* Header */}
      <div className='p-6 border-b border-gray-100'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isSubscribed
                  ? 'bg-green-100 text-green-600'
                  : permissionDenied
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {isSubscribed ? (
                <BellRing className='h-5 w-5' />
              ) : (
                <Bell className='h-5 w-5' />
              )}
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>
                Push Notifications
              </h3>
              <p className='text-sm text-gray-500'>
                Get notified instantly about important updates
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className='p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100'
          >
            <Settings className='h-4 w-4' />
          </button>
        </div>
      </div>

      {/* Status and Controls */}
      <div className='p-6 space-y-4'>
        {/* Current Status */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                isSubscribed
                  ? 'bg-green-500'
                  : permissionDenied
                  ? 'bg-red-500'
                  : 'bg-gray-300'
              )}
            ></div>
            <span className='font-medium text-gray-900'>
              {isSubscribed
                ? 'Enabled'
                : permissionDenied
                ? 'Blocked'
                : needsPermission
                ? 'Not Set Up'
                : 'Disabled'}
            </span>
          </div>

          {/* Toggle Switch */}
          <div className='flex items-center gap-3'>
            {canDisableNotifications && (
              <button
                onClick={handleTestNotification}
                disabled={isTesting}
                className='px-3 py-1.5 text-sm font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors disabled:opacity-50'
              >
                {isTesting ? (
                  <>
                    <Loader2 className='h-3 w-3 animate-spin inline mr-1' />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className='h-3 w-3 inline mr-1' />
                    Test
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleToggleNotifications}
              disabled={isSubscribing || isUnsubscribing || permissionDenied}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isSubscribed ? 'bg-pink-500' : 'bg-gray-200'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  isSubscribed ? 'translate-x-6' : 'translate-x-1'
                )}
              />
              {(isSubscribing || isUnsubscribing) && (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <Loader2 className='h-3 w-3 animate-spin text-white' />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-3 bg-red-50 rounded-lg border border-red-200'>
            <div className='flex items-start gap-2'>
              <X className='h-4 w-4 text-red-600 mt-0.5 flex-shrink-0' />
              <p className='text-red-700 text-sm'>{error}</p>
            </div>
          </div>
        )}

        {/* Permission Denied Warning */}
        {permissionDenied && (
          <div className='p-3 bg-yellow-50 rounded-lg border border-yellow-200'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0' />
              <div className='text-sm'>
                <p className='text-yellow-800 font-medium'>
                  Notifications are blocked
                </p>
                <p className='text-yellow-700 mt-1'>
                  To enable notifications, click the lock icon in your browser's
                  address bar and allow notifications.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {isSubscribed && !error && (
          <div className='p-3 bg-green-50 rounded-lg border border-green-200'>
            <div className='flex items-start gap-2'>
              <Check className='h-4 w-4 text-green-600 mt-0.5 flex-shrink-0' />
              <div className='text-sm'>
                <p className='text-green-800 font-medium'>
                  Push notifications are active
                </p>
                <p className='text-green-700 mt-1'>
                  You'll receive notifications even when the app is closed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        {canEnableNotifications && !error && (
          <div className='p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200'>
            <div className='flex items-start gap-3'>
              <div className='w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                <Smartphone className='h-4 w-4 text-pink-600' />
              </div>
              <div>
                <h4 className='font-medium text-pink-900'>Stay Connected</h4>
                <p className='text-pink-700 text-sm mt-1'>
                  Enable push notifications to receive important updates
                  instantly, even when you're not using the app.
                </p>
                <button
                  onClick={handleToggleNotifications}
                  disabled={isSubscribing}
                  className='mt-3 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50'
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className='h-3 w-3 animate-spin inline mr-2' />
                      Setting up...
                    </>
                  ) : (
                    'Enable Notifications'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Technical Details (Collapsible) */}
      {showDetails && (
        <div className='border-t border-gray-100 px-6 py-4 bg-gray-50'>
          <h4 className='font-medium text-gray-900 mb-3'>Technical Details</h4>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-gray-500'>Permission:</span>
              <span
                className={cn(
                  'ml-2 font-medium',
                  permission === 'granted'
                    ? 'text-green-600'
                    : permission === 'denied'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                )}
              >
                {permission}
              </span>
            </div>
            <div>
              <span className='text-gray-500'>Subscription:</span>
              <span
                className={cn(
                  'ml-2 font-medium',
                  subscription ? 'text-green-600' : 'text-gray-600'
                )}
              >
                {subscription ? 'Active' : 'None'}
              </span>
            </div>
          </div>

          {subscription && (
            <div className='mt-3 p-2 bg-white rounded border'>
              <code className='text-xs text-gray-600 break-all'>
                {subscription.endpoint}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PushNotificationSettings
