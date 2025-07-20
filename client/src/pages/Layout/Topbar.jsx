import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import React from 'react'
import { useSelector } from 'react-redux'
import InstallButton from './InstallButton' // Add this import
import NotificationPanel from './NotificationPanel'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const Topbar = ({
  className = '',
  showNotifications = true,
  showMobileMenu = false,
  onMenuClick,
}) => {
  const { currentUser } = useSelector((state) => state.user)

  return (
    <div className={cn('bg-white border-b border-gray-200', className)}>
      <div className='px-6 py-4'>
        <div className='flex items-center justify-between'>
          {/* Left side - Mobile Menu and Install Button */}
          <div className='flex items-center space-x-2 lg:space-x-3'>
            {showMobileMenu && (
              <button
                onClick={onMenuClick}
                className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors'
              >
                <Menu className='h-5 w-5' />
              </button>
            )}

            {/* Install Button - Moved to left side */}
            <InstallButton />
          </div>

          {/* Right side - Notifications and User Profile */}
          <div className='flex items-center space-x-2 lg:space-x-4'>
            {/* Notifications */}
            {showNotifications && <NotificationPanel />}

            {/* User Profile */}
            <div className='flex items-center space-x-3'>
              {/* User Name */}
              <div className='hidden sm:block text-right'>
                <p className='text-sm font-medium text-gray-900'>
                  {currentUser.name}
                </p>
                <p className='text-xs text-gray-500'>{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Topbar
