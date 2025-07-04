import { motion } from 'framer-motion'
import {
  Camera,
  Check,
  Edit3,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import React, { useState } from 'react'
import Layout from '../Layout/Layout'

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
          whileTap={{ scale: 0.98 }}
          className='flex items-center justify-between p-4 md:p-6 bg-white/90 rounded-xl md:rounded-2xl border border-gray-100 hover:border-pink-200 transition-all active:bg-gray-50 cursor-pointer'
          onClick={onEdit}
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
            className='w-full px-3 md:px-4 py-2.5 md:py-3 bg-white rounded-lg md:rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 md:focus:ring-4 focus:ring-pink-100 transition-all outline-none text-sm md:text-base'
            autoFocus
          />
          <div className='flex gap-2 md:gap-3 mt-3 md:mt-4'>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onSave}
              className='flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all'
            >
              <Check className='w-3.5 h-3.5 md:w-4 md:h-4' />
              Save
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              className='px-4 md:px-6 py-2.5 md:py-3 bg-gray-100 text-gray-600 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-200 transition-all'
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
const ProfileAvatar = () => {
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
            <User className='w-8 h-8 md:w-16 md:h-16 text-gray-400' />
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
          Sarah Johnson
        </h2>
        <div className='flex items-center justify-center gap-1 md:gap-2 text-purple-600 mt-1 md:mt-2'>
          <Sparkles className='w-3 h-3 md:w-4 md:h-4' />
          <span className='text-xs md:text-sm font-medium'>Premium Member</span>
        </div>
      </div>
    </div>
  )
}

// Main Profile Component
const ProfilePage = () => {
  const [formData, setFormData] = useState({
    name: 'Sarah Johnson',
    email: 'sarah@radiantai.com',
    phone: '+1 (555) 123-4567',
    password: '••••••••••',
  })

  const [editingField, setEditingField] = useState(null)
  const [tempValues, setTempValues] = useState({})

  const handleEdit = (field) => {
    setEditingField(field)
    setTempValues({
      ...tempValues,
      [field]: field === 'password' ? '' : formData[field],
    })
  }

  const handleSave = (field) => {
    if (tempValues[field]?.trim()) {
      setFormData({ ...formData, [field]: tempValues[field] })
    }
    setEditingField(null)
  }

  const handleCancel = () => {
    setEditingField(null)
    setTempValues({})
  }

  const handleInputChange = (field, value) => {
    setTempValues({ ...tempValues, [field]: value })
  }

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
                <ProfileAvatar />

                {/* Stats */}
                <div className='grid grid-cols-2 gap-3 md:gap-4'>
                  <div className='p-3 md:p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl md:rounded-2xl text-center'>
                    <p className='text-xs md:text-sm text-gray-600 mb-1'>
                      Member since
                    </p>
                    <p className='text-sm md:text-base font-semibold text-gray-900'>
                      Jan 2024
                    </p>
                  </div>
                  <div className='p-3 md:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl md:rounded-2xl text-center'>
                    <p className='text-xs md:text-sm text-gray-600 mb-1'>
                      Sessions
                    </p>
                    <p className='text-sm md:text-base font-semibold text-gray-900'>
                      127
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
                      editingField === 'name' ? tempValues.name : formData.name
                    }
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    isEditing={editingField === 'name'}
                    onEdit={() => handleEdit('name')}
                    onSave={() => handleSave('name')}
                    onCancel={handleCancel}
                    placeholder='Enter your full name'
                  />

                  <ProfileField
                    icon={Mail}
                    label='Email Address'
                    type='email'
                    value={
                      editingField === 'email'
                        ? tempValues.email
                        : formData.email
                    }
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    isEditing={editingField === 'email'}
                    onEdit={() => handleEdit('email')}
                    onSave={() => handleSave('email')}
                    onCancel={handleCancel}
                    placeholder='Enter your email address'
                  />

                  <ProfileField
                    icon={Phone}
                    label='Phone Number'
                    type='tel'
                    value={
                      editingField === 'phone'
                        ? tempValues.phone
                        : formData.phone
                    }
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    isEditing={editingField === 'phone'}
                    onEdit={() => handleEdit('phone')}
                    onSave={() => handleSave('phone')}
                    onCancel={handleCancel}
                    placeholder='Enter your phone number'
                  />

                  <ProfileField
                    icon={Lock}
                    label='Password'
                    type={editingField === 'password' ? 'password' : 'password'}
                    value={
                      editingField === 'password'
                        ? tempValues.password
                        : formData.password
                    }
                    onChange={(e) =>
                      handleInputChange('password', e.target.value)
                    }
                    isEditing={editingField === 'password'}
                    onEdit={() => handleEdit('password')}
                    onSave={() => handleSave('password')}
                    onCancel={handleCancel}
                    placeholder='Enter new password'
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
