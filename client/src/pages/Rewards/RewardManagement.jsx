// client/src/pages/Rewards/RewardManagement.jsx
import {
  useCreateReward,
  useDeleteReward,
  useFilteredRewards,
  useUpdateReward,
} from '@/hooks/useRewards'
import {
  ArrowLeft,
  Award,
  Calendar,
  DollarSign,
  Edit3,
  Eye,
  Gift,
  Percent,
  Plus,
  Save,
  Search,
  Star,
  Target,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import Layout from '../Layout/Layout'

const rewardTypes = [
  { id: 'credit', name: 'Service Credit', icon: DollarSign },
  { id: 'discount', name: 'Discount %', icon: Percent },
  { id: 'service', name: 'Free Service', icon: Gift },
  { id: 'combo', name: 'Combo Deal', icon: Star },
  { id: 'referral', name: 'Referral Reward', icon: Users },
]

// Reward Header with real stats
const RewardHeader = ({
  view,
  setView,
  searchTerm,
  setSearchTerm,
  onAddReward,
  stats,
}) => (
  <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm mb-6'>
    <div className='flex flex-col md:flex-row md:items-center justify-between mb-6'>
      <div className='flex items-center mb-4 md:mb-0'>
        <div className='bg-purple-600 p-3 rounded-lg mr-4 shadow-lg'>
          <Gift className='w-6 h-6 text-white' />
        </div>
        <div>
          <h1 className='text-xl md:text-3xl font-bold text-gray-900'>
            Reward Management
          </h1>
          <p className='text-gray-600 text-sm'>
            Create and manage reward redemptions
          </p>
          <div className='flex items-center gap-4 mt-1'>
            <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full'>
              {stats.active || 0} Active
            </span>
            <span className='text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full'>
              {stats.total || 0} Total
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onAddReward}
        className='bg-purple-600 text-white px-4 md:px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all flex items-center justify-center gap-2'
      >
        <Plus className='w-5 h-5' />
        <span className='hidden sm:inline'>Add New Reward</span>
        <span className='sm:hidden'>Add Reward</span>
      </button>
    </div>

    <div className='flex flex-col md:flex-row gap-4'>
      <div className='flex-1 relative'>
        <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
        <input
          type='text'
          placeholder='Search rewards...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full pl-12 pr-4 py-3 md:py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
        />
      </div>

      <div className='flex gap-2'>
        <button
          onClick={() => setView('grid')}
          className={`flex-1 md:flex-none px-4 py-3 md:py-4 rounded-lg font-semibold transition-all ${
            view === 'grid'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => setView('list')}
          className={`flex-1 md:flex-none px-4 py-3 md:py-4 rounded-lg font-semibold transition-all ${
            view === 'list'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          List
        </button>
      </div>
    </div>
  </div>
)

// Reward Card with real data
const RewardCard = ({ reward, onEdit, onDelete, onView }) => {
  const rewardType = rewardTypes.find((t) => t.id === reward.type)
  const IconComponent = rewardType?.icon || Award

  return (
    <div className='bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all group'>
      <div className='relative h-40 md:h-48 overflow-hidden'>
        <img
          src={
            reward.image ||
            'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=300&fit=crop'
          }
          alt={reward.name}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
        />

        <div className='absolute top-3 left-3 flex flex-col gap-2'>
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              reward.status === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {reward.status}
          </span>

          <span className='bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
            <IconComponent className='w-3 h-3' />
            {rewardType?.name || reward.type}
          </span>
        </div>

        <div className='absolute top-3 right-3'>
          <span className='bg-black/70 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
            <Zap className='w-3 h-3' />
            {reward.pointCost} pts
          </span>
        </div>

        <div className='absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
          <button
            onClick={() => onView(reward)}
            className='bg-white/90 backdrop-blur-sm p-2 rounded-lg hover:bg-white transition-all'
          >
            <Eye className='w-4 h-4 text-gray-700' />
          </button>
          <button
            onClick={() => onEdit(reward)}
            className='bg-white/90 backdrop-blur-sm p-2 rounded-lg hover:bg-white transition-all'
          >
            <Edit3 className='w-4 h-4 text-blue-600' />
          </button>
          <button
            onClick={() => onDelete(reward)}
            className='bg-white/90 backdrop-blur-sm p-2 rounded-lg hover:bg-white transition-all'
          >
            <Trash2 className='w-4 h-4 text-red-500' />
          </button>
        </div>
      </div>

      <div className='p-4 md:p-6'>
        <h3 className='text-lg md:text-xl font-bold text-gray-900 mb-2'>
          {reward.name}
        </h3>

        <p className='text-gray-600 text-sm mb-4 line-clamp-2'>
          {reward.description}
        </p>

        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='bg-purple-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <Zap className='w-4 h-4 text-purple-600' />
              <span className='text-xs font-semibold text-purple-700'>
                Points
              </span>
            </div>
            <span className='text-lg font-bold text-purple-700'>
              {reward.pointCost}
            </span>
          </div>

          <div className='bg-green-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <DollarSign className='w-4 h-4 text-green-600' />
              <span className='text-xs font-semibold text-green-700'>
                Value
              </span>
            </div>
            <span className='text-lg font-bold text-green-700'>
              {reward.displayValue ||
                (reward.type === 'credit' || reward.type === 'referral'
                  ? `$${reward.value}`
                  : reward.type === 'discount' || reward.type === 'combo'
                  ? `${reward.value}%`
                  : reward.type === 'service'
                  ? 'Free'
                  : `$${reward.value}`)}
            </span>
          </div>

          <div className='bg-blue-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <Calendar className='w-4 h-4 text-blue-600' />
              <span className='text-xs font-semibold text-blue-700'>Valid</span>
            </div>
            <span className='text-lg font-bold text-blue-700'>
              {reward.validDays}d
            </span>
          </div>

          <div className='bg-orange-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <Target className='w-4 h-4 text-orange-600' />
              <span className='text-xs font-semibold text-orange-700'>
                Limit
              </span>
            </div>
            <span className='text-lg font-bold text-orange-700'>
              {reward.limit}
            </span>
          </div>
        </div>

        <div className='flex items-center justify-between pt-4 border-t border-gray-100'>
          <div className='text-sm text-gray-600'>
            <span className='font-semibold'>{reward.redeemCount || 0}</span>{' '}
            redeemed
          </div>
          <div className='text-sm text-gray-600'>
            ID: {reward._id?.slice(-6) || reward.id}
          </div>
        </div>
      </div>
    </div>
  )
}

// Reward Form with API integration
const RewardForm = ({ reward, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: reward?.name || '',
    description: reward?.description || '',
    type: reward?.type || 'credit',
    pointCost: reward?.pointCost || '',
    value: reward?.value || '',
    image: reward?.image || '',
    status: reward?.status || 'active',
    limit: reward?.limit || 1,
    validDays: reward?.validDays || 30,
    maxValue: reward?.maxValue || '',
    minPurchase: reward?.minPurchase || '',
  })

  const [errors, setErrors] = useState({})

  // API hooks
  const createRewardMutation = useCreateReward({
    onSuccess: () => {
      toast.success('Reward created successfully!')
      onSave()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create reward')
    },
  })

  const updateRewardMutation = useUpdateReward({
    onSuccess: () => {
      toast.success('Reward updated successfully!')
      onSave()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update reward')
    },
  })

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Reward name is required'
    if (!formData.description.trim())
      newErrors.description = 'Description is required'
    if (!formData.type) newErrors.type = 'Reward type is required'
    if (!formData.pointCost || formData.pointCost <= 0)
      newErrors.pointCost = 'Valid point cost required'
    if (formData.type !== 'service' && (!formData.value || formData.value < 0))
      newErrors.value = 'Valid value required'
    if (!formData.limit || formData.limit <= 0)
      newErrors.limit = 'Valid limit required'
    if (!formData.validDays || formData.validDays <= 0)
      newErrors.validDays = 'Valid duration required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      if (reward) {
        // Update existing reward
        updateRewardMutation.mutate({
          id: reward._id,
          ...formData,
        })
      } else {
        // Create new reward
        createRewardMutation.mutate(formData)
      }
    }
  }

  const selectedType = rewardTypes.find((t) => t.id === formData.type)
  const isSubmitting =
    createRewardMutation.isPending || updateRewardMutation.isPending

  return (
    <Layout>
      <div className='px-4 py-6 space-y-6 max-w-4xl mx-auto'>
        {/* Header */}
        <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm'>
          <div className='flex items-center mb-4'>
            <button
              onClick={onCancel}
              className='mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all'
              disabled={isSubmitting}
            >
              <ArrowLeft className='w-6 h-6' />
            </button>
            <div>
              <h1 className='text-xl md:text-2xl font-bold text-gray-900'>
                {reward ? 'Edit Reward' : 'Create New Reward'}
              </h1>
              <p className='text-gray-600 text-sm'>
                {reward
                  ? 'Update reward details'
                  : 'Add a new reward to your catalog'}
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm'>
          <h2 className='text-lg font-bold text-gray-900 mb-6'>
            Basic Information
          </h2>

          <div className='grid md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Reward Name *
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='e.g., $25 Service Credit'
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className='text-red-500 text-xs mt-1'>{errors.name}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Reward Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.type ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              >
                {rewardTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className='text-red-500 text-xs mt-1'>{errors.type}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Point Cost *
              </label>
              <input
                type='number'
                value={formData.pointCost}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pointCost: parseInt(e.target.value) || '',
                  })
                }
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.pointCost ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='100'
                min='1'
                disabled={isSubmitting}
              />
              {errors.pointCost && (
                <p className='text-red-500 text-xs mt-1'>{errors.pointCost}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                {formData.type === 'service'
                  ? 'Value (optional)'
                  : formData.type === 'discount' || formData.type === 'combo'
                  ? 'Percentage Value *'
                  : 'Dollar Value *'}
              </label>
              <input
                type='number'
                value={formData.value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: parseFloat(e.target.value) || '',
                  })
                }
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.value ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={
                  formData.type === 'discount' || formData.type === 'combo'
                    ? '20'
                    : '25'
                }
                min='0'
                step={
                  formData.type === 'discount' || formData.type === 'combo'
                    ? '1'
                    : '0.01'
                }
                disabled={isSubmitting}
              />
              {errors.value && (
                <p className='text-red-500 text-xs mt-1'>{errors.value}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Monthly Limit *
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
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
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
                Valid Days *
              </label>
              <input
                type='number'
                value={formData.validDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    validDays: parseInt(e.target.value) || '',
                  })
                }
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.validDays ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='30'
                min='1'
                disabled={isSubmitting}
              />
              {errors.validDays && (
                <p className='text-red-500 text-xs mt-1'>{errors.validDays}</p>
              )}
            </div>

            {/* Advanced fields for percentage rewards */}
            {(formData.type === 'discount' || formData.type === 'combo') && (
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Max Value ($)
                </label>
                <input
                  type='number'
                  value={formData.maxValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxValue: parseFloat(e.target.value) || '',
                    })
                  }
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
                  placeholder='60'
                  min='0'
                  step='0.01'
                  disabled={isSubmitting}
                />
                <p className='text-xs text-gray-500 mt-1'>
                  Maximum dollar amount for percentage discounts
                </p>
              </div>
            )}

            <div>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
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
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              rows='4'
              placeholder='Detailed description of the reward and how it can be used...'
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
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
              placeholder='https://example.com/reward-image.jpg'
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Save/Cancel */}
        <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className='flex-1 bg-purple-600 text-white py-4 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2'
            >
              <Save className='w-5 h-5' />
              {isSubmitting
                ? reward
                  ? 'Updating...'
                  : 'Creating...'
                : reward
                ? 'Update Reward'
                : 'Create Reward'}
            </button>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className='sm:w-32 px-8 py-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// Main Component with API integration
const RewardManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState('grid')
  const [currentView, setCurrentView] = useState('list')
  const [selectedReward, setSelectedReward] = useState(null)

  // API hooks
  const {
    rewards = [],
    stats = {},
    isLoading,
    error,
  } = useFilteredRewards({
    search: searchTerm,
  })

  const deleteRewardMutation = useDeleteReward({
    onSuccess: () => {
      toast.success('Reward deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete reward')
    },
  })

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600'></div>
          <span className='ml-3 text-lg'>Loading rewards...</span>
        </div>
      </Layout>
    )
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='text-center'>
            <div className='text-red-500 text-xl mb-2'>⚠️</div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Error loading rewards
            </h3>
            <p className='text-gray-600'>
              {error?.message || 'Please try again later'}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  const filteredRewards = rewards.filter((reward) => {
    const matchesSearch =
      reward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reward.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reward.type.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handleAddReward = () => {
    setSelectedReward(null)
    setCurrentView('form')
  }

  const handleEditReward = (reward) => {
    setSelectedReward(reward)
    setCurrentView('form')
  }

  const handleDeleteReward = (reward) => {
    if (window.confirm(`Delete "${reward.name}"?`)) {
      deleteRewardMutation.mutate(reward._id)
    }
  }

  const handleFormSave = () => {
    setCurrentView('list')
    setSelectedReward(null)
  }

  const handleFormCancel = () => {
    setCurrentView('list')
    setSelectedReward(null)
  }

  if (currentView === 'form') {
    return (
      <RewardForm
        reward={selectedReward}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    )
  }

  return (
    <Layout>
      <div className='px-4 py-6 max-w-7xl mx-auto'>
        <RewardHeader
          view={view}
          setView={setView}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddReward={handleAddReward}
          stats={stats}
        />

        {view === 'grid' ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {filteredRewards.map((reward) => (
              <RewardCard
                key={reward._id}
                reward={reward}
                onEdit={handleEditReward}
                onDelete={handleDeleteReward}
                onView={(reward) => alert(`View ${reward.name}`)}
              />
            ))}
          </div>
        ) : (
          <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm'>
            <div className='space-y-4'>
              {filteredRewards.map((reward) => (
                <div
                  key={reward._id}
                  className='flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all'
                >
                  <img
                    src={
                      reward.image ||
                      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=300&fit=crop'
                    }
                    alt={reward.name}
                    className='w-16 h-16 rounded-lg object-cover'
                  />
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-bold text-gray-900 truncate'>
                      {reward.name}
                    </h3>
                    <p className='text-sm text-gray-600 line-clamp-1'>
                      {reward.description}
                    </p>
                    <div className='flex items-center gap-4 mt-2'>
                      <span className='text-sm text-purple-600 font-semibold'>
                        {reward.pointCost} pts
                      </span>
                      <span className='text-sm text-green-600'>
                        {reward.displayValue}
                      </span>
                      <span className='text-sm text-blue-600'>
                        {reward.validDays}d valid
                      </span>
                      <span className='text-sm text-orange-600'>
                        {reward.redeemCount || 0} redeemed
                      </span>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => handleEditReward(reward)}
                      className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all'
                    >
                      <Edit3 className='w-4 h-4' />
                    </button>
                    <button
                      onClick={() => handleDeleteReward(reward)}
                      className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all'
                      disabled={deleteRewardMutation.isPending}
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredRewards.length === 0 && (
          <div className='text-center py-16 bg-white rounded-lg shadow-sm'>
            <div className='text-6xl mb-4'>🎁</div>
            <h3 className='text-2xl font-bold text-gray-800 mb-3'>
              {searchTerm ? 'No rewards found' : 'No rewards yet'}
            </h3>
            <p className='text-gray-600 mb-8 max-w-md mx-auto'>
              {searchTerm
                ? 'Try different search terms'
                : 'Create your first reward'}
            </p>
            <button
              onClick={handleAddReward}
              className='bg-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-purple-700 transition-all'
            >
              Create Reward
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default RewardManagement
