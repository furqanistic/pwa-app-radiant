// File: client/src/pages/Management/ServiceManagementPage.jsx
// Complete ServiceManagementPage with all fixes
import {
    useCategories,
    useCreateCategory,
    useCreateService,
    useDeleteCategory,
    useDeleteService,
    useServices,
    useUpdateCategory,
    useUpdateService,
} from '@/hooks/useServices'
import { uploadService } from '@/services/uploadService'
import {
    ArrowLeft,
    CheckCircle,
    ChevronRight,
    Clock,
    DollarSign,
    Edit3,
    Eye,
    Layers,
    LayoutGrid,
    List,
    Percent,
    Plus,
    Save,
    Search,
    Settings,
    Star,
    Trash2,
    X,
    Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'
import { resolveImageUrl } from '@/lib/imageHelpers'
import { compressImage, IMAGE_SIZE_LIMIT_BYTES, isUnderSizeLimit } from '@/lib/imageCompression'
import { useBranding } from '@/context/BrandingContext'

const fallbackServiceImage =
  'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop'

// Enhanced Service Selection Modal for Add-ons with custom pricing
const ServiceSelectionModal = ({
  isOpen,
  onClose,
  onSelectServices,
  currentService,
  excludeServiceId,
}) => {
  const [selectedServices, setSelectedServices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [customPricing, setCustomPricing] = useState({}) // Store custom prices/durations

  // Use regular services instead of available add-ons for now
  const { data: servicesData, isLoading } = useServices({
    search: searchTerm,
    status: 'active',
  })

  const services = servicesData?.services || []

  // Filter out the current service being edited and already linked services
  const filteredServices = services.filter((service) => {
    if (service._id === excludeServiceId) return false
    const isAlreadyLinked = currentService?.linkedServices?.some(
      (linked) => (linked._id || linked.id || linked.serviceId) === service._id
    )
    return !isAlreadyLinked
  })

  const handleToggleService = (service) => {
    setSelectedServices((prev) => {
      const isSelected = prev.some((s) => s._id === service._id)
      if (isSelected) {
        // Remove from selected and clear custom pricing
        const newSelected = prev.filter((s) => s._id !== service._id)
        const newPricing = { ...customPricing }
        delete newPricing[service._id]
        setCustomPricing(newPricing)
        return newSelected
      } else {
        // Add to selected and initialize custom pricing
        setCustomPricing((prev) => ({
          ...prev,
          [service._id]: {
            customPrice: service.basePrice, // Default to original price
            customDuration: service.duration, // Default to original duration
          },
        }))
        return [...prev, service]
      }
    })
  }

  const handleCustomPriceChange = (serviceId, field, value) => {
    setCustomPricing((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: value,
      },
    }))
  }

  const handleConfirm = () => {
    // Combine selected services with their custom pricing
    const servicesWithCustomPricing = selectedServices.map((service) => ({
      ...service,
      customPrice:
        parseFloat(customPricing[service._id]?.customPrice) ||
        service.basePrice,
      customDuration:
        parseInt(customPricing[service._id]?.customDuration) ||
        service.duration,
      order: 0,
      isActive: true,
      addedAt: new Date().toISOString(),
    }))

    onSelectServices(servicesWithCustomPricing)
    setSelectedServices([])
    setCustomPricing({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden'>
        <div className='p-6 border-b border-gray-200'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-bold text-gray-900'>
              Select Add-on Services
            </h2>
            <button
              onClick={onClose}
              className='p-2 hover:bg-gray-100 rounded-lg'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
          <p className='text-sm text-gray-600 mb-4'>
            Link other services that clients can add to their booking for an enhanced experience and increased booking value.
          </p>

          {/* Search */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
            <input
              type='text'
              placeholder='Search services...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
            />
          </div>
        </div>

        <div className='p-6 overflow-y-auto max-h-[60vh]'>
          {isLoading ? (
            <div className='text-center py-8'>Loading services...</div>
          ) : filteredServices.length === 0 ? (
            <div className='text-center py-8'>
              <div className='text-gray-400 mb-2'>📝</div>
              <p className='text-gray-600'>
                {searchTerm
                  ? 'No services found matching your search'
                  : 'No available services to link'}
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {filteredServices.map((service) => {
                const isSelected = selectedServices.some(
                  (s) => s._id === service._id
                )

                return (
                  <div
                    key={service._id}
                    className={`border rounded-lg transition-all ${
                      isSelected
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                    }`}
                  >
                    {/* Service Selection Header */}
                    <div
                      onClick={() => handleToggleService(service)}
                      className='p-4 cursor-pointer'
                    >
                      <div className='flex items-center gap-4'>
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-pink-500 bg-pink-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <div className='w-2 h-2 bg-white rounded-full' />
                          )}
                        </div>

                        <img
                          src={resolveImageUrl(service.image, fallbackServiceImage, { width: 60, height: 60 })}
                          alt={service.name}
                          className='w-12 h-12 rounded-lg object-cover'
                          loading='lazy'
                          decoding='async'
                        />

                        <div className='flex-1'>
                          <h3 className='font-semibold text-gray-900'>
                            {service.name}
                          </h3>
                          <p className='text-sm text-gray-600 line-clamp-1'>
                            {service.description}
                          </p>
                          <div className='flex items-center gap-4 mt-1'>
                            <span className='text-sm text-green-600 font-semibold'>
                              ${service.basePrice}
                            </span>
                            <span className='text-sm text-blue-600'>
                              {service.duration}min
                            </span>
                            {service.categoryId && (
                              <span className='text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full'>
                                {service.categoryId.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Custom Pricing Section (only show if selected) */}
                    {isSelected && (
                      <div className='px-4 pb-4 border-t border-pink-200 bg-pink-25'>
                        <div className='pt-4'>
                          <h4 className='text-sm font-semibold text-gray-700 mb-3'>
                            Customize Add-on Pricing & Duration
                          </h4>
                          <div className='grid grid-cols-2 gap-4'>
                            <div>
                              <label className='block text-xs font-medium text-gray-600 mb-1'>
                                Add-on Price ($)
                              </label>
                              <input
                                type='number'
                                min='0'
                                step='0.01'
                                value={
                                  customPricing[service._id]?.customPrice ||
                                  service.basePrice
                                }
                                onChange={(e) =>
                                  handleCustomPriceChange(
                                    service._id,
                                    'customPrice',
                                    e.target.value
                                  )
                                }
                                className='w-full px-3 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] text-sm'
                                placeholder={service.basePrice.toString()}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <p className='text-xs text-gray-500 mt-1'>
                                Original: ${service.basePrice}
                              </p>
                            </div>
                            <div>
                              <label className='block text-xs font-medium text-gray-600 mb-1'>
                                Add-on Duration (min)
                              </label>
                              <input
                                type='number'
                                min='1'
                                value={
                                  customPricing[service._id]?.customDuration ||
                                  service.duration
                                }
                                onChange={(e) =>
                                  handleCustomPriceChange(
                                    service._id,
                                    'customDuration',
                                    e.target.value
                                  )
                                }
                                className='w-full px-3 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] text-sm'
                                placeholder={service.duration.toString()}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <p className='text-xs text-gray-500 mt-1'>
                                Original: {service.duration} min
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className='p-6 border-t border-gray-200'>
          <div className='flex gap-4'>
            <button
              onClick={handleConfirm}
              disabled={selectedServices.length === 0}
              className='flex-1 text-white h-10 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
              }}
            >
              Link {selectedServices.length} Service
              {selectedServices.length !== 1 ? 's' : ''}
              {selectedServices.length > 0 && (
                <span className='ml-2 text-pink-100'>
                  (Total: $
                  {selectedServices
                    .reduce(
                      (sum, service) =>
                        sum +
                        (parseFloat(customPricing[service._id]?.customPrice) ||
                          service.basePrice),
                      0
                    )
                    .toFixed(2)}
                  )
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              className='px-6 h-10 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 flex items-center justify-center'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Category Modal (unchanged)
const CategoryModal = ({ isOpen, onClose }) => {
  const [newCategoryName, setNewCategoryName] = useState('')

  // API hooks
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories(true)
  const createCategoryMutation = useCreateCategory({
    onSuccess: () => {
      toast.success('Category created successfully!')
      setNewCategoryName('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create category')
    },
  })
  const deleteCategoryMutation = useDeleteCategory({
    onSuccess: () => {
      toast.success('Category deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete category')
    },
  })

  const handleAdd = () => {
    if (newCategoryName.trim()) {
      createCategoryMutation.mutate({
        name: newCategoryName.trim(),
        description: '',
      })
    }
  }

  const handleDelete = (categoryId, categoryCount) => {
    if (categoryCount > 0) {
      toast.error('Cannot delete category with existing services')
      return
    }

    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategoryMutation.mutate(categoryId)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg w-full max-w-md'>
        <div className='p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-bold text-gray-900'>
              Manage Categories
            </h2>
            <button
              onClick={onClose}
              className='p-2 hover:bg-gray-100 rounded-lg'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          {/* Add New Category */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold mb-4 text-gray-900'>
              Add New Category
            </h3>
            <div className='space-y-4'>
              <input
                type='text'
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder='Enter category name'
                className='w-full px-4 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                disabled={createCategoryMutation.isPending}
              />

              <button
                onClick={handleAdd}
                disabled={
                  !newCategoryName.trim() || createCategoryMutation.isPending
                }
                className='w-full text-white h-8 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
                style={{
                  background:
                    'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
                }}
              >
                {createCategoryMutation.isPending
                  ? 'Creating...'
                  : 'Add Category'}
              </button>
            </div>
          </div>

          {/* Existing Categories */}
          <div>
            <h3 className='text-lg font-semibold mb-4 text-gray-900'>
              Existing Categories
            </h3>

            {categoriesLoading ? (
              <div className='text-center py-4'>Loading categories...</div>
            ) : (
              <div className='space-y-2'>
                {categories.map((category) => (
                  <div
                    key={category._id}
                    className='flex items-center justify-between p-3 border border-gray-200 rounded-lg'
                  >
                    <div className='flex items-center gap-3'>
                      <span className='font-medium text-gray-900'>
                        {category.name}
                      </span>
                      <span className='text-sm text-gray-500'>
                        ({category.count || 0})
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleDelete(category._id, category.count || 0)
                      }
                      className='p-1 text-red-500 hover:bg-red-50 rounded'
                      disabled={
                        (category.count || 0) > 0 ||
                        deleteCategoryMutation.isPending
                      }
                      title={
                        (category.count || 0) > 0
                          ? 'Cannot delete category with services'
                          : 'Delete category'
                      }
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Service Header with stats from API
const ServiceHeader = ({
  view,
  setView,
  searchTerm,
  setSearchTerm,
  onAddService,
  totalServices,
  activeServices,
}) => (
  <div className='relative bg-white/60 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-6 mb-4 md:mb-8 shadow-sm overflow-hidden'>
    {/* Decorative background element */}
    <div className='absolute -top-24 -right-24 w-48 h-48 bg-pink-100/50 rounded-full blur-3xl pointer-events-none' />
    
    <div className='relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 mb-4 md:mb-8'>
      <div className='flex items-start gap-3 md:gap-4'>
        <div
          className='p-2 md:p-3 rounded-lg md:rounded-xl shadow-lg shrink-0'
          style={{
            background:
              'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
          }}
        >
          <Settings className='w-5 h-5 md:w-6 md:h-6 text-white' />
        </div>
        <div>
          <h1 className='text-xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight'>
            Service Management
          </h1>
          <p className='text-gray-500 text-xs md:text-sm font-medium mt-0.5 md:mt-1'>
            Manage your professional services
          </p>
          <div className='flex items-center gap-2 mt-2'>
            <div className='flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm'>
              <span className='w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse' />
              <span className='text-[10px] font-bold uppercase tracking-wider'>{activeServices} Active</span>
            </div>
            <div className='flex items-center px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100 shadow-sm'>
              <span className='text-[10px] font-bold uppercase tracking-wider'>{totalServices} Total</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onAddService}
        className='group relative text-white px-5 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden text-sm md:text-base'
        style={{
          background:
            'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
        }}
      >
        <div className='absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300' />
        <Plus className='w-4 h-4 md:w-5 md:h-5 relative z-10' />
        <span className='relative z-10'>Add New Service</span>
      </button>
    </div>

    <div className='relative flex flex-col md:flex-row items-center gap-3'>
      <div className='w-full md:flex-1 relative group'>
        <Search className='absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors w-4 h-4 md:w-5 md:h-5' />
        <input
          type='text'
          placeholder='Search services...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]/20 focus:border-pink-500 transition-all text-sm md:text-gray-700 placeholder-gray-400 font-medium'
        />
      </div>

      <div className='flex bg-gray-100/80 p-1 rounded-lg md:rounded-xl border border-gray-200 w-full md:w-auto h-[40px] md:h-[46px]'>
        <button
          onClick={() => setView('grid')}
          className={`flex-1 md:w-24 rounded-md md:rounded-lg text-[11px] md:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 md:gap-2 ${
            view === 'grid'
              ? 'bg-white text-gray-900 shadow-sm md:shadow-md transform scale-[1.01] md:scale-[1.02]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutGrid className='w-3.5 h-3.5 md:w-4 md:h-4' />
          Grid
        </button>
        <button
          onClick={() => setView('list')}
          className={`flex-1 md:w-24 rounded-md md:rounded-lg text-[11px] md:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 md:gap-2 ${
            view === 'list'
              ? 'bg-white text-gray-900 shadow-sm md:shadow-md transform scale-[1.01] md:scale-[1.02]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <List className='w-3.5 h-3.5 md:w-4 md:h-4' />
          List
        </button>
      </div>
    </div>
  </div>
)

// Enhanced Service Card with linked services display
const ServiceCard = ({ service, category, onEdit, onDelete, onView }) => {
  const isDiscountActive =
    service.discount?.active &&
    new Date() >= new Date(service.discount.startDate) &&
    new Date() <= new Date(service.discount.endDate)

  return (
    <div className='bg-white rounded-lg overflow-hidden hover:ring-2 hover:ring-pink-200 transition-all group'>
      <div className='relative h-48 overflow-hidden'>
        <img
          src={resolveImageUrl(service.image, fallbackServiceImage, { width: 500, height: 300 })}
          alt={service.name}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
          loading='lazy'
          decoding='async'
        />

        <div className='absolute top-3 left-3 flex flex-col gap-2'>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              service.status === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            <CheckCircle className='w-3 h-3' />
            {service.status}
          </span>

          {category && (
            <span
              className='px-2 py-1 rounded-full text-xs font-bold text-white'
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
              }}
            >
              {category.name}
            </span>
          )}
        </div>

        {isDiscountActive && (
          <div className='absolute top-3 right-3'>
            <span className='bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
              <Percent className='w-3 h-3' />
              {service.discount.percentage}% OFF
            </span>
          </div>
        )}

        <div className='absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
          <button
            onClick={() => onView(service)}
            className='bg-white/90 p-2 rounded-lg hover:bg-white'
          >
            <Eye className='w-4 h-4 text-gray-700' />
          </button>
          <button
            onClick={() => onEdit(service)}
            className='bg-white/90 p-2 rounded-lg hover:bg-white'
          >
            <Edit3 className='w-4 h-4 text-pink-600' />
          </button>
          <button
            onClick={() => onDelete(service)}
            className='bg-white/90 p-2 rounded-lg hover:bg-white'
          >
            <Trash2 className='w-4 h-4 text-red-500' />
          </button>
        </div>
      </div>

      <div className='p-6'>
        <div className='flex items-start justify-between mb-3'>
          <h3 className='text-xl font-bold text-gray-900 flex-1'>
            {service.name}
          </h3>
          <div className='flex items-center gap-1 ml-3 bg-yellow-50 px-2 py-1 rounded-lg'>
            <Star className='w-4 h-4 text-yellow-500 fill-current' />
            <span className='text-sm font-semibold text-yellow-700'>
              {service.rating?.toFixed(1) || '5.0'}
            </span>
          </div>
        </div>

        <p className='text-gray-600 text-sm mb-4 line-clamp-2'>
          {service.description}
        </p>

        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='bg-green-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <DollarSign className='w-4 h-4 text-green-600' />
              <span className='text-xs font-semibold text-green-700'>
                Price
              </span>
            </div>
            <span className='text-lg font-bold text-green-700'>
              ${service.basePrice}
            </span>
          </div>

          <div className='bg-blue-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <Clock className='w-4 h-4 text-blue-600' />
              <span className='text-xs font-semibold text-blue-700'>Time</span>
            </div>
            <span className='text-lg font-bold text-blue-700'>
              {service.duration}min
            </span>
          </div>
        </div>

        <div className='flex items-center justify-between pt-4 border-t border-gray-100'>
          <div className='flex items-center gap-2'>
            <Layers className='w-4 h-4 text-gray-500' />
            <span className='text-sm font-semibold text-gray-700'>
              {service.subTreatments?.length || 0} options
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Zap className='w-4 h-4 text-pink-500' />
            <span className='text-sm font-semibold text-pink-700'>
              {service.linkedServicesCount ||
                service.linkedServices?.length ||
                0}{' '}
              add-ons
            </span>
          </div>
        </div>

        {/* Show linked services preview if any */}
        {service.linkedServices && service.linkedServices.length > 0 && (
          <div className='mt-4 pt-4 border-t border-gray-100'>
            <h4 className='text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1'>
              <Zap className='w-3 h-3' />
              Available Add-ons:
            </h4>
            <div className='space-y-1'>
              {service.linkedServices.slice(0, 2).map((addon, index) => (
                <div
                  key={index}
                  className='text-xs text-gray-600 flex items-center justify-between'
                >
                  <span className='truncate'>{addon.name}</span>
                  <span className='text-green-600 font-semibold'>
                    +${addon.finalPrice || addon.customPrice || addon.basePrice}
                  </span>
                </div>
              ))}
              {service.linkedServices.length > 2 && (
                <div className='text-xs text-gray-500'>
                  +{service.linkedServices.length - 2} more add-ons
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Complete Service Form with fixed linked services handling
const ServiceForm = ({ service, onSave, onCancel }) => {
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '')
    if (cleaned.length !== 6) return '#b0164e'
    const num = parseInt(cleaned, 16)
    const r = Math.max(0, ((num >> 16) & 255) - 24)
    const g = Math.max(0, ((num >> 8) & 255) - 24)
    const b = Math.max(0, (num & 255) - 24)
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    categoryId: service?.categoryId?._id || service?.categoryId || '',
    basePrice: service?.basePrice || '',
    duration: service?.duration || '',
    discount: service?.discount || {
      percentage: 0,
      startDate: '',
      endDate: '',
      active: false,
    },
    limit: service?.limit || 1,
    image: service?.image || '',
    imagePublicId: service?.imagePublicId || '',
    status: service?.status || 'active',
    subTreatments: service?.subTreatments || [],
    linkedServices: service?.linkedServices || [],
  })

  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [errors, setErrors] = useState({})
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)

  // Get current user to check Stripe connection
  const { currentUser } = useSelector((state) => state.user)

  // Check if spa user has Stripe connected
  const hasStripeConnected =
    currentUser?.role !== 'spa' || // Admins bypass this check
    (currentUser?.stripe?.accountId && currentUser?.stripe?.chargesEnabled)

  // API hooks
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories(false)

  const createServiceMutation = useCreateService({
    onSuccess: () => {
      toast.success('Service created successfully!')
      onSave()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create service')
    },
  })

  const updateServiceMutation = useUpdateService({
    onSuccess: () => {
      toast.success('Service updated successfully!')
      onSave()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update service')
    },
  })

  // Initialize form data when service changes
  useEffect(() => {
    if (service) {
      // Format linked services properly for the form
      const formattedLinkedServices = service.linkedServices
        ? service.linkedServices.map((link) => ({
            // Service details for display
            _id: link.serviceId || link._id,
            name: link.name,
            description: link.description,
            basePrice: link.basePrice,
            duration: link.duration,
            image: link.image,
            categoryId: link.categoryId,
            status: link.status,

            // Linking metadata
            serviceId: link.serviceId || link._id,
            customPrice: link.customPrice,
            customDuration: link.customDuration,
            order: link.order || 0,
            isActive: link.isActive !== undefined ? link.isActive : true,
            addedAt: link.addedAt || new Date().toISOString(),

            // Computed values
            finalPrice: link.finalPrice || link.customPrice || link.basePrice,
            finalDuration:
              link.finalDuration || link.customDuration || link.duration,
          }))
        : []

      setFormData({
        name: service.name || '',
        description: service.description || '',
        categoryId: service.categoryId?._id || service.categoryId || '',
        basePrice: service.basePrice || '',
        duration: service.duration || '',
        discount: service.discount || {
          percentage: 0,
          startDate: '',
          endDate: '',
          active: false,
        },
        limit: service.limit || 1,
        image: service.image || '',
        imagePublicId: service.imagePublicId || '',
        status: service.status || 'active',
        subTreatments: service.subTreatments || [],
        linkedServices: formattedLinkedServices,
      })

      console.log(
        '✅ Form initialized with linkedServices:',
        formattedLinkedServices
      )
    }
  }, [service])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Service name is required'
    if (!formData.description.trim())
      newErrors.description = 'Description is required'
    if (!formData.categoryId) newErrors.categoryId = 'Category is required'
    if (!formData.basePrice || formData.basePrice <= 0)
      newErrors.basePrice = 'Valid price required'
    if (!formData.duration || formData.duration <= 0)
      newErrors.duration = 'Valid duration required'
    if (!formData.limit || formData.limit <= 0)
      newErrors.limit = 'Valid limit required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Fixed handleSelectServices function
  const handleSelectServices = (services) => {
    console.log('🔗 Adding linked services:', services)

    // Add services with their custom pricing already set
    const newLinkedServices = services.map((service) => ({
      // Keep the full service object for display
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      duration: service.duration,
      image: service.image,
      categoryId: service.categoryId,

      // Add the linking metadata
      serviceId: service._id,
      customPrice: service.customPrice || service.basePrice,
      customDuration: service.customDuration || service.duration,
      order: service.order || 0,
      isActive: service.isActive !== undefined ? service.isActive : true,
      addedAt: service.addedAt || new Date().toISOString(),
    }))

    setFormData({
      ...formData,
      linkedServices: [...formData.linkedServices, ...newLinkedServices],
    })
  }

  // Fixed handleSubmit function
  const handleSubmit = () => {
    // Check if spa user has Stripe connected (only for creating new services)
    if (!service && !hasStripeConnected) {
      toast.error(
        'Please connect your Stripe account before creating services. Go to Management > Stripe Connect to set up your payment account.',
        { duration: 6000 }
      )
      return
    }

    if (validateForm()) {
      // Prepare the data for submission
      const submissionData = { ...formData }

      // Clean up linkedServices data for backend - only send the linking data
      if (
        submissionData.linkedServices &&
        submissionData.linkedServices.length > 0
      ) {
        submissionData.linkedServices = submissionData.linkedServices.map(
          (service) => ({
            serviceId: service.serviceId || service._id,
            customPrice: parseFloat(service.customPrice) || null,
            customDuration: parseInt(service.customDuration) || null,
            order: parseInt(service.order) || 0,
            isActive: service.isActive !== undefined ? service.isActive : true,
            addedAt: service.addedAt || new Date().toISOString(),
          })
        )

        console.log(
          '🔄 Submitting linkedServices:',
          submissionData.linkedServices
        )
      }

      // Ensure numeric fields are properly formatted
      if (submissionData.basePrice) {
        submissionData.basePrice = parseFloat(submissionData.basePrice)
      }
      if (submissionData.duration) {
        submissionData.duration = parseInt(submissionData.duration)
      }
      if (submissionData.limit) {
        submissionData.limit = parseInt(submissionData.limit)
      }

      // Clean up discount data
      if (submissionData.discount) {
        submissionData.discount = {
          percentage: parseFloat(submissionData.discount.percentage) || 0,
          startDate: submissionData.discount.startDate || null,
          endDate: submissionData.discount.endDate || null,
          active: Boolean(submissionData.discount.active),
        }
      }

      // Clean up subTreatments
      if (submissionData.subTreatments) {
        submissionData.subTreatments = submissionData.subTreatments
          .map((treatment) => ({
            name: treatment.name?.trim() || '',
            price: parseFloat(treatment.price) || 0,
            duration: parseInt(treatment.duration) || 0,
            description: treatment.description?.trim() || '',
            hasRewards: Boolean(treatment.hasRewards),
          }))
          .filter(
            (treatment) =>
              treatment.name && treatment.price > 0 && treatment.duration > 0
          )
      }

      console.log('🔄 Submitting service data:', submissionData)

      if (service) {
        // Update existing service
        updateServiceMutation.mutate({
          id: service._id,
          ...submissionData,
        })
      } else {
        // Create new service
        createServiceMutation.mutate(submissionData)
      }
    }
  }

  const addSubTreatment = () => {
    setFormData({
      ...formData,
      subTreatments: [
        ...formData.subTreatments,
        { id: Date.now(), name: '', price: '', duration: '', description: '' },
      ],
    })
  }

  const updateSubTreatment = (index, field, value) => {
    const updated = formData.subTreatments.map((treatment, i) =>
      i === index ? { ...treatment, [field]: value } : treatment
    )
    setFormData({ ...formData, subTreatments: updated })
  }

  const removeSubTreatment = (index) => {
    setFormData({
      ...formData,
      subTreatments: formData.subTreatments.filter((_, i) => i !== index),
    })
  }

  const removeLinkedService = (serviceId) => {
    setFormData({
      ...formData,
      linkedServices: formData.linkedServices.filter(
        (service) => (service.serviceId || service._id) !== serviceId
      ),
    })
  }

  const isSubmitting =
    createServiceMutation.isPending || updateServiceMutation.isPending

  return (
    <Layout>
      <div
        className='px-4 py-6 space-y-6 max-w-6xl mx-auto'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        {/* Header */}
        <div className='bg-white rounded-lg p-6'>
          <div className='flex items-center mb-4'>
            <button
              onClick={onCancel}
              className='mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg'
              disabled={isSubmitting}
            >
              <ArrowLeft className='w-6 h-6' />
            </button>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>
                {service ? 'Edit Service' : 'Create New Service'}
              </h1>
              <p className='text-gray-600 text-sm'>
                {service
                  ? 'Update your service details, pricing, and add-on options to keep your offerings up to date.'
                  : 'Add a new service to your menu. Provide clear details to help clients understand what is included.'}
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(createServiceMutation.error || updateServiceMutation.error) && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-4'>
            <h3 className='text-red-800 font-semibold mb-2'>Error Details:</h3>
            <pre className='text-red-700 text-sm whitespace-pre-wrap'>
              {JSON.stringify(
                createServiceMutation.error?.response?.data ||
                  updateServiceMutation.error?.response?.data ||
                  createServiceMutation.error?.message ||
                  updateServiceMutation.error?.message,
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Basic Information */}
        <div className='bg-white rounded-lg p-6'>
          <h2 className='text-lg font-bold text-gray-900 mb-6'>
            Basic Information
          </h2>

          <div className='grid md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Service Name *
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={`w-full px-4 h-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='e.g., Dermal Filler Treatment'
                disabled={isSubmitting}
              />
              <p className='text-[10px] text-gray-500 mt-1'>This is how the service will appear to your clients in the booking menu.</p>
              {errors.name && (
                <p className='text-red-500 text-xs mt-1'>{errors.name}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Category *
              </label>
              <div className='flex gap-2'>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className={`flex-1 px-4 h-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] ${
                    errors.categoryId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={categoriesLoading || isSubmitting}
                >
                  <option value=''>
                    {categoriesLoading ? 'Loading...' : 'Select category'}
                  </option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  onClick={() => setShowCategoryModal(true)}
                  className='px-4 h-8 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center justify-center'
                  disabled={isSubmitting}
                >
                  <Settings className='w-5 h-5' />
                </button>
              </div>
              <p className='text-[10px] text-gray-500 mt-1'>Select a category or add a new one by clicking the settings icon.</p>
              {errors.categoryId && (
                <p className='text-red-500 text-xs mt-1'>{errors.categoryId}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Base Price ($) *
              </label>
              <input
                type='number'
                value={formData.basePrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    basePrice: parseFloat(e.target.value) || '',
                  })
                }
                className={`w-full px-4 h-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] ${
                  errors.basePrice ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='450'
                min='0'
                step='0.01'
                disabled={isSubmitting}
              />
              <p className='text-[10px] text-gray-500 mt-1'>The starting price for this service. Variations can be added below.</p>
              {errors.basePrice && (
                <p className='text-red-500 text-xs mt-1'>{errors.basePrice}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Duration (minutes) *
              </label>
              <input
                type='number'
                value={formData.duration}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration: parseInt(e.target.value) || '',
                  })
                }
                className={`w-full px-4 h-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] ${
                  errors.duration ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='60'
                min='1'
                disabled={isSubmitting}
              />
              <p className='text-[10px] text-gray-500 mt-1'>Default time slot reserved for this service.</p>
              {errors.duration && (
                <p className='text-red-500 text-xs mt-1'>{errors.duration}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Daily Limit *
              </label>
              <input
                type='number'
                value={formData.limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    limit: parseInt(e.target.value) || '',
                  })
                }
                className={`w-full px-4 h-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] ${
                  errors.limit ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='5'
                min='1'
                disabled={isSubmitting}
              />
              {errors.limit && (
                <p className='text-red-500 text-xs mt-1'>{errors.limit}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className='w-full px-4 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                disabled={isSubmitting}
              >
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
              </select>
            </div>
          </div>

          <div className='mt-6'>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>
              Brief Description *
            </label>
            <p className='text-xs text-gray-500 mb-2'>Provide a clear summary of what this service involves and what clients can expect.</p>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)] ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              rows='4'
              placeholder='Detailed description of your service...'
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className='text-red-500 text-xs mt-1'>{errors.description}</p>
            )}
          </div>

          <div className='mt-6'>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>
              Image
            </label>
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3'>
              <label className='inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold cursor-pointer transition-all'>
                <input
                  type='file'
                  accept='image/*'
                  className='hidden'
                  disabled={isSubmitting || isUploadingImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setIsUploadingImage(true)
                    try {
                      if (file.size > IMAGE_SIZE_LIMIT_BYTES) {
                        toast.info('Image is large, compressing...')
                      }
                      const compressed = await compressImage(file)
                      if (!isUnderSizeLimit(compressed)) {
                        toast.error('Image too large. Please use an image under 1MB.')
                        return
                      }
                      if (formData.imagePublicId || formData.image) {
                        await uploadService.deleteImage({
                          url: formData.image,
                          publicId: formData.imagePublicId,
                        }).catch(console.error)
                      }
                      const res = await uploadService.uploadImage(compressed)
                      setFormData((prev) => ({
                        ...prev,
                        image: res.url,
                        imagePublicId: res.publicId || '',
                      }))
                      toast.success('Image uploaded!')
                    } catch (error) {
                      toast.error('Failed to upload image')
                    } finally {
                      setIsUploadingImage(false)
                      e.target.value = ''
                    }
                  }}
                />
                {isUploadingImage ? 'Uploading...' : 'Upload Image'}
              </label>

              {formData.image && (
                <button
                  type='button'
                  onClick={async () => {
                    if (formData.imagePublicId || formData.image) {
                      await uploadService.deleteImage({
                        url: formData.image,
                        publicId: formData.imagePublicId,
                      }).catch(console.error)
                    }
                    setFormData((prev) => ({
                      ...prev,
                      image: '',
                      imagePublicId: '',
                    }))
                  }}
                  className='text-sm font-semibold text-red-500 hover:text-red-600'
                  disabled={isSubmitting}
                >
                  Remove
                </button>
              )}
            </div>

            {formData.image && (
              <div className='mt-3'>
                <img
                  src={resolveImageUrl(formData.image, formData.image, { width: 192, height: 192 })}
                  alt='Service'
                  className='h-24 w-24 rounded-lg object-cover border border-gray-100 shadow-sm'
                  loading='lazy'
                  decoding='async'
                />
              </div>
            )}
            <p className='text-[11px] text-gray-400'>
              Tip: Upload low-size images (max 1MB) for faster loading.
            </p>
          </div>
        </div>

        {/* Discount Settings */}
        <div className='bg-white rounded-lg p-6'>
          <h2 className='text-lg font-bold text-gray-900 mb-6'>
            Discount Settings
          </h2>

          <div className='space-y-4'>
            <div className='flex items-center gap-3'>
              <input
                type='checkbox'
                id='discountActive'
                checked={formData.discount.active}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: {
                      ...formData.discount,
                      active: e.target.checked,
                    },
                  })
                }
                className='w-5 h-5 text-pink-600 rounded focus:ring-[color:var(--brand-primary)]'
                disabled={isSubmitting}
              />
              <label
                htmlFor='discountActive'
                className='text-sm font-semibold text-gray-700'
              >
                Enable promotional discount
              </label>
              <p className='text-xs text-gray-500 mt-1 ml-8'>Offer a limited-time price reduction to attract more bookings for this service.</p>
            </div>

            {formData.discount.active && (
              <div className='grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-100'>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    Percentage
                  </label>
                  <input
                    type='number'
                    value={formData.discount.percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount: {
                          ...formData.discount,
                          percentage: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className='w-full px-4 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                    placeholder='15'
                    min='0'
                    max='100'
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    Start Date
                  </label>
                  <input
                    type='date'
                    value={formData.discount.startDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount: {
                          ...formData.discount,
                          startDate: e.target.value,
                        },
                      })
                    }
                    className='w-full px-4 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    End Date
                  </label>
                  <input
                    type='date'
                    value={formData.discount.endDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount: {
                          ...formData.discount,
                          endDate: e.target.value,
                        },
                      })
                    }
                    className='w-full px-4 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Treatment Options */}
        <div className='bg-white rounded-lg p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-bold text-gray-900'>
              Treatment Options
            </h2>
            <button
              onClick={addSubTreatment}
              className='text-white px-4 h-8 rounded-lg font-semibold flex items-center justify-center gap-2'
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
              }}
              disabled={isSubmitting}
            >
              <Plus className='w-4 h-4' />
              <span className='hidden sm:inline'>Add Option</span>
              <span className='sm:hidden'>Add</span>
            </button>
          </div>
          <p className='text-sm text-gray-600 mb-6'>
            Define different variations or levels of this service (e.g., Standard vs Luxury, or different product volumes).
          </p>

          <div className='space-y-4'>
            {formData.subTreatments.length === 0 ? (
              <div className='text-center py-8 border-2 border-dashed border-gray-200 rounded-lg'>
                <Layers className='w-8 h-8 text-gray-400 mx-auto mb-2' />
                <p className='text-gray-600 font-semibold'>
                  No treatment options
                </p>
                <p className='text-gray-500 text-sm'>Add specific variations</p>
              </div>
            ) : (
              formData.subTreatments.map((treatment, index) => (
                <div
                  key={treatment.id || index}
                  className='border border-gray-200 rounded-lg p-4'
                >
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='font-semibold text-gray-900 flex items-center gap-2'>
                      <span className='bg-pink-100 text-pink-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold'>
                        {index + 1}
                      </span>
                      Treatment {index + 1}
                    </h3>
                    <button
                      onClick={() => removeSubTreatment(index)}
                      className='text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded'
                      disabled={isSubmitting}
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>

                  <div className='grid md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-700 mb-2'>
                        Name
                      </label>
                      <input
                        type='text'
                        placeholder='e.g., Lip Filler'
                        value={treatment.name}
                        onChange={(e) =>
                          updateSubTreatment(index, 'name', e.target.value)
                        }
                        className='w-full px-3 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-semibold text-gray-700 mb-2'>
                        Price ($)
                      </label>
                      <input
                        type='number'
                        placeholder='350'
                        value={treatment.price}
                        onChange={(e) =>
                          updateSubTreatment(
                            index,
                            'price',
                            parseFloat(e.target.value) || ''
                          )
                        }
                        className='w-full px-3 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                        min='0'
                        step='0.01'
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-semibold text-gray-700 mb-2'>
                        Duration (min)
                      </label>
                      <input
                        type='number'
                        placeholder='45'
                        value={treatment.duration}
                        onChange={(e) =>
                          updateSubTreatment(
                            index,
                            'duration',
                            parseInt(e.target.value) || ''
                          )
                        }
                        className='w-full px-3 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                        min='1'
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-semibold text-gray-700 mb-2'>
                        Description
                      </label>
                      <input
                        type='text'
                        placeholder='Enhanced lip volume...'
                        value={treatment.description}
                        onChange={(e) =>
                          updateSubTreatment(
                            index,
                            'description',
                            e.target.value
                          )
                        }
                        className='w-full px-3 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]'
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Service Add-ons with enhanced display */}
        <div className='bg-white rounded-lg p-6'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
                <Zap className='w-5 h-5 text-pink-500' />
                Service Add-ons
              </h2>
              <p className='text-sm text-gray-600'>
                Link other services as upsell opportunities
              </p>
              <p className='text-xs text-gray-500 mt-1'>These will be suggested to clients during booking. Note: You must create individual services before linking them here.</p>
            </div>
            <button
              onClick={() => setShowServiceModal(true)}
              className='text-white px-4 h-8 rounded-lg font-semibold flex items-center justify-center gap-2'
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
              }}
              disabled={isSubmitting}
            >
              <Plus className='w-4 h-4' />
              <span className='hidden sm:inline'>Link Services</span>
              <span className='sm:hidden'>Link</span>
            </button>
          </div>

          <div className='space-y-4'>
            {formData.linkedServices.length === 0 ? (
              <div className='text-center py-8 border-2 border-dashed border-pink-200 rounded-lg bg-pink-50'>
                <Zap className='w-8 h-8 text-pink-400 mx-auto mb-2' />
                <p className='text-pink-600 font-semibold'>
                  No add-on services linked
                </p>
                <p className='text-pink-500 text-sm'>
                  Link existing services as add-ons for upselling
                </p>
              </div>
            ) : (
              <div className='grid md:grid-cols-2 gap-4'>
                {formData.linkedServices.map((linkedService, index) => {
                  const finalPrice =
                    linkedService.customPrice || linkedService.basePrice
                  const finalDuration =
                    linkedService.customDuration || linkedService.duration
                  const originalPrice = linkedService.basePrice
                  const originalDuration = linkedService.duration
                  const priceChanged = finalPrice !== originalPrice
                  const durationChanged = finalDuration !== originalDuration

                  return (
                    <div
                      key={linkedService.serviceId || linkedService._id}
                      className='border border-pink-200 rounded-lg p-4 bg-pink-50'
                    >
                      <div className='flex items-center justify-between mb-3'>
                        <div className='flex items-center gap-3'>
                          <img
                            src={resolveImageUrl(
                              linkedService.image,
                              fallbackServiceImage,
                              { width: 100, height: 100 }
                            )}
                            alt={linkedService.name}
                            className='w-12 h-12 rounded-lg object-cover'
                            loading='lazy'
                            decoding='async'
                          />
                          <div>
                            <h3 className='font-semibold text-gray-900 text-sm'>
                              {linkedService.name}
                            </h3>
                            <div className='flex items-center gap-3 text-xs'>
                              <span
                                className={`font-semibold ${
                                  priceChanged
                                    ? 'text-green-600'
                                    : 'text-gray-600'
                                }`}
                              >
                                ${finalPrice}
                                {priceChanged && (
                                  <span className='text-gray-400 line-through ml-1'>
                                    ${originalPrice}
                                  </span>
                                )}
                              </span>
                              <span
                                className={`${
                                  durationChanged
                                    ? 'text-blue-600'
                                    : 'text-gray-600'
                                }`}
                              >
                                {finalDuration}min
                                {durationChanged && (
                                  <span className='text-gray-400 line-through ml-1'>
                                    {originalDuration}min
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            removeLinkedService(
                              linkedService.serviceId || linkedService._id
                            )
                          }
                          className='text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded'
                          disabled={isSubmitting}
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>

                      {/* Inline editing for custom pricing */}
                      <div className='grid grid-cols-2 gap-3 pt-2 border-t border-pink-200'>
                        <div>
                          <label className='block text-xs font-medium text-gray-600 mb-1'>
                            Add-on Price ($)
                          </label>
                          <input
                            type='number'
                            min='0'
                            step='0.01'
                            value={
                              linkedService.customPrice ||
                              linkedService.basePrice
                            }
                            onChange={(e) => {
                              const updatedServices =
                                formData.linkedServices.map((svc, i) =>
                                  i === index
                                    ? {
                                        ...svc,
                                        customPrice:
                                          parseFloat(e.target.value) ||
                                          svc.basePrice,
                                      }
                                    : svc
                                )
                              setFormData({
                                ...formData,
                                linkedServices: updatedServices,
                              })
                            }}
                            className='w-full px-2 h-7 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--brand-primary)]'
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <label className='block text-xs font-medium text-gray-600 mb-1'>
                            Duration (min)
                          </label>
                          <input
                            type='number'
                            min='1'
                            value={
                              linkedService.customDuration ||
                              linkedService.duration
                            }
                            onChange={(e) => {
                              const updatedServices =
                                formData.linkedServices.map((svc, i) =>
                                  i === index
                                    ? {
                                        ...svc,
                                        customDuration:
                                          parseInt(e.target.value) ||
                                          svc.duration,
                                      }
                                    : svc
                                )
                              setFormData({
                                ...formData,
                                linkedServices: updatedServices,
                              })
                            }}
                            className='w-full px-2 h-7 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--brand-primary)]'
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div className='text-xs text-gray-500 mt-2'>
                        {linkedService.description}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stripe Connection Warning */}
        {!service && !hasStripeConnected && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex items-start gap-3'>
              <Zap className='w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5' />
              <div>
                <h4 className='font-semibold text-yellow-900 mb-1'>
                  Stripe Account Required
                </h4>
                <p className='text-sm text-yellow-800 mb-3'>
                  You must connect your Stripe account before creating services.
                  This is required to accept payments from customers.
                </p>
                <button
                  onClick={() => window.location.href = '/management'}
                  className='bg-yellow-600 text-white px-4 h-8 rounded-lg text-sm font-semibold hover:bg-yellow-700'
                >
                  Connect Stripe Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save/Cancel */}
        <div className='bg-white rounded-lg p-6'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!service && !hasStripeConnected)}
              className='flex-1 text-white h-10 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
              }}
            >
              <Save className='w-5 h-5' />
              {isSubmitting
                ? service
                  ? 'Updating...'
                  : 'Creating...'
                : service
                ? 'Update Service'
                : !hasStripeConnected
                ? 'Connect Stripe First'
                : 'Create Service'}
            </button>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className='sm:w-32 px-8 h-10 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />

      <ServiceSelectionModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onSelectServices={handleSelectServices}
        currentService={formData}
        excludeServiceId={service?._id}
      />
    </Layout>
  )
}

// Main Component with API integration
const ServiceManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState('grid')
  const [currentView, setCurrentView] = useState('list')
  const [selectedService, setSelectedService] = useState(null)

  // API hooks
  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
  } = useServices({
    search: searchTerm,
  })

  const { data: categories = [] } = useCategories(false)

  const deleteServiceMutation = useDeleteService({
    onSuccess: () => {
      toast.success('Service deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete service')
    },
  })

  const services = servicesData?.services || []
  const stats = servicesData?.stats || { total: 0, active: 0 }

  const getCategoryById = (id) => categories.find((cat) => cat._id === id)

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.subTreatments?.some(
        (sub) =>
          sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    return matchesSearch
  })

  const handleAddService = () => {
    setSelectedService(null)
    setCurrentView('form')
  }

  const handleEditService = (service) => {
    setSelectedService(service)
    setCurrentView('form')
  }

  const handleDeleteService = (service) => {
    if (window.confirm(`Delete "${service.name}"?`)) {
      deleteServiceMutation.mutate(service._id)
    }
  }

  const handleFormSave = () => {
    setCurrentView('list')
    setSelectedService(null)
  }

  const handleFormCancel = () => {
    setCurrentView('list')
    setSelectedService(null)
  }

  // Loading state
  if (servicesLoading) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600'></div>
          <span className='ml-3 text-lg'>Loading services...</span>
        </div>
      </Layout>
    )
  }

  // Error state
  if (servicesError) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='text-center'>
            <div className='text-red-500 text-xl mb-2'>⚠️</div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Error loading services
            </h3>
            <p className='text-gray-600'>
              {servicesError?.message || 'Please try again later'}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  if (currentView === 'form') {
    return (
      <ServiceForm
        service={selectedService}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    )
  }

  return (
    <Layout>
      <div className='px-4 py-6 max-w-[1600px] mx-auto'>
        <ServiceHeader
          view={view}
          setView={setView}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddService={handleAddService}
          totalServices={stats.total}
          activeServices={stats.active}
        />

        {view === 'grid' ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            {filteredServices.map((service) => (
              <ServiceCard
                key={service._id}
                service={service}
                category={getCategoryById(service.categoryId)}
                onEdit={handleEditService}
                onDelete={handleDeleteService}
                onView={(service) => alert(`View ${service.name}`)}
              />
            ))}
          </div>
        ) : (
          <div className='bg-white/80 backdrop-blur-md border border-white/20 rounded-2xl shadow-sm overflow-hidden'>
            {/* PC Table View */}
            <div className='hidden md:block overflow-x-auto'>
              <table className='w-full border-collapse min-w-[1000px]'>
                <thead>
                  <tr className='bg-gray-50/50 border-b border-gray-200'>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider'>Service</th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider'>Category</th>
                    <th className='px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider'>Price</th>
                    <th className='px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider'>Duration</th>
                    <th className='px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider'>Options</th>
                    <th className='px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider'>Add-ons</th>
                    <th className='px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider'>Status</th>
                    <th className='px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {filteredServices.map((service) => (
                    <tr 
                      key={service._id}
                      className='group hover:bg-pink-50/30 transition-all duration-200'
                    >
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-3'>
                          <img
                            src={resolveImageUrl(service.image, fallbackServiceImage, { width: 100, height: 100 })}
                            alt={service.name}
                            className='w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0'
                            loading='lazy'
                            decoding='async'
                          />
                          <div className='min-w-0'>
                            <div className='font-bold text-gray-900 truncate' title={service.name}>
                              {service.name}
                            </div>
                            <div className='text-[10px] text-gray-400 line-clamp-1 italic'>
                              {service.description || 'No description provided.'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className='px-6 py-4'>
                        <div className='text-sm text-gray-600 font-medium whitespace-nowrap'>
                          {typeof service.categoryId === 'object'
                            ? service.categoryId.name
                            : getCategoryById(service.categoryId)?.name || 'Uncategorized'}
                        </div>
                      </td>

                      <td className='px-6 py-4 text-center'>
                        <div className='font-bold text-gray-900'>${service.basePrice}</div>
                      </td>

                      <td className='px-6 py-4 text-center'>
                        <div className='text-sm font-semibold text-gray-600'>{service.duration}m</div>
                      </td>

                      <td className='px-6 py-4 text-center'>
                        <span className='inline-flex px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-[10px] font-bold border border-purple-100'>
                          {service.subTreatments?.length || 0}
                        </span>
                      </td>

                      <td className='px-6 py-4 text-center'>
                        <span className='inline-flex px-2 py-0.5 bg-pink-50 text-pink-600 rounded-md text-[10px] font-bold border border-pink-100'>
                          {service.linkedServicesCount || service.linkedServices?.length || 0}
                        </span>
                      </td>

                      <td className='px-6 py-4 text-center'>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                          service.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-gray-50 text-gray-600 border-gray-100'
                        }`}>
                          {service.status}
                        </span>
                      </td>

                      <td className='px-6 py-4 text-right'>
                        <div className='flex justify-end gap-1'>
                          <button
                            onClick={() => handleEditService(service)}
                            className='p-2 text-gray-400 hover:text-pink-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-pink-100'
                          >
                            <Edit3 className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service)}
                            className='p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-red-100'
                            disabled={deleteServiceMutation.isPending}
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Organized Cards) */}
            <div className='md:hidden divide-y divide-gray-100'>
              {filteredServices.map((service) => (
                <div key={service._id} className='p-5 space-y-4 bg-white'>
                  <div className='flex items-center gap-4'>
                    <img
                      src={resolveImageUrl(service.image, fallbackServiceImage, { width: 200, height: 200 })}
                      alt={service.name}
                      className='w-14 h-14 rounded-xl object-cover border border-gray-100 shadow-sm shrink-0'
                      loading='lazy'
                      decoding='async'
                    />
                    <div className='min-w-0 flex-1'>
                      <h3 className='font-bold text-gray-900 text-base leading-tight truncate'>{service.name}</h3>
                      <div className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border w-fit ${
                        service.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-gray-50 text-gray-600 border-gray-100'
                      }`}>
                        {service.status}
                      </div>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden shadow-sm'>
                    <div className='bg-white p-3 flex flex-col'>
                      <span className='text-[10px] font-extrabold text-gray-400 uppercase tracking-widest'>Category</span>
                      <span className='text-[13px] font-bold text-gray-700 mt-1 truncate'>
                        {typeof service.categoryId === 'object'
                          ? service.categoryId.name
                          : getCategoryById(service.categoryId)?.name || 'N/A'}
                      </span>
                    </div>
                    <div className='bg-white p-3 flex flex-col'>
                      <span className='text-[10px] font-extrabold text-gray-400 uppercase tracking-widest'>Price</span>
                      <span className='text-[13px] font-bold text-emerald-600 mt-1'>${service.basePrice}</span>
                    </div>
                    <div className='bg-white p-3 flex flex-col'>
                      <span className='text-[10px] font-extrabold text-gray-400 uppercase tracking-widest'>Time</span>
                      <span className='text-[13px] font-bold text-blue-600 mt-1'>{service.duration} min</span>
                    </div>
                    <div className='bg-white p-3 flex flex-col'>
                      <span className='text-[10px] font-extrabold text-gray-400 uppercase tracking-widest'>Add-ons</span>
                      <span className='text-[13px] font-bold text-pink-600 mt-1'>
                        {service.linkedServicesCount || service.linkedServices?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className='flex gap-2.5 pt-1'>
                    <button
                      onClick={() => handleEditService(service)}
                      className='flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-xl font-bold text-xs border border-gray-200 active:scale-95 transition-all'
                    >
                      <Edit3 className='w-4 h-4 text-pink-500' />
                      Edit Details
                    </button>
                    <button
                      onClick={() => handleDeleteService(service)}
                      className='flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs border border-red-100 active:scale-95 transition-all'
                      disabled={deleteServiceMutation.isPending}
                    >
                      <Trash2 className='w-4 h-4 text-red-500' />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredServices.length === 0 && (
          <div className='text-center py-16 bg-white rounded-lg'>
            <div className='text-6xl mb-4'>🎯</div>
            <h3 className='text-2xl font-bold text-gray-800 mb-3'>
              {searchTerm ? 'No services found' : 'No services yet'}
            </h3>
            <p className='text-gray-600 mb-8 max-w-md mx-auto'>
              {searchTerm
                ? 'Try different search terms'
                : 'Create your first service'}
            </p>
            <button
              onClick={handleAddService}
              className='text-white px-8 h-8 rounded-lg font-semibold flex items-center justify-center'
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
              }}
            >
              Create Service
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ServiceManagementPage
