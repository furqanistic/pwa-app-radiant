import MembershipManagementModal from "@/components/Management/MembershipManagementModal";
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
import { useBranding } from '@/context/BrandingContext';
import {
    logout,
    selectIsElevatedUser,
    selectIsSuperAdmin,
} from '@/redux/userSlice';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Calendar,
    CompassIcon,
    Contact2,
    Crown,
    Gamepad2,
    Gift,
    LayoutDashboard,
    LogOut,
    Menu,
    QrCode,
    Star,
    User,
    Users,
    X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

const cn = (...classes) => classes.filter(Boolean).join(' ')

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(236, 72, 153, ${alpha})`
  const cleaned = hex.replace('#', '')
  const num = parseInt(cleaned, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const BottomNav = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { branding, locationId } = useBranding()
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const brandColor = branding?.themeColor || '#ec4899'
  
  const brandStyles = useMemo(() => {
    const rgba20 = hexToRgba(brandColor, 0.2)
    const rgba40 = hexToRgba(brandColor, 0.4)
    const rgba10 = hexToRgba(brandColor, 0.1)
    const rgba08 = hexToRgba(brandColor, 0.08)
    
    return {
      primary: brandColor,
      rgba20,
      rgba40,
      rgba10,
      rgba08,
      gradient: `linear-gradient(135deg, ${brandColor}, ${hexToRgba(brandColor, 0.8)})`,
      shadow: `0 8px 20px -4px ${rgba40}`
    }
  }, [brandColor])

  // Selector for role-based access
  const isSuperAdmin = useSelector(selectIsSuperAdmin)
  const isElevatedUser = useSelector(selectIsElevatedUser)

  // Navigation logic mirrored from Layout.jsx
  const baseNavigationItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      href: '/dashboard',
      inBottomBar: true,
    },
    {
      id: 'services',
      label: 'Explore',
      icon: CompassIcon,
      href: '/services',
      inBottomBar: true,
    },
    {
      id: 'membership',
      label: 'Member',
      icon: Crown,
      href: '/membership',
    },
    {
      id: 'scanner',
      label: 'Scan',
      icon: QrCode,
      isScanner: true,
      onClick: () => setQrScannerOpen(true),
      inBottomBar: true,
    },
    {
      id: 'rewards',
      label: 'Rewards',
      icon: Star,
      href: '/rewards',
      inBottomBar: true,
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Contact2,
      href: '/contacts',
      superAdminOnly: true,
    },
    {
      id: 'booking',
      label: 'Booking',
      icon: Calendar,
      href: '/Booking',
    },
    {
      id: 'clients',
      label: 'Management',
      icon: Users,
      href: '/management',
      elevatedAccessRequired: true,
    },
    {
      id: 'referrals',
      label: 'Referrals',
      icon: Gift,
      href: '/referrals',
    },
    {
      id: 'gamification',
      label: 'Games',
      icon: Gamepad2,
      href: '/spin',
      hideForElevated: true,
    },
  ]

  // Filter items based on user role
  const allowedItems = baseNavigationItems.filter((item) => {
    // 1. Super Admin: Only see Contacts, Client Management, and QR Scanner
    if (isSuperAdmin) {
      return ['contacts', 'clients', 'scanner'].includes(item.id)
    }

    // 2. Admin/SPA: Specialized redirects for services, rewards, membership
    if (isElevatedUser) {
      const restrictedForAdmin = [
        'referrals',
        'gamification',
      ]
      if (restrictedForAdmin.includes(item.id)) return false
      return true
    }

    // 3. Normal User: Show everything (existing logic)
    return true
  }).map(item => {
    // Apply redirects for Admin/SPA
    if (isElevatedUser) {
      if (item.id === 'services') {
        return { ...item, href: '/management/services', onClick: undefined }
      }
      if (item.id === 'rewards') {
        return { ...item, href: '/management/rewards', onClick: undefined }
      }
      if (item.id === 'booking') {
        return { ...item, href: '/management/bookings', onClick: undefined }
      }
      if (item.id === 'membership') {
        return { ...item, onClick: () => setIsMembershipOpen(true), href: undefined }
      }
    }
    return item
  })

  // Refined filter for Super Admin (redundant now but keeping it safe)
  const finalAllowedItems = allowedItems.filter(item => {
    if (isSuperAdmin) {
      return ['contacts', 'clients', 'scanner'].includes(item.id)
    }
    return true
  })

  // Split into bottom bar and "More" menu
  const bottomNavItems = [
    ...finalAllowedItems.filter(item => {
      if (isSuperAdmin) {
        return ['contacts', 'clients'].includes(item.id)
      }
      return item.inBottomBar
    }),
    {
        id: 'more',
        label: 'More',
        icon: Menu,
        onClick: () => setShowMoreMenu(true),
    }
  ]

  const moreItems = [
    ...finalAllowedItems.filter(item => {
      if (isSuperAdmin) return false // Already in bottom bar
      return !item.inBottomBar
    }),
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      href: '/profile',
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: LogOut,
      onClick: () => dispatch(logout()),
      className: `text-red-500 hover:bg-red-50`,
    },
  ]

  const handleMoreItemClick = (item) => {
    setShowMoreMenu(false)
    if (item.onClick) {
      item.onClick()
    } else if (item.href) {
      navigate(item.href)
    }
  }

  return (
    <>
      <nav className='lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border-t border-gray-100 pb-[env(safe-area-inset-bottom)]'>
        <div className='flex items-center justify-around h-16 max-w-lg mx-auto px-4 relative'>
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.href ? location.pathname === item.href : false

            if (item.isScanner) {
              return (
                <div key={item.id} className='relative -top-6 flex flex-col items-center w-14'>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={item.onClick}
                    className='flex items-center justify-center w-14 h-14 rounded-full shadow-lg border-4 border-white text-white transition-all'
                    style={{ 
                      background: brandStyles.gradient,
                      boxShadow: brandStyles.shadow
                    }}
                  >
                    <Icon className='w-7 h-7' />
                  </motion.button>
                  <span 
                    className='absolute -bottom-8 text-[10px] font-bold uppercase tracking-tighter w-20 text-center whitespace-nowrap backdrop-blur-md rounded-full py-0.5 border shadow-sm'
                    style={{ 
                      color: brandStyles.primary,
                      backgroundColor: brandStyles.rgba10,
                      borderColor: brandStyles.rgba20
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              )
            }

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => (item.onClick ? item.onClick() : navigate(item.href))}
                className={cn(
                  'relative flex flex-col items-center justify-center min-w-[50px] h-full transition-all duration-200'
                )}
                style={{ color: isActive ? brandStyles.primary : '#9ca3af' }}
              >
                <div className='relative'>
                  <Icon className={cn('w-6 h-6 mb-1 transition-transform', isActive ? 'scale-110' : 'scale-100')} />
                  {isActive && (
                    <motion.div
                      layoutId='bottomNavIndicator'
                      className='absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full'
                      style={{ backgroundColor: brandStyles.primary }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span 
                  className='text-[10px] font-bold uppercase tracking-tighter'
                  style={{ color: isActive ? brandStyles.primary : '#6b7280' }}
                >
                  {item.label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* More Menu Popover */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className='lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50'
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className='lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] pb-[calc(env(safe-area-inset-bottom)+1rem)] px-6 pt-8'
            >
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-xl font-bold text-gray-900'>Menu</h3>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className='p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors'
                >
                  <X className='w-5 h-5 text-gray-600' />
                </button>
              </div>

              <div className='grid grid-cols-1 gap-1 max-h-[60vh] overflow-y-auto pr-2'>
                {moreItems.map((item) => {
                  const Icon = item.icon
                  const isActive = item.href ? location.pathname === item.href : false
                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMoreItemClick(item)}
                      className={cn(
                        'flex items-center space-x-4 p-3.5 rounded-2xl transition-all duration-200'
                      )}
                      style={!item.className ? { 
                        backgroundColor: isActive ? brandStyles.rgba08 : 'transparent',
                        color: isActive ? brandStyles.primary : '#374151'
                      } : undefined}
                    >
                      <div 
                        className={cn(
                          'p-2 rounded-xl flex-shrink-0'
                        )}
                        style={item.id !== 'logout' ? {
                          backgroundColor: brandStyles.rgba10,
                          color: brandStyles.primary
                        } : {
                          backgroundColor: '#fee2e2',
                          color: '#dc2626'
                        }}
                      >
                        <Icon className='w-5 h-5' />
                      </div>
                      <span className='font-bold text-base'>{item.label}</span>
                    </motion.button>
                  )
                })}
              </div>

              <div className='mt-6 pt-6 border-t border-gray-100'>
                <p className='text-center text-xs text-gray-400 font-medium'>
                  RadiantAI • Beauty & Wellness v1.0
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
      />

      <MembershipManagementModal
        isOpen={isMembershipOpen}
        onClose={() => setIsMembershipOpen(false)}
      />
    </>
  )
}

export default BottomNav
