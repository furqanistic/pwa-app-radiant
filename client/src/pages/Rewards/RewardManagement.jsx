// File: client/src/pages/Rewards/RewardManagement.jsx
import {
  useCreateReward,
  useDeleteReward,
  useEnhancedRewardsCatalog,
  useUpdateReward,
} from '@/hooks/useRewards'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  Calendar,
  ChevronDown,
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
  X,
  Zap,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

const rewardTypes = [
  { id: 'credit', name: 'Service Credit', icon: DollarSign },
  { id: 'discount', name: 'Discount %', icon: Percent },
  { id: 'service', name: 'Free Service', icon: Gift },
  { id: 'combo', name: 'Combo Deal', icon: Star },
  { id: 'referral', name: 'Referral Reward', icon: Users },
]

// Reward Header Component
const RewardHeader = ({
  view,
  setView,
  searchTerm,
  setSearchTerm,
  onAddReward,
  stats,
  userRole,
}) => (
  <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm mb-6'>
    <div className='flex flex-col md:flex-row md:items-center justify-between mb-6'>
      <div className='flex items-center mb-4 md:mb-0'>
        <div className='bg-gradient-to-br from-pink-500 to-rose-500 p-3 rounded-lg mr-4 shadow-lg'>
          <Gift className='w-6 h-6 text-white' />
        </div>
        <div>
          <h1 className='text-xl md:text-3xl font-bold text-gray-900'>
            Reward Management
          </h1>
          <p className='text-gray-600 text-sm'>
            {userRole === 'admin' || userRole === 'team'
              ? 'Create and manage reward redemptions'
              : 'View available rewards'}
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

      {(userRole === 'admin' || userRole === 'team') && (
        <button
          onClick={onAddReward}
          className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 md:px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-600 transition-all flex items-center justify-center gap-2 shadow-sm'
        >
          <Plus className='w-5 h-5' />
          <span className='hidden sm:inline'>Add New Reward</span>
          <span className='sm:hidden'>Add Reward</span>
        </button>
      )}
    </div>

    <div className='flex flex-col md:flex-row gap-4'>
      <div className='flex-1 relative'>
        <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 text-pink-300 w-5 h-5' />
        <input
          type='text'
          placeholder='Search rewards...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full pl-12 pr-4 py-3 md:py-4 border border-pink-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent'
        />
      </div>

      <div className='flex gap-2'>
        <button
          onClick={() => setView('grid')}
          className={`flex-1 md:flex-none px-4 py-3 md:py-4 rounded-lg font-semibold transition-all ${
            view === 'grid'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => setView('list')}
          className={`flex-1 md:flex-none px-4 py-3 md:py-4 rounded-lg font-semibold transition-all ${
            view === 'list'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          List
        </button>
      </div>
    </div>
  </div>
)

// Reward Card Component
const RewardCard = ({ reward, onEdit, onDelete, onView, userRole }) => {
  const rewardType = rewardTypes.find((t) => t.id === reward.type)
  const IconComponent = rewardType?.icon || Award
  const canEdit = ['super-admin', 'admin', 'team'].includes(userRole)

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
          <span className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1'>
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

        {canEdit && (
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
        )}
      </div>

      <div className='p-4 md:p-6'>
        <h3 className='text-lg md:text-xl font-bold text-gray-900 mb-2'>
          {reward.name}
        </h3>
        <p className='text-gray-600 text-sm mb-4 line-clamp-2'>
          {reward.description}
        </p>
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='bg-pink-50 p-3 rounded-lg'>
            <div className='flex items-center gap-2 mb-1'>
              <Zap className='w-4 h-4 text-pink-600' />
              <span className='text-xs font-semibold text-pink-700'>
                Points
              </span>
            </div>
            <span className='text-lg font-bold text-pink-700'>
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
              {reward.displayValue || `$${reward.value}`}
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

// Reward Form Modal Component
const RewardForm = ({ isOpen, onClose, reward, onSave }) => {
  const isEditing = !!reward
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'credit',
    value: '',
    pointCost: '',
    validDays: 30,
    limit: 1,
    status: 'active',
    image: '',
  })

  useEffect(() => {
    if (reward) {
      setFormData({
        name: reward.name || '',
        description: reward.description || '',
        type: reward.type || 'credit',
        value: reward.value || '',
        pointCost: reward.pointCost || '',
        validDays: reward.validDays || 30,
        limit: reward.limit || 1,
        status: reward.status || 'active',
        image: reward.image || '',
      })
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'credit',
        value: '',
        pointCost: '',
        validDays: 30,
        limit: 1,
        status: 'active',
        image: '',
      })
    }
  }, [reward, isOpen])

  const createRewardMutation = useCreateReward({
    onSuccess: (data) => {
      onSave(data)
      onClose()
    },
  })

  const updateRewardMutation = useUpdateReward({
    onSuccess: (data) => {
      onSave(data)
      onClose()
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.description || formData.value === '' || formData.pointCost === '') {
      toast.error('Please fill in all required fields')
      return
    }

    const payload = {
      ...formData,
      value: Number(formData.value),
      pointCost: Number(formData.pointCost),
      validDays: Number(formData.validDays),
      limit: Number(formData.limit),
    }

    if (isEditing) {
      updateRewardMutation.mutate({ id: reward._id || reward.id, ...payload })
    } else {
      createRewardMutation.mutate(payload)
    }
  }

  const isLoading = createRewardMutation.isPending || updateRewardMutation.isPending

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] p-0 sm:p-4'>
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className='bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-pink-50 max-w-4xl w-full max-h-[92vh] flex flex-col relative'
          >
            {/* Mobile Drag Handle */}
            <div className='flex justify-center pt-3 pb-1 sm:hidden'>
              <div className='w-12 h-1.5 bg-gray-200 rounded-full'></div>
            </div>

            {/* Modal Header - Ultra Compact */}
            <div className='px-5 py-3 md:py-4 border-b border-gray-50 flex items-center justify-between shrink-0'>
              <div className='flex items-center gap-3'>
                <div className='bg-pink-50 p-2 rounded-lg'>
                  <Gift className='w-4 h-4 text-pink-600' />
                </div>
                <h2 className='text-base md:text-lg font-bold text-gray-900'>
                  {isEditing ? 'Edit Reward' : 'New Reward'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className='p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-gray-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className='flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar'>
              <form id='reward-form' onSubmit={handleSubmit} className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                  {/* Name */}
                  <div className='space-y-1.5 md:col-span-2'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1'>
                      Reward Name *
                    </label>
                    <input
                      type='text'
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder='e.g., $50 Service Credit'
                      className='w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:bg-white outline-none transition-all text-sm font-medium'
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className='space-y-1.5 md:col-span-2'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1'>
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder='What does the user get?'
                      className='w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:bg-white outline-none transition-all text-sm font-medium'
                      rows='2'
                      required
                    />
                  </div>

                  {/* Type */}
                  <div className='space-y-1.5'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1'>
                      Type *
                    </label>
                    <div className='relative'>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className='w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 appearance-none outline-none text-sm font-medium'
                      >
                        {rewardTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className='absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
                    </div>
                  </div>

                  {/* Value */}
                  <div className='space-y-1.5'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1'>
                      Value Amount (%) *
                    </label>
                    <input
                      type='number'
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className='w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-sm font-medium'
                      required
                    />
                  </div>

                  {/* Point Cost */}
                  <div className='space-y-1.5'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1'>
                      Point Cost *
                    </label>
                    <input
                      type='number'
                      value={formData.pointCost}
                      onChange={(e) => setFormData({ ...formData, pointCost: e.target.value })}
                      className='w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-sm font-medium'
                      required
                    />
                  </div>

                  {/* Valid Days */}
                  <div className='space-y-1.5'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1'>
                      Valid Days
                    </label>
                    <input
                      type='number'
                      value={formData.validDays}
                      onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                      className='w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-sm font-medium'
                    />
                  </div>

                  {/* Status */}
                  <div className='space-y-1.5'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1'>
                      Status
                    </label>
                    <div className='relative'>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className='w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 appearance-none outline-none text-sm font-medium'
                      >
                        <option value='active'>Active</option>
                        <option value='inactive'>Inactive</option>
                      </select>
                      <ChevronDown className='absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
                    </div>
                  </div>

                  {/* Image URL */}
                  <div className='space-y-1.5'>
                    <label className='text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1'>Image URL</label>
                    <input
                      type='text'
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder='https://...'
                      className='w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-sm font-medium'
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer - Compact */}
            <div className='p-4 md:p-6 bg-white border-t border-gray-50 shrink-0'>
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={onClose}
                  className='flex-1 py-3.5 text-gray-600 font-bold text-sm bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all'
                >
                  Cancel
                </button>
                <button
                  form='reward-form'
                  type='submit'
                  disabled={isLoading}
                  className='flex-[2] py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-pink-100 active:scale-95'
                >
                  {isLoading ? (
                    <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  ) : (
                    <Save className='w-4.5 h-4.5' />
                  )}
                  <span className='text-sm'>{isEditing ? 'Save Changes' : 'Create Reward'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Main Reward Management Component
const RewardManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [view, setView] = useState('grid')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedReward, setSelectedReward] = useState(null)

  const { currentUser } = useSelector((state) => state.user)
  const userRole = currentUser?.role || 'user'
  const canManageRewards = userRole === 'admin' || userRole === 'team'

  const {
    rewards = [],
    isLoading,
    error,
    refetch,
  } = useEnhancedRewardsCatalog({ search: searchTerm })

  const deleteRewardMutation = useDeleteReward({
    onSuccess: () => toast.success('Reward deleted successfully!'),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete reward'),
  })

  const stats = {
    total: rewards.length,
    active: rewards.filter((r) => r.status === 'active').length,
  }

  const filteredRewards = rewards.filter((reward) =>
    reward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reward.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reward.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddReward = () => {
    if (!canManageRewards) return toast.error('Access denied')
    setSelectedReward(null)
    setIsFormOpen(true)
  }

  const handleEditReward = (reward) => {
    if (!canManageRewards) return toast.error('Access denied')
    setSelectedReward(reward)
    setIsFormOpen(true)
  }

  const handleDeleteReward = (reward) => {
    if (!canManageRewards) return toast.error('Access denied')
    if (window.confirm(`Delete "${reward.name}"?`)) {
      deleteRewardMutation.mutate(reward._id)
    }
  }

  const handleFormSave = () => {
    setIsFormOpen(false)
    setSelectedReward(null)
    refetch()
  }

  if (isLoading) {
    return (
      <Layout>
        <div className='flex flex-col items-center justify-center min-h-[50vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-4 border-pink-100 border-t-pink-500 mb-4'></div>
          <span className='text-lg text-gray-500'>Loading...</span>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='px-4 py-8 max-w-7xl mx-auto w-full'>
        <RewardHeader
          view={view}
          setView={setView}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddReward={handleAddReward}
          stats={stats}
          userRole={userRole}
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
                userRole={userRole}
              />
            ))}
          </div>
        ) : (
          <div className='bg-white rounded-lg p-4 md:p-6 shadow-sm border border-pink-50'>
            <div className='space-y-4'>
              {filteredRewards.map((reward) => (
                <div
                  key={reward._id}
                  className='flex items-center gap-4 p-4 border border-gray-100 rounded-lg hover:border-pink-200 hover:shadow-md transition-all group'
                >
                  <img
                    src={reward.image || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=300&fit=crop'}
                    alt={reward.name}
                    className='w-16 h-16 rounded-lg object-cover'
                  />
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-bold text-gray-900 truncate'>{reward.name}</h3>
                    <p className='text-sm text-gray-600 line-clamp-1'>{reward.description}</p>
                    <div className='flex gap-4 mt-1'>
                      <span className='text-xs font-semibold text-pink-600'>{reward.pointCost} pts</span>
                      <span className='text-xs font-semibold text-green-600'>{reward.displayValue || `$${reward.value}`}</span>
                    </div>
                  </div>
                  {canManageRewards && (
                    <div className='flex gap-2'>
                      <button onClick={() => handleEditReward(reward)} className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg'><Edit3 className='w-4 h-4' /></button>
                      <button onClick={() => handleDeleteReward(reward)} className='p-2 text-red-600 hover:bg-red-50 rounded-lg'><Trash2 className='w-4 h-4' /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredRewards.length === 0 && (
          <div className='text-center py-20 bg-white rounded-3xl shadow-sm border border-pink-50'>
            <div className='text-6xl mb-6'>🎁</div>
            <h3 className='text-2xl font-bold text-gray-800 mb-2'>No rewards found</h3>
            <p className='text-gray-500 mb-8'>Check back later for new surprises!</p>
            {canManageRewards && (
              <button onClick={handleAddReward} className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-pink-100'>
                Create Your First Reward
              </button>
            )}
          </div>
        )}
      </div>

      <RewardForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        reward={selectedReward}
        onSave={handleFormSave}
      />
    </Layout>
  )
}

export default RewardManagement
