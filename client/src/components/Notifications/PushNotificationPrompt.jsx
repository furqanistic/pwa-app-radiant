// File: client/src/components/Notifications/PushNotificationPrompt.jsx
import { useBranding } from '@/context/BrandingContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, ChevronRight, Download, Smartphone, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const PushNotificationPrompt = () => {
  const { branding } = useBranding();
  const {
    isSupported,
    permission,
    isSubscribed,
    requestPermissionAndSubscribe,
    isLoading,
  } = usePushNotifications();
  const { hasNativePrompt, isInstalled, triggerInstall } = usePwaInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(() => {
    return localStorage.getItem('push_prompt_dismissed') === 'true';
  });

  const brandColor = branding?.themeColor || '#ec4899';
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '');
    if (cleaned.length !== 6) return '#b0164e';
    const num = parseInt(cleaned, 16);
    const r = Math.max(0, ((num >> 16) & 255) - 24);
    const g = Math.max(0, ((num >> 8) & 255) - 24);
    const b = Math.max(0, (num & 255) - 24);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  })();

  useEffect(() => {
    if (!isLoading && isSupported && !isSubscribed && permission === 'default' && !hasDismissed && !isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isLoading, isSupported, isSubscribed, permission, hasDismissed, isInstalled]);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      // Trigger PWA install if the native prompt is available — this is instant
      if (hasNativePrompt) {
        await triggerInstall();
      }
      // Also subscribe to push notifications
      await requestPermissionAndSubscribe();
      setIsVisible(false);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setHasDismissed(true);
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  if (!isSupported) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-[400px] z-[100]"
          style={{
            '--brand-primary': brandColor,
            '--brand-primary-dark': brandColorDark,
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ borderWidth: 1, borderStyle: 'solid', borderColor: `color-mix(in srgb, ${brandColor} 20%, #f3f4f6)` }}
          >
            {/* Top accent bar */}
            <div
              className="h-1.5"
              style={{ background: `linear-gradient(to right, ${brandColor}, ${brandColorDark})` }}
            />

            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${brandColor} 12%, white)` }}
                  >
                    <BellRing className="w-6 h-6" style={{ color: brandColor }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Stay in the loop!</h3>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: brandColor }}>
                      {hasNativePrompt ? 'Install App & Enable Notifications' : 'Enable Push Notifications'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <p>Get instant updates on your bookings</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 flex-shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <p>Works perfectly on Android &amp; iPhone</p>
                </div>
                {hasNativePrompt && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `color-mix(in srgb, ${brandColor} 10%, white)` }}
                    >
                      <Download className="w-4 h-4" style={{ color: brandColor }} />
                    </div>
                    <p>Tap once to install the app to your home screen</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-3 text-gray-600 font-semibold text-sm hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleEnable}
                  disabled={isEnabling}
                  className="flex-[1.5] px-4 py-3 text-white font-bold text-sm rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{
                    background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})`,
                    boxShadow: `0 4px 14px color-mix(in srgb, ${brandColor} 35%, transparent)`,
                  }}
                >
                  {isEnabling ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Enable Now
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-4">
                You can change this anytime in notification settings
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PushNotificationPrompt;
