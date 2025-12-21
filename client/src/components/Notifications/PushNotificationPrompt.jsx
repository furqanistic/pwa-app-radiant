// File: client/src/components/Notifications/PushNotificationPrompt.jsx
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellRing, ChevronRight, Smartphone, Sparkles, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const PushNotificationPrompt = () => {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    requestPermissionAndSubscribe,
    isLoading
  } = usePushNotifications();

  const [isVisible, setIsVisible] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(() => {
    return localStorage.getItem('push_prompt_dismissed') === 'true';
  });

  useEffect(() => {
    // Only show if supported, not subscribed, permission is default, and hasn't been dismissed
    if (!isLoading && isSupported && !isSubscribed && permission === 'default' && !hasDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Show after 3 seconds
      return () => clearTimeout(timer);
    } else {
      // Hide if conditions are no longer met (e.g. subscribed from another component)
      setIsVisible(false);
    }
  }, [isLoading, isSupported, isSubscribed, permission, hasDismissed]);

  const handleEnable = async () => {
    const success = await requestPermissionAndSubscribe();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setHasDismissed(true);
    localStorage.setItem('push_prompt_dismissed', 'true');
    // Set a timestamp to show it again in 7 days? Maybe just let it stay dismissed for now.
  };

  if (!isSupported) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-[400px] z-[100]"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-pink-100 overflow-hidden">
            {/* Header Gradient */}
            <div className="h-2 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500" />
            
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600">
                    <BellRing className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Stay in the loop!</h3>
                    <p className="text-pink-500 text-xs font-semibold uppercase tracking-wider">Enable Push Notifications</p>
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
                  <p>Works perfectly on Android & iPhone</p>
                </div>
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
                  className="flex-[1.5] px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-pink-200 hover:shadow-pink-300 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Enable Now
                  <ChevronRight className="w-4 h-4" />
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
