// client/src/pages/Management/ServiceManagementPage.jsx
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
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  Eye,
  Layers,
  Percent,
  Plus,
  Save,
  Search,
  Settings,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast' // or your preferred toast library
import Layout from '../Layout/Layout'

// Simple Category Modal with API integration
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
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                disabled={createCategoryMutation.isPending}
              />

              <button
                onClick={handleAdd}
                disabled={
                  !newCategoryName.trim() || createCategoryMutation.isPending
                }
                className='w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
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
  <div className='bg-white rounded-lg p-6 shadow-sm mb-6'>
    <div className='flex flex-col md:flex-row md:items-center justify-between mb-6'>
      <div className='flex items-center mb-4 md:mb-0'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900'>
            Service Management
          </h1>
          <p className='text-gray-600 text-sm'>
            Create and manage your spa services
          </p>
          <div className='flex items-center gap-4 mt-1'>
            <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full'>
              {activeServices} Active
            </span>
            <span className='text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full'>
              {totalServices} Total
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onAddService}
        className='bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2'
      >
        <Plus className='w-5 h-5' />
        <span className='hidden sm:inline'>Add New Service</span>
        <span className='sm:hidden'>Add Service</span>
      </button>
    </div>

    <div className='flex flex-col md:flex-row gap-4'>
      <div className='flex-1 relative'>
        <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
        <input
          type='text'
          placeholder='Search services...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>

      <div className='flex gap-2'>
        <button
          onClick={() => setView('grid')}
          className={`px-4 py-3 rounded-lg font-semibold ${
            view === 'grid'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => setView('list')}
          className={`px-4 py-3 rounded-lg font-semibold ${
            view === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          List
        </button>
      </div>
    </div>
  </div>
)

// Service Card with real data
const ServiceCard = ({ service, category, onEdit, onDelete, onView }) => {
  const isDiscountActive =
    service.discount?.active &&
    new Date() >= new Date(service.discount.startDate) &&
    new Date() <= new Date(service.discount.endDate)

  return (
    <div className='bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow group'>
      <div className='relative h-48 overflow-hidden'>
        <img
          src={
            service.image ||
            'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop'
          }
          alt={service.name}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
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
            <span className='px-2 py-1 rounded-full text-xs font-bold text-white bg-blue-600'>
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
            <Edit3 className='w-4 h-4 text-blue-600' />
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
          <span className='text-sm text-gray-500'>
            {service.bookings || 0} bookings
          </span>
        </div>
      </div>
    </div>
  )
}

// Service Form with API integration
const ServiceForm = ({ service, onSave, onCancel }) => {
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
    status: service?.status || 'active',
    subTreatments: service?.subTreatments || [],
  })

  const [errors, setErrors] = useState({})
  const [showCategoryModal, setShowCategoryModal] = useState(false)

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

  const handleSubmit = () => {
    if (validateForm()) {
      if (service) {
        // Update existing service
        updateServiceMutation.mutate({
          id: service._id,
          ...formData,
        })
      } else {
        // Create new service
        createServiceMutation.mutate(formData)
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

  const isSubmitting =
    createServiceMutation.isPending || updateServiceMutation.isPending

  return (
    <Layout>
      <div className='px-4 py-6 space-y-6 max-w-4xl mx-auto'>
        {/* Header */}
        <div className='bg-white rounded-lg p-6 shadow-sm'>
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
                  ? 'Update service details'
                  : 'Add a new service offering'}
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className='bg-white rounded-lg p-6 shadow-sm'>
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
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='e.g., Dermal Filler Treatment'
                disabled={isSubmitting}
              />
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
                  className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                  className='px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200'
                  disabled={isSubmitting}
                >
                  <Settings className='w-5 h-5' />
                </button>
              </div>
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
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.basePrice ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='450'
                min='0'
                step='0.01'
                disabled={isSubmitting}
              />
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
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.duration ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='60'
                min='1'
                disabled={isSubmitting}
              />
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
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                disabled={isSubmitting}
              >
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
              </select>
            </div>
          </div>

          <div className='mt-6'>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              Image URL
            </label>
            <input
              type='url'
              value={formData.image}
              onChange={(e) =>
                setFormData({ ...formData, image: e.target.value })
              }
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='https://example.com/image.jpg'
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Discount Settings */}
        <div className='bg-white rounded-lg p-6 shadow-sm'>
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
                className='w-5 h-5 text-blue-600 rounded focus:ring-blue-500'
                disabled={isSubmitting}
              />
              <label
                htmlFor='discountActive'
                className='text-sm font-semibold text-gray-700'
              >
                Enable promotional discount
              </label>
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
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Treatment Options */}
        <div className='bg-white rounded-lg p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-bold text-gray-900'>
              Treatment Options
            </h2>
            <button
              onClick={addSubTreatment}
              className='bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2'
              disabled={isSubmitting}
            >
              <Plus className='w-4 h-4' />
              <span className='hidden sm:inline'>Add Treatment</span>
              <span className='sm:hidden'>Add</span>
            </button>
          </div>

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
                      <span className='bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold'>
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
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Save/Cancel */}
        <div className='bg-white rounded-lg p-6 shadow-sm'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className='flex-1 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              <Save className='w-5 h-5' />
              {isSubmitting
                ? service
                  ? 'Updating...'
                  : 'Creating...'
                : service
                ? 'Update Service'
                : 'Create Service'}
            </button>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className='sm:w-32 px-8 py-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50'
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
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
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
      <div className='px-4 py-6 max-w-7xl mx-auto'>
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
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
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
          <div className='bg-white rounded-lg p-6 shadow-sm'>
            <div className='space-y-4'>
              {filteredServices.map((service) => (
                <div
                  key={service._id}
                  className='flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all'
                >
                  <img
                    src={
                      service.image ||
                      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop'
                    }
                    alt={service.name}
                    className='w-16 h-16 rounded-lg object-cover'
                  />
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-bold text-gray-900 truncate'>
                      {service.name}
                    </h3>
                    <p className='text-sm text-gray-600 line-clamp-1'>
                      {service.description}
                    </p>
                    <div className='flex items-center gap-4 mt-2'>
                      <span className='text-sm text-green-600 font-semibold'>
                        ${service.basePrice}
                      </span>
                      <span className='text-sm text-blue-600'>
                        {service.duration}min
                      </span>
                      <span className='text-sm text-purple-600'>
                        {service.subTreatments?.length || 0} options
                      </span>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => handleEditService(service)}
                      className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg'
                    >
                      <Edit3 className='w-4 h-4' />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service)}
                      className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
                      disabled={deleteServiceMutation.isPending}
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredServices.length === 0 && (
          <div className='text-center py-16 bg-white rounded-lg shadow-sm'>
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
              className='bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700'
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
