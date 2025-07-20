import { axiosInstance } from '@/config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Camera,
  Check,
  Edit3,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import Layout from '../Layout/Layout'

// API Functions
const profileAPI = {
  getCurrentUser: async () => {
    const { data } = await axiosInstance.get('/auth/me')
    return data.data.user
  },
  updateUser: async ({ userId, userData }) => {
    console.log('API: Updating user:', userId, 'with data:', userData)
    try {
      const { data } = await axiosInstance.put(
        `/auth/update/${userId}`,
        userData
      )
      console.log('API: Update successful:', data)
      return data.data.user
    } catch (error) {
      console.error(
        'API: Update failed:',
        error.response?.data || error.message
      )
      throw error
    }
  },
  changePassword: async (passwordData) => {
    const { data } = await axiosInstance.put(
      '/auth/change-password',
      passwordData
    )
    return data
  },
}

// Responsive Profile Input Component
const ProfileField = ({
  icon: Icon,
  label,
  type = 'text',
  value,
  onChange,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder,
  disabled = false,
  error = null,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='w-full'
    >
      {!isEditing ? (
        <motion.div
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          className={`flex items-center justify-between p-4 md:p-6 bg-white/90 rounded-xl md:rounded-2xl border border-gray-100 hover:border-pink-200 transition-all ${
            disabled
              ? 'opacity-60 cursor-not-allowed'
              : 'active:bg-gray-50 cursor-pointer'
          }`}
          onClick={disabled ? undefined : onEdit}
        >
          <div className='flex items-center gap-3 md:gap-4 min-w-0 flex-1'>
            <div className='p-2 md:p-3 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg md:rounded-xl shrink-0'>
              <Icon className='w-4 h-4 md:w-5 md:h-5 text-purple-600' />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-xs md:text-sm font-medium text-gray-500 mb-0.5 md:mb-1'>
                {label}
              </p>
              <p className='text-sm md:text-base text-gray-900 font-medium truncate'>
                {value}
              </p>
            </div>
          </div>
          {!disabled && (
            <Edit3 className='w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity' />
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          className='p-4 md:p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl md:rounded-2xl border-2 border-pink-200'
        >
          <div className='flex items-center gap-3 md:gap-4 mb-3 md:mb-4'>
            <div className='p-2 md:p-3 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg md:rounded-xl'>
              <Icon className='w-4 h-4 md:w-5 md:h-5 text-white' />
            </div>
            <p className='text-xs md:text-sm font-medium text-gray-700'>
              {label}
            </p>
          </div>
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-white rounded-lg md:rounded-xl border ${
              error
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border-gray-200 focus:border-pink-400 focus:ring-pink-100'
            } focus:ring-2 md:focus:ring-4 transition-all outline-none text-sm md:text-base`}
            autoFocus
          />
          {error && <p className='text-red-500 text-xs mt-2'>{error}</p>}
          <div className='flex gap-2 md:gap-3 mt-3 md:mt-4'>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onSave}
              disabled={disabled}
              className='flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all disabled:opacity-50'
            >
              {disabled ? (
                <Loader2 className='w-3.5 h-3.5 md:w-4 md:h-4 animate-spin' />
              ) : (
                <Check className='w-3.5 h-3.5 md:w-4 md:h-4' />
              )}
              {disabled ? 'Saving...' : 'Save'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              disabled={disabled}
              className='px-4 md:px-6 py-2.5 md:py-3 bg-gray-100 text-gray-600 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-200 transition-all disabled:opacity-50'
            >
              <X className='w-3.5 h-3.5 md:w-4 md:h-4' />
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Password Change Component
const PasswordChangeField = ({
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isLoading,
}) => {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})

  const validatePasswords = () => {
    const newErrors = {}

    if (!passwords.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    if (!passwords.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (passwords.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters'
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validatePasswords()) {
      onSave({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
    }
  }

  const handleCancel = () => {
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setErrors({})
    onCancel()
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='w-full'
    >
      {!isEditing ? (
        <motion.div
          whileTap={{ scale: 0.98 }}
          className='flex items-center justify-between p-4 md:p-6 bg-white/90 rounded-xl md:rounded-2xl border border-gray-100 hover:border-pink-200 transition-all active:bg-gray-50 cursor-pointer'
          onClick={onEdit}
        >
          <div className='flex items-center gap-3 md:gap-4 min-w-0 flex-1'>
            <div className='p-2 md:p-3 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg md:rounded-xl shrink-0'>
              <Lock className='w-4 h-4 md:w-5 md:h-5 text-purple-600' />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-xs md:text-sm font-medium text-gray-500 mb-0.5 md:mb-1'>
                Password
              </p>
              <p className='text-sm md:text-base text-gray-900 font-medium truncate'>
                ••••••••••
              </p>
            </div>
          </div>
          <Edit3 className='w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity' />
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          className='p-4 md:p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl md:rounded-2xl border-2 border-pink-200'
        >
          <div className='flex items-center gap-3 md:gap-4 mb-3 md:mb-4'>
            <div className='p-2 md:p-3 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg md:rounded-xl'>
              <Lock className='w-4 h-4 md:w-5 md:h-5 text-white' />
            </div>
            <p className='text-xs md:text-sm font-medium text-gray-700'>
              Change Password
            </p>
          </div>

          <div className='space-y-3'>
            <div>
              <input
                type='password'
                placeholder='Current password'
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    currentPassword: e.target.value,
                  })
                }
                className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-white rounded-lg md:rounded-xl border ${
                  errors.currentPassword ? 'border-red-300' : 'border-gray-200'
                } focus:border-pink-400 focus:ring-2 md:focus:ring-4 focus:ring-pink-100 transition-all outline-none text-sm md:text-base`}
                autoFocus
              />
              {errors.currentPassword && (
                <p className='text-red-500 text-xs mt-1'>
                  {errors.currentPassword}
                </p>
              )}
            </div>

            <div>
              <input
                type='password'
                placeholder='New password (min 8 characters)'
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
                className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-white rounded-lg md:rounded-xl border ${
                  errors.newPassword ? 'border-red-300' : 'border-gray-200'
                } focus:border-pink-400 focus:ring-2 md:focus:ring-4 focus:ring-pink-100 transition-all outline-none text-sm md:text-base`}
              />
              {errors.newPassword && (
                <p className='text-red-500 text-xs mt-1'>
                  {errors.newPassword}
                </p>
              )}
            </div>

            <div>
              <input
                type='password'
                placeholder='Confirm new password'
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    confirmPassword: e.target.value,
                  })
                }
                className={`w-full px-3 md:px-4 py-2.5 md:py-3 bg-white rounded-lg md:rounded-xl border ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                } focus:border-pink-400 focus:ring-2 md:focus:ring-4 focus:ring-pink-100 transition-all outline-none text-sm md:text-base`}
              />
              {errors.confirmPassword && (
                <p className='text-red-500 text-xs mt-1'>
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <div className='flex gap-2 md:gap-3 mt-4'>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={isLoading}
              className='flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all disabled:opacity-50'
            >
              {isLoading ? (
                <Loader2 className='w-3.5 h-3.5 md:w-4 md:h-4 animate-spin' />
              ) : (
                <Check className='w-3.5 h-3.5 md:w-4 md:h-4' />
              )}
              {isLoading ? 'Changing...' : 'Save'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              disabled={isLoading}
              className='px-4 md:px-6 py-2.5 md:py-3 bg-gray-100 text-gray-600 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-200 transition-all disabled:opacity-50'
            >
              <X className='w-3.5 h-3.5 md:w-4 md:h-4' />
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Responsive Profile Avatar
const ProfileAvatar = ({ user }) => {
  const getInitials = (name) => {
    return (
      name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'U'
    )
  }

  const getRoleDisplay = (role) => {
    const roleMap = {
      admin: 'Admin User',
      enterprise: 'Enterprise Member',
      team: 'Team Member',
      user: 'Premium Member',
    }
    return roleMap[role] || 'Member'
  }

  return (
    <div className='flex flex-col items-center mb-6 md:mb-8'>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className='relative'
      >
        <div className='w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 p-0.5 md:p-1 shadow-lg md:shadow-2xl'>
          <div className='w-full h-full rounded-full bg-white flex items-center justify-center'>
            <span className='text-lg md:text-3xl font-bold text-gray-600'>
              {getInitials(user?.name)}
            </span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className='absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 p-1.5 md:p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full shadow-md md:shadow-lg hover:shadow-xl transition-all'
        >
          <Camera className='w-3 h-3 md:w-4 md:h-4 text-white' />
        </motion.button>
      </motion.div>

      <div className='text-center mt-3 md:mt-6'>
        <h2 className='text-lg md:text-2xl font-bold text-gray-900'>
          {user?.name || 'Loading...'}
        </h2>
        <div className='flex items-center justify-center gap-1 md:gap-2 text-purple-600 mt-1 md:mt-2'>
          <Sparkles className='w-3 h-3 md:w-4 md:h-4' />
          <span className='text-xs md:text-sm font-medium'>
            {getRoleDisplay(user?.role)}
          </span>
        </div>
      </div>
    </div>
  )
}

// Loading Component
const LoadingState = () => (
  <div className='min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/40 flex items-center justify-center'>
    <div className='text-center'>
      <Loader2 className='w-8 h-8 animate-spin text-purple-500 mx-auto mb-4' />
      <p className='text-gray-600'>Loading your profile...</p>
    </div>
  </div>
)

// Error Component
const ErrorState = ({ error, retry }) => (
  <div className='min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/40 flex items-center justify-center'>
    <div className='text-center max-w-md mx-auto p-6'>
      <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
      <h2 className='text-xl font-semibold text-gray-900 mb-2'>
        Failed to load profile
      </h2>
      <p className='text-gray-600 mb-4'>
        {error?.message || 'Something went wrong'}
      </p>
      <button
        onClick={retry}
        className='px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all'
      >
        Try Again
      </button>
    </div>
  </div>
)

// Main Profile Component
const ProfilePage = () => {
  const queryClient = useQueryClient()
  const { currentUser } = useSelector((state) => state.user)

  // React Query hooks
  const {
    data: userData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: profileAPI.getCurrentUser,
    initialData: currentUser,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      console.error('Error fetching user:', error)
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: profileAPI.updateUser,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['currentUser'], updatedUser)
      // Show success message (replace with your notification system)
      alert('Profile updated successfully!')
    },
    onError: (error) => {
      console.error('Full error object:', error)
      console.error('Error response:', error.response)
      console.error('Error response data:', error.response?.data)

      let errorMessage = 'Failed to update profile'

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      // Show detailed error for debugging
      alert(`Error updating profile: ${errorMessage}`)
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: profileAPI.changePassword,
    onSuccess: (data) => {
      // Show success message (replace with your notification system)
      alert(data.message || 'Password changed successfully!')
    },
    onError: (error) => {
      console.error('Error changing password:', error)
      const errorMessage =
        error.response?.data?.message || 'Failed to change password'
      alert(`Error: ${errorMessage}`)
    },
  })

  const [editingField, setEditingField] = useState(null)
  const [tempValues, setTempValues] = useState({})

  // Format user data
  const user = userData
    ? {
        ...userData,
        memberSince: new Date(userData.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        points: userData.points || 0,
      }
    : null

  const handleEdit = (field) => {
    setEditingField(field)
    setTempValues({
      ...tempValues,
      [field]: user?.[field] || '',
    })
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSave = (field) => {
    const value = tempValues[field]?.trim()

    if (!value) {
      alert('Field cannot be empty')
      return
    }

    // Additional validation for email
    if (field === 'email') {
      if (!validateEmail(value)) {
        alert('Please enter a valid email address')
        return
      }

      if (value === user.email) {
        alert('New email is the same as current email')
        setEditingField(null)
        setTempValues({})
        return
      }
    }

    console.log('Saving field:', field, 'with value:', value)
    console.log('User ID:', user._id)

    updateProfileMutation.mutate(
      {
        userId: user._id,
        userData: { [field]: value },
      },
      {
        onSuccess: () => {
          setEditingField(null)
          setTempValues({})
        },
        onError: (error) => {
          console.log('Save failed for field:', field)
          // Keep editing mode open on error so user can try again
        },
      }
    )
  }

  const handlePasswordChange = (passwordData) => {
    changePasswordMutation.mutate(passwordData, {
      onSuccess: () => {
        setEditingField(null)
      },
    })
  }

  const handleCancel = () => {
    setEditingField(null)
    setTempValues({})
  }

  const handleInputChange = (field, value) => {
    setTempValues({ ...tempValues, [field]: value })
  }

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} retry={refetch} />
  if (!user)
    return (
      <ErrorState error={{ message: 'User data not found' }} retry={refetch} />
    )

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/40 overflow-x-hidden'>
        {/* Background Elements */}
        <div className='fixed inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute top-20 left-4 md:left-1/4 w-32 h-32 md:w-64 md:h-64 bg-pink-200/20 md:bg-pink-200/30 rounded-full blur-2xl md:blur-3xl animate-pulse' />
          <div
            className='absolute bottom-20 right-4 md:right-1/4 w-40 h-40 md:w-80 md:h-80 bg-purple-200/15 md:bg-purple-200/20 rounded-full blur-2xl md:blur-3xl animate-pulse'
            style={{ animationDelay: '1s' }}
          />
        </div>

        <div className='relative z-10 w-full max-w-md md:max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center mb-8 md:mb-16'
          >
            <h1 className='text-3xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent mb-2 md:mb-6'>
              Profile
            </h1>
            <p className='text-sm md:text-xl text-gray-600 max-w-2xl mx-auto'>
              <span className='md:hidden'>Manage your RadiantAI account</span>
              <span className='hidden md:block'>
                Manage your identity with style.
              </span>
            </p>
          </motion.div>

          {/* Responsive Layout */}
          <div className='md:grid md:grid-cols-5 md:gap-8 lg:gap-12'>
            {/* Profile Sidebar - Desktop */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className='md:col-span-2 mb-6 md:mb-0'
            >
              <div className='bg-white/90 backdrop-blur-lg rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl border border-white/50 md:sticky md:top-8'>
                <ProfileAvatar user={user} />

                {/* Stats */}
                <div className='grid grid-cols-2 gap-3 md:gap-4'>
                  <div className='p-3 md:p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl md:rounded-2xl text-center'>
                    <p className='text-xs md:text-sm text-gray-600 mb-1'>
                      Member since
                    </p>
                    <p className='text-sm md:text-base font-semibold text-gray-900'>
                      {user.memberSince}
                    </p>
                  </div>
                  <div className='p-3 md:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl md:rounded-2xl text-center'>
                    <p className='text-xs md:text-sm text-gray-600 mb-1'>
                      Points
                    </p>
                    <p className='text-sm md:text-base font-semibold text-gray-900'>
                      {user.points}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Settings Panel */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className='md:col-span-3'
            >
              <div className='bg-white/90 backdrop-blur-lg rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl border border-white/50'>
                <div className='flex items-center gap-3 md:gap-4 mb-6 md:mb-8'>
                  <div className='p-2 md:p-3 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg md:rounded-xl'>
                    <User className='w-4 h-4 md:w-6 md:h-6 text-white' />
                  </div>
                  <div>
                    <h3 className='text-lg md:text-2xl font-bold text-gray-900'>
                      Account Settings
                    </h3>
                    <p className='text-xs md:text-base text-gray-600'>
                      <span className='md:hidden'>Tap any field to edit</span>
                      <span className='hidden md:block'>
                        Manage your personal information
                      </span>
                    </p>
                  </div>
                </div>

                <div className='space-y-4 md:space-y-6'>
                  <ProfileField
                    icon={User}
                    label='Full Name'
                    value={
                      editingField === 'name' ? tempValues.name : user.name
                    }
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    isEditing={editingField === 'name'}
                    onEdit={() => handleEdit('name')}
                    onSave={() => handleSave('name')}
                    onCancel={handleCancel}
                    placeholder='Enter your full name'
                    disabled={updateProfileMutation.isLoading}
                  />

                  <ProfileField
                    icon={Mail}
                    label='Email Address'
                    type='email'
                    value={
                      editingField === 'email' ? tempValues.email : user.email
                    }
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    isEditing={editingField === 'email'}
                    onEdit={() => handleEdit('email')}
                    onSave={() => handleSave('email')}
                    onCancel={handleCancel}
                    placeholder='Enter your email address'
                    disabled={updateProfileMutation.isLoading}
                  />

                  <PasswordChangeField
                    isEditing={editingField === 'password'}
                    onEdit={() => setEditingField('password')}
                    onSave={handlePasswordChange}
                    onCancel={handleCancel}
                    isLoading={changePasswordMutation.isLoading}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ProfilePage
