import { axiosInstance } from '@/config'
import {
  useContacts,
  useContactStats,
  usePrefetchContacts,
} from '@/hooks/useContacts'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  Globe,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Search,
  Tag,
  Target,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../Layout/Layout'

// Animation variants (keeping your existing ones)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
}

const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
    },
  },
}

const tableRowVariants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 35,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.15,
    },
  },
}

const dropdownVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.15,
    },
  },
}

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
}

// Contact Detail Modal Component
const ContactDetailModal = ({ contactId, isOpen, onClose }) => {
  // Use React Query hook for fetching contact details
  const {
    data: contactData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/ghl/contacts/${contactId}`)
      return response.data
    },
    enabled: isOpen && !!contactId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  })

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = '0px' // Prevent layout shift
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = 'unset'
    }

    // Cleanup on unmount or when modal closes
    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const contact = contactData?.data?.contact
  const displayName = contact
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
      contact.contactName ||
      'Unknown Contact'
    : 'Loading...'

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleRetry = () => {
    refetch()
  }

  return (
    <AnimatePresence>
      <motion.div
        className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className='absolute inset-0 bg-black/50 backdrop-blur-sm'
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal Content - Mobile First Design */}
        <motion.div
          variants={modalVariants}
          initial='hidden'
          animate='visible'
          exit='exit'
          className='relative w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-4xl sm:mx-4 bg-white sm:rounded-xl shadow-2xl overflow-hidden'
        >
          {/* Header - Mobile Optimized */}
          <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50'>
            <div className='flex items-center gap-3 flex-1 min-w-0'>
              <motion.div
                className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm sm:text-lg flex-shrink-0'
                whileHover={{ scale: 1.05 }}
              >
                {displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </motion.div>
              <div className='min-w-0 flex-1'>
                <h2 className='text-lg sm:text-2xl font-bold text-gray-900 truncate'>
                  {displayName}
                </h2>
                {contact?.email && (
                  <p className='text-sm sm:text-base text-gray-600 truncate'>
                    {contact.email}
                  </p>
                )}
              </div>
            </div>

            {/* Close Button - Larger for mobile */}
            <motion.button
              onClick={onClose}
              className='p-2 sm:p-2 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0 ml-2'
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className='w-6 h-6 sm:w-6 sm:h-6 text-gray-500' />
            </motion.button>
          </div>

          {/* Content - Mobile Scrollable */}
          <div
            className='overflow-y-auto flex-1 pb-20 sm:pb-0'
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
            {isLoading && (
              <div className='flex flex-col items-center justify-center py-12 px-4'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4'></div>
                <span className='text-gray-600 text-center'>
                  Loading contact details...
                </span>
              </div>
            )}

            {error && (
              <div className='p-4 sm:p-6 text-center'>
                <div className='text-red-500 mb-4 text-sm sm:text-base'>
                  {error?.response?.data?.message ||
                    error?.message ||
                    'Failed to load contact details'}
                </div>
                <button
                  onClick={handleRetry}
                  className='px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-medium'
                >
                  Try Again
                </button>
              </div>
            )}

            {contact && !isLoading && !error && (
              <div className='p-4 sm:p-6 space-y-4 sm:space-y-6'>
                {/* Basic Information */}
                <motion.div
                  className='bg-gray-50 rounded-lg p-3 sm:p-4'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2'>
                    <User className='w-4 h-4 sm:w-5 sm:h-5' />
                    Basic Information
                  </h3>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                    <div>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        First Name
                      </label>
                      <p className='text-sm sm:text-base text-gray-900'>
                        {contact.firstName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Last Name
                      </label>
                      <p className='text-sm sm:text-base text-gray-900'>
                        {contact.lastName || 'N/A'}
                      </p>
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Email
                      </label>
                      <div className='flex items-center gap-2'>
                        <p className='text-sm sm:text-base text-gray-900 flex-1 min-w-0 truncate'>
                          {contact.email || 'N/A'}
                        </p>
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className='text-pink-500 hover:text-pink-600 p-1 flex-shrink-0'
                          >
                            <Mail className='w-4 h-4' />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Phone
                      </label>
                      <div className='flex items-center gap-2'>
                        <p className='text-sm sm:text-base text-gray-900 flex-1 min-w-0'>
                          {contact.phone || 'N/A'}
                        </p>
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className='text-pink-500 hover:text-pink-600 p-1 flex-shrink-0'
                          >
                            <Phone className='w-4 h-4' />
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Country
                      </label>
                      <div className='flex items-center gap-2'>
                        <Globe className='w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0' />
                        <p className='text-sm sm:text-base text-gray-900'>
                          {contact.country || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Type
                      </label>
                      <ContactTypeBadge
                        type={contact.type}
                        tags={contact.tags}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Contact Meta Information */}
                <motion.div
                  className='bg-blue-50 rounded-lg p-3 sm:p-4'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2'>
                    <Clock className='w-4 h-4 sm:w-5 sm:h-5' />
                    Contact Details
                  </h3>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Date Added
                      </label>
                      <p className='text-sm sm:text-base text-gray-900'>
                        {formatDate(contact.dateAdded)}
                      </p>
                    </div>
                    <div>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Source
                      </label>
                      <p className='text-sm sm:text-base text-gray-900'>
                        {contact.source || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Assigned To
                      </label>
                      <p className='text-xs sm:text-sm text-gray-900 font-mono break-all'>
                        {contact.assignedTo || 'N/A'}
                      </p>
                    </div>
                    <div className='sm:col-span-2'>
                      <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                        Contact ID
                      </label>
                      <p className='text-xs sm:text-sm text-gray-900 font-mono break-all'>
                        {contact.id}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <motion.div
                    className='bg-green-50 rounded-lg p-3 sm:p-4'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2'>
                      <Tag className='w-4 h-4 sm:w-5 sm:h-5' />
                      Tags ({contact.tags.length})
                    </h3>
                    <div className='flex flex-wrap gap-2'>
                      {contact.tags.map((tag, index) => (
                        <motion.span
                          key={index}
                          className='px-2 py-1 sm:px-3 sm:py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium'
                          whileHover={{ scale: 1.05 }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Custom Fields */}
                {contact.customField && contact.customField.length > 0 && (
                  <motion.div
                    className='bg-purple-50 rounded-lg p-3 sm:p-4'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2'>
                      <Users className='w-4 h-4 sm:w-5 sm:h-5' />
                      Custom Fields
                    </h3>
                    <div className='space-y-3'>
                      {contact.customField.map((field, index) => (
                        <div
                          key={index}
                          className='border-b border-purple-200 pb-2 last:border-b-0'
                        >
                          <label className='block text-xs sm:text-sm font-medium text-gray-700'>
                            {field.name || `Field ${index + 1}`}
                          </label>
                          <p className='text-sm sm:text-base text-gray-900'>
                            {field.value || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Attribution Source */}
                {contact.attributionSource &&
                  Object.keys(contact.attributionSource).length > 0 && (
                    <motion.div
                      className='bg-orange-50 rounded-lg p-3 sm:p-4'
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2'>
                        <Target className='w-4 h-4 sm:w-5 sm:h-5' />
                        Attribution Source
                      </h3>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                        {Object.entries(contact.attributionSource).map(
                          ([key, value]) => {
                            if (!value) return null
                            return (
                              <div key={key}>
                                <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-1 capitalize'>
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </label>
                                <p className='text-xs sm:text-sm text-gray-900 break-words'>
                                  {value}
                                </p>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </motion.div>
                  )}
              </div>
            )}
          </div>

          {/* Footer - Fixed at bottom on mobile */}
          <div className='absolute bottom-0 left-0 right-0 sm:relative sm:bottom-auto border-t border-gray-200 p-3 sm:p-4 bg-gray-50'>
            <div className='flex flex-col sm:flex-row justify-end gap-2 sm:gap-3'>
              <motion.button
                onClick={onClose}
                className='w-full sm:w-auto px-4 py-3 sm:py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium order-2 sm:order-1'
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
              {contact && (
                <motion.button
                  className='w-full sm:w-auto px-4 py-3 sm:py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex items-center justify-center gap-2 font-medium order-1 sm:order-2'
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Edit3 className='w-4 h-4' />
                  Edit Contact
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Professional Status Badge Component (adapted for contact types)
const ContactTypeBadge = ({ type, tags = [] }) => {
  const typeConfig = {
    lead: {
      color: 'bg-blue-50 text-blue-700 border border-blue-200',
      dot: 'bg-blue-500',
    },
    customer: {
      color: 'bg-green-50 text-green-700 border border-green-200',
      dot: 'bg-green-500',
    },
    prospect: {
      color: 'bg-amber-50 text-amber-700 border border-amber-200',
      dot: 'bg-amber-500',
    },
  }

  // Check if contact has specific tags that indicate status
  const hasTag = (tagName) =>
    tags.some((tag) => tag.toLowerCase().includes(tagName.toLowerCase()))

  let displayType = type
  if (hasTag('customer') || hasTag('completed')) displayType = 'customer'
  else if (hasTag('prospect') || hasTag('interested')) displayType = 'prospect'

  const config = typeConfig[displayType] || typeConfig.lead

  return (
    <motion.div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <motion.div
        className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className='capitalize'>{displayType}</span>
    </motion.div>
  )
}

// Action Dropdown Component
const ActionDropdown = ({ contact, onViewDetails }) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleViewClick = () => {
    onViewDetails(contact.id)
    setIsOpen(false)
  }

  return (
    <div className='relative'>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className='p-1.5 hover:bg-gray-100 rounded-md transition-colors duration-200'
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MoreVertical className='w-4 h-4 text-gray-400' />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className='fixed inset-0 z-10'
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              variants={dropdownVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='absolute right-0 top-8 w-32 sm:w-40 bg-white rounded-lg border border-gray-200 py-1 z-20'
            >
              <motion.button
                onClick={handleViewClick}
                className='w-full px-3 py-1.5 sm:py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2'
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Eye className='w-3 h-3' />
                View Details
              </motion.button>
              <motion.button
                className='w-full px-3 py-1.5 sm:py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2'
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Edit3 className='w-3 h-3' />
                Edit
              </motion.button>
              <motion.button
                className='w-full px-3 py-1.5 sm:py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2'
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Trash2 className='w-3 h-3' />
                Delete
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Mobile Card Component (adapted for contacts)
const ContactCard = ({ contact, onViewDetails }) => {
  const displayName =
    contact.contactName ||
    `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
    'Unknown Contact'
  const formattedDate = new Date(contact.dateAdded).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial='hidden'
      animate='visible'
      exit='exit'
      className='bg-white rounded-lg border border-gray-200 p-3 mb-2'
      whileHover={{
        y: -1,
        transition: { type: 'spring', stiffness: 400, damping: 30 },
      }}
    >
      {/* Header Row - Contact & Actions */}
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <motion.div
            className='w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0'
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
          </motion.div>
          <div className='min-w-0 flex-1'>
            <p className='font-medium text-gray-900 text-sm truncate'>
              {displayName}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2 flex-shrink-0'>
          <ContactTypeBadge type={contact.type} tags={contact.tags} />
          <ActionDropdown contact={contact} onViewDetails={onViewDetails} />
        </div>
      </div>

      {/* Contact Info Row */}
      <div className='flex items-center justify-between mb-2'>
        <div className='flex-1 min-w-0'>
          {contact.email && (
            <div className='flex items-center gap-1 mb-1'>
              <Mail className='w-3 h-3 text-gray-400' />
              <p className='text-xs text-gray-600 truncate'>{contact.email}</p>
            </div>
          )}
          {contact.phone && (
            <div className='flex items-center gap-1'>
              <Phone className='w-3 h-3 text-gray-400' />
              <p className='text-xs text-gray-600'>{contact.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Date & Tags Row */}
      <div className='flex items-center justify-between text-xs text-gray-500'>
        <div className='flex items-center gap-1'>
          <Calendar className='w-3 h-3' />
          <span>Added {formattedDate}</span>
        </div>
        {contact.tags?.length > 0 && (
          <div className='flex items-center gap-1'>
            <Tag className='w-3 h-3' />
            <span className='hidden xs:inline'>{contact.tags.length} tags</span>
            <span className='xs:hidden'>{contact.tags.length}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Professional Table Row Component (adapted for contacts)
const ContactRow = ({ contact, onViewDetails }) => {
  const displayName =
    contact.contactName ||
    `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
    'Unknown Contact'
  const formattedDate = new Date(contact.dateAdded).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )

  return (
    <motion.div
      layout
      variants={tableRowVariants}
      initial='hidden'
      animate='visible'
      exit='exit'
      className='border-b border-gray-100'
    >
      <div className='grid grid-cols-12 gap-4 items-center py-3 px-4'>
        {/* Contact Info */}
        <div className='col-span-12 md:col-span-3'>
          <div className='flex items-center gap-3'>
            <motion.div
              className='w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium text-xs'
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {displayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </motion.div>
            <div className='min-w-0'>
              <p className='font-medium text-gray-900 truncate text-sm'>
                {displayName}
              </p>
              <p className='text-xs text-gray-500 truncate'>
                {contact.phone || 'No phone'}
              </p>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className='col-span-6 md:col-span-2'>
          <p className='font-medium text-gray-900 text-sm truncate'>
            {contact.email || 'No email'}
          </p>
        </div>

        {/* Date Added */}
        <div className='col-span-6 md:col-span-2'>
          <p className='font-medium text-gray-900 text-sm'>{formattedDate}</p>
          <p className='text-xs text-gray-500'>
            {new Date(contact.dateAdded).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Type/Status */}
        <div className='col-span-6 md:col-span-2'>
          <ContactTypeBadge type={contact.type} tags={contact.tags} />
        </div>

        {/* Tags Count */}
        <div className='col-span-4 md:col-span-2'>
          <motion.p
            className='font-semibold text-gray-900'
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {contact.tags?.length || 0} tags
          </motion.p>
        </div>

        {/* Actions */}
        <div className='col-span-2 md:col-span-1 flex justify-end'>
          <ActionDropdown contact={contact} onViewDetails={onViewDetails} />
        </div>
      </div>
    </motion.div>
  )
}

// Professional Search and Filter Bar
const SearchFilterBar = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <motion.div
      variants={itemVariants}
      className='flex flex-col sm:flex-row gap-2 sm:gap-4 mb-3 sm:mb-6'
    >
      {/* Search */}
      <div className='relative flex-1'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
        <motion.input
          type='text'
          placeholder='Search contacts, emails, phones...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 bg-white text-sm transition-all duration-200'
          whileFocus={{
            scale: 1.01,
            transition: { type: 'spring', stiffness: 400, damping: 30 },
          }}
        />
      </div>

      {/* Filter */}
      <div className='relative'>
        <motion.select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className='pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 bg-white appearance-none min-w-[120px] text-sm'
          whileFocus={{
            scale: 1.01,
            transition: { type: 'spring', stiffness: 400, damping: 30 },
          }}
        >
          <option value='all'>All Types</option>
          <option value='lead'>Leads</option>
          <option value='customer'>Customers</option>
          <option value='prospect'>Prospects</option>
        </motion.select>
        <ChevronDown className='absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none' />
      </div>
    </motion.div>
  )
}

// Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
  totalItems,
  itemsPerPage,
}) => {
  return (
    <motion.div
      className='flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className='flex-1 flex justify-between items-center'>
        <div>
          <p className='text-sm text-gray-700'>
            Showing{' '}
            <span className='font-medium'>
              {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
            </span>{' '}
            to{' '}
            <span className='font-medium'>
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{' '}
            of <span className='font-medium'>{totalItems}</span> results
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <motion.button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className='relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className='h-4 w-4' />
          </motion.button>

          <span className='text-sm text-gray-700'>
            Page {currentPage} of {totalPages}
          </span>

          <motion.button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            className='relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight className='h-4 w-4' />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// Compact Stats Card
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color = 'pink',
  isLoading = false,
}) => {
  const colorClasses = {
    pink: 'from-pink-500 to-rose-500',
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
  }

  return (
    <motion.div
      variants={itemVariants}
      className='bg-white rounded-lg p-2 sm:p-4 border border-gray-100'
      whileHover={{
        y: -1,
        shadow:
          '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        transition: { type: 'spring', stiffness: 400, damping: 30 },
      }}
    >
      <div className='flex items-center justify-between'>
        <div className='flex-1 min-w-0'>
          <p className='text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate'>
            {title}
          </p>
          <motion.p
            className='text-base sm:text-2xl font-bold text-gray-900'
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              delay: 0.1,
            }}
          >
            {isLoading ? (
              <div className='w-8 h-6 bg-gray-200 animate-pulse rounded'></div>
            ) : (
              value
            )}
          </motion.p>
        </div>
        <motion.div
          className={`p-1.5 sm:p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex-shrink-0`}
          whileHover={{
            scale: 1.05,
            rotate: 5,
            transition: { type: 'spring', stiffness: 400, damping: 30 },
          }}
        >
          <Icon className='w-3 h-3 sm:w-6 sm:h-6 text-white' />
        </motion.div>
      </div>
    </motion.div>
  )
}

// Professional Table Header
const TableHeader = () => (
  <motion.div
    className='bg-gray-50 border-b border-gray-200 hidden md:block'
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3 }}
  >
    <div className='grid grid-cols-12 gap-4 py-3 px-4'>
      <div className='col-span-12 md:col-span-3'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Contact
        </p>
      </div>
      <div className='col-span-6 md:col-span-2'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Email
        </p>
      </div>
      <div className='col-span-6 md:col-span-2'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Date Added
        </p>
      </div>
      <div className='col-span-6 md:col-span-2'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Type
        </p>
      </div>
      <div className='col-span-4 md:col-span-2'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Tags
        </p>
      </div>
      <div className='col-span-2 md:col-span-1'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide text-right'>
          Actions
        </p>
      </div>
    </div>
  </motion.div>
)

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className='space-y-3'>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className='bg-white rounded-lg border border-gray-200 p-3'>
        <div className='animate-pulse'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-7 h-7 bg-gray-300 rounded-full'></div>
            <div className='h-4 bg-gray-300 rounded w-32'></div>
          </div>
          <div className='h-3 bg-gray-300 rounded w-48 mb-1'></div>
          <div className='h-3 bg-gray-300 rounded w-24'></div>
        </div>
      </div>
    ))}
  </div>
)

const ContactsPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const itemsPerPage = 20

  // Calculate skip for pagination
  const skip = (currentPage - 1) * itemsPerPage

  // Fetch contacts with pagination
  const {
    data: contactsData,
    isLoading: isContactsLoading,
    error: contactsError,
    isFetching,
  } = useContacts({
    limit: itemsPerPage,
    skip,
    searchTerm,
  })

  // Fetch stats
  const { data: statsData, isLoading: isStatsLoading } = useContactStats()

  // Prefetch next page
  const prefetchContacts = usePrefetchContacts()

  // Prefetch next page when current page loads
  useEffect(() => {
    if (contactsData?.pagination?.total) {
      const totalPages = Math.ceil(contactsData.pagination.total / itemsPerPage)
      if (currentPage < totalPages) {
        prefetchContacts({ limit: itemsPerPage, skip })
      }
    }
  }, [contactsData, currentPage, prefetchContacts, skip])

  // Filter contacts based on search and status (client-side filtering for cached data)
  const filteredContacts = useMemo(() => {
    if (!contactsData?.data?.contacts) return []

    return contactsData.data.contacts.filter((contact) => {
      const matchesSearch =
        searchTerm === '' ||
        contact.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.includes(searchTerm)

      const matchesStatus =
        statusFilter === 'all' ||
        contact.type === statusFilter ||
        (statusFilter === 'customer' &&
          contact.tags?.some((tag) =>
            tag.toLowerCase().includes('customer')
          )) ||
        (statusFilter === 'prospect' &&
          contact.tags?.some((tag) => tag.toLowerCase().includes('prospect')))

      return matchesSearch && matchesStatus
    })
  }, [contactsData, searchTerm, statusFilter])

  // Calculate pagination
  const totalItems = contactsData?.pagination?.total || 0
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle view contact details
  const handleViewDetails = (contactId) => {
    setSelectedContactId(contactId)
    setIsDetailModalOpen(true)
  }

  // Handle close modal
  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    setSelectedContactId(null)
  }

  // Stats calculations
  const stats = {
    total: statsData?.total || 0,
    leads: statsData?.leads || 0,
    recent: filteredContacts.filter((contact) => {
      const addedDate = new Date(contact.dateAdded)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return addedDate > weekAgo
    }).length,
  }

  if (contactsError) {
    return (
      <Layout>
        <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
          <div className='text-center'>
            <h2 className='text-lg font-semibold text-gray-900 mb-2'>
              Error loading contacts
            </h2>
            <p className='text-gray-600 mb-4'>
              {contactsError.message || 'Something went wrong'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className='px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700'
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gray-50'>
        <motion.div
          className='max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8'
          variants={containerVariants}
          initial='hidden'
          animate='visible'
        >
          {/* Header */}
          <motion.div variants={itemVariants} className='mb-3 sm:mb-6'>
            <h1 className='text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1'>
              GHL Contacts
            </h1>
            <p className='text-xs sm:text-base text-gray-600'>
              View and manage all your GoHighLevel contacts
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className='grid grid-cols-3 gap-2 sm:gap-6 mb-3 sm:mb-8'
            variants={containerVariants}
          >
            <StatsCard
              title='Total Contacts'
              value={stats.total}
              icon={User}
              color='pink'
              isLoading={isStatsLoading}
            />
            <StatsCard
              title='Total Leads'
              value={stats.leads}
              icon={Clock}
              color='blue'
              isLoading={isStatsLoading}
            />
            <StatsCard
              title='Recent (7d)'
              value={stats.recent}
              icon={CheckCircle}
              color='green'
              isLoading={isContactsLoading}
            />
          </motion.div>

          {/* Search and Filter */}
          <SearchFilterBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />

          {/* Loading State */}
          {isContactsLoading && <LoadingSkeleton />}

          {/* Mobile Cards (visible on small screens) */}
          {!isContactsLoading && (
            <div className='md:hidden'>
              <AnimatePresence mode='wait'>
                <motion.div
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {filteredContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Desktop Table (hidden on small screens) */}
          {!isContactsLoading && (
            <motion.div
              className='hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden'
              variants={itemVariants}
            >
              <TableHeader />
              <AnimatePresence mode='wait'>
                <motion.div
                  className='divide-y divide-gray-100'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {filteredContacts.map((contact) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  isLoading={isFetching}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </motion.div>
          )}

          {/* Empty State */}
          <AnimatePresence>
            {!isContactsLoading && filteredContacts.length === 0 && (
              <motion.div
                className='text-center py-6 sm:py-12 bg-white rounded-lg border border-gray-200'
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <motion.div
                  className='w-10 h-10 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4'
                  animate={{
                    rotate: [0, 10, -10, 0],
                    transition: {
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }}
                >
                  <Search className='w-5 h-5 sm:w-8 sm:h-8 text-gray-400' />
                </motion.div>
                <h3 className='text-sm sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2'>
                  No contacts found
                </h3>
                <p className='text-xs sm:text-base text-gray-500'>
                  Try adjusting your search criteria or add some contacts
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Contact Detail Modal */}
        <ContactDetailModal
          contactId={selectedContactId}
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </Layout>
  )
}

export default ContactsPage
