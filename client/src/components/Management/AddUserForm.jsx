import { motion } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  Heart,
  MessageSquare,
  Plus,
  Sparkles,
} from 'lucide-react'
import React, { useState } from 'react'

// shadcn/ui components
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const AddUserForm = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    spaName: '',
    spaLink: '',
    location: '',
    phoneNumber: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.spaName.trim()) newErrors.spaName = 'SPA name is required'
    if (!formData.spaLink.trim()) newErrors.spaLink = 'SPA link is required'
    if (!formData.location.trim()) newErrors.location = 'Location is required'
    if (!formData.phoneNumber.trim())
      newErrors.phoneNumber = 'Phone number is required'

    // Validate URL format for spa link
    if (formData.spaLink && !formData.spaLink.match(/^https?:\/\/.+/)) {
      newErrors.spaLink =
        'Please enter a valid URL (starting with http:// or https://)'
    }

    // Validate phone number format
    if (
      formData.phoneNumber &&
      !formData.phoneNumber.match(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/)
    ) {
      newErrors.phoneNumber = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Call the onSubmit callback with form data
      if (onSubmit) {
        onSubmit(formData)
      }

      console.log('Adding new SPA user:', formData)

      // Reset form
      setFormData({ spaName: '', spaLink: '', location: '', phoneNumber: '' })
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error adding user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ spaName: '', spaLink: '', location: '', phoneNumber: '' })
      setErrors({})
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <div className='w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center'>
              <Plus className='w-4 h-4 text-white' />
            </div>
            Add New Sub-Account
          </DialogTitle>
          <DialogDescription>
            Create a new user account for a spa or beauty clinic
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* SPA Name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='space-y-2'
          >
            <Label
              htmlFor='spaName'
              className='text-sm font-medium text-gray-700'
            >
              SPA Name *
            </Label>
            <div className='relative'>
              <Input
                id='spaName'
                type='text'
                value={formData.spaName}
                onChange={(e) => handleInputChange('spaName', e.target.value)}
                placeholder='Enter SPA or clinic name...'
                className={`pl-10 transition-all ${
                  errors.spaName
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
              />
              <Heart className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            </div>
            {errors.spaName && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-sm text-red-600 flex items-center gap-1'
              >
                <AlertCircle className='w-3 h-3' />
                {errors.spaName}
              </motion.p>
            )}
          </motion.div>

          {/* SPA Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='space-y-2'
          >
            <Label
              htmlFor='spaLink'
              className='text-sm font-medium text-gray-700'
            >
              SPA GHL Link *
            </Label>
            <div className='relative'>
              <Input
                id='spaLink'
                type='url'
                value={formData.spaLink}
                onChange={(e) => handleInputChange('spaLink', e.target.value)}
                placeholder='https://example-spa.com'
                className={`pl-10 transition-all ${
                  errors.spaLink
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
              />
              <Sparkles className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            </div>
            {errors.spaLink && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-sm text-red-600 flex items-center gap-1'
              >
                <AlertCircle className='w-3 h-3' />
                {errors.spaLink}
              </motion.p>
            )}
          </motion.div>

          {/* Location */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='space-y-2'
          >
            <Label
              htmlFor='location'
              className='text-sm font-medium text-gray-700'
            >
              Location *
            </Label>
            <div className='relative'>
              <Input
                id='location'
                type='text'
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder='City, State/Province, Country'
                className={`pl-10 transition-all ${
                  errors.location
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
              />
              <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            </div>
            {errors.location && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-sm text-red-600 flex items-center gap-1'
              >
                <AlertCircle className='w-3 h-3' />
                {errors.location}
              </motion.p>
            )}
          </motion.div>

          {/* Phone Number */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className='space-y-2'
          >
            <Label
              htmlFor='phoneNumber'
              className='text-sm font-medium text-gray-700'
            >
              Phone Number *
            </Label>
            <div className='relative'>
              <Input
                id='phoneNumber'
                type='tel'
                value={formData.phoneNumber}
                onChange={(e) =>
                  handleInputChange('phoneNumber', e.target.value)
                }
                placeholder='+1 (555) 123-4567'
                className={`pl-10 transition-all ${
                  errors.phoneNumber
                    ? 'border-red-300 focus:border-red-500'
                    : 'focus:border-purple-400'
                }`}
                disabled={isSubmitting}
              />
              <MessageSquare className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            </div>
            {errors.phoneNumber && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-sm text-red-600 flex items-center gap-1'
              >
                <AlertCircle className='w-3 h-3' />
                {errors.phoneNumber}
              </motion.p>
            )}
          </motion.div>

          {/* Form Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className='flex flex-col sm:flex-row gap-3 pt-4'
          >
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isSubmitting}
              className='flex-1 sm:flex-none border-gray-300 hover:border-gray-400'
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={isSubmitting}
              className='flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all'
            >
              {isSubmitting ? (
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  Creating...
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <Plus className='w-4 h-4' />
                  Create Sub-Account
                </div>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className='mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100'
        >
          <div className='flex items-start gap-3'>
            <div className='w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0'>
              <Sparkles className='w-4 h-4 text-white' />
            </div>
            <div>
              <h4 className='font-medium text-gray-900 mb-1'>
                RadiantAI Integration
              </h4>
              <p className='text-sm text-gray-600'>
                This will create a new SPA user account with access to
                RadiantAI's client management and loyalty features.
              </p>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

export default AddUserForm
