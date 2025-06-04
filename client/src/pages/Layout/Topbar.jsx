import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import React from 'react'
import NotificationPanel from './NotificationPanel'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const Topbar = ({
  user = {
    firstName: 'Sarah',
    lastName: 'Johnson',
  },
  className = '',
  showNotifications = true,
  showMobileMenu = false,
  onMenuClick,
}) => {
  // Generate initials from first and last name
  const getInitials = (firstName, lastName) => {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : ''
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : ''
    return firstInitial + lastInitial
  }

  const initials = getInitials(user.firstName, user.lastName)
  const fullName = `${user.firstName} ${user.lastName}`

  return (
    <div className={cn('bg-white border-b border-gray-200', className)}>
      <div className='px-6 py-4'>
        <div className='flex items-center justify-between'>
          {/* Left side - Mobile Menu */}
          <div className='flex items-center'>
            {showMobileMenu && (
              <button
                onClick={onMenuClick}
                className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors'
              >
                <Menu className='h-5 w-5' />
              </button>
            )}
          </div>

          {/* Right side - Notifications and User Profile */}
          <div className='flex items-center space-x-4'>
            {/* Notifications */}
            {showNotifications && <NotificationPanel />}

            {/* User Profile */}
            <div className='flex items-center space-x-3'>
              {/* User Name */}
              <div className='hidden sm:block text-right'>
                <p className='text-sm font-medium text-gray-900'>{fullName}</p>
                <p className='text-xs text-gray-500'>{user.role}</p>
              </div>

              {/* Profile Avatar */}
              <div className='w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center'>
                <span className='text-white text-sm font-medium'>
                  {initials}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Topbar
