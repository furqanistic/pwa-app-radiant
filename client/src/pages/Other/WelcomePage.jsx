// File: client/src/pages/Other/WelcomePage.jsx - IMPROVED with Redux updates

import { updateProfile } from '@/redux/userSlice'
import { authService } from '@/services/authService'
import { locationService } from '@/services/locationService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    Award,
    CheckCircle,
    ChevronDown,
    Gift,
    Heart,
    MapPin,
    Search,
    Sparkles,
    Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'

const SpaDropdown = ({ spas, onSelect, isLoading, error }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpa, setSelectedSpa] = useState(null)

  const filteredSpas =
    spas?.filter(
      (spa) =>
        spa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spa.address.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  const handleSelect = (spa) => {
    setSelectedSpa(spa)
    setSearchTerm('')
    setIsOpen(false)
    onSelect(spa)
  }

  if (error) {
    return (
      <div className='w-full px-4 py-4 bg-red-50 border border-red-200 rounded-xl text-center'>
        <p className='text-red-600 text-sm'>
          Error loading spas. Please try again.
        </p>
      </div>
    )
  }

  return (
    <div className='w-full relative'>
      <button
        className={`w-full px-4 py-4 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-between transition-all ${
          isLoading
            ? 'cursor-default opacity-75'
            : 'cursor-pointer hover:shadow-md'
        }`}
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <div className='flex items-center space-x-3 flex-1'>
          <Search className='w-5 h-5 text-pink-500' />
          <div className='text-left flex-1'>
            <span className='text-gray-800 font-medium block'>
              {selectedSpa ? selectedSpa.name : 'Select your spa'}
            </span>
            {selectedSpa && (
              <span className='text-sm text-gray-500 block mt-1'>
                {selectedSpa.address}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && !isLoading && (
        <div className='absolute top-full mt-2 w-full z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden'>
          <div className='p-3 border-b border-gray-100'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Search spas...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm'
                autoFocus
              />
            </div>
          </div>

          <div className='max-h-64 overflow-y-auto'>
            {filteredSpas.length > 0 ? (
              filteredSpas.map((spa) => (
                <button
                  key={spa.locationId}
                  onClick={() => handleSelect(spa)}
                  className='w-full p-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors text-left'
                >
                  <div className='font-medium text-gray-800 text-sm mb-1'>
                    {spa.name}
                  </div>
                  <div className='flex items-center space-x-1'>
                    <MapPin className='w-3 h-3 text-gray-400' />
                    <span className='text-xs text-gray-500'>{spa.address}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className='p-4 text-center'>
                <p className='text-sm text-gray-500'>No spas found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ReferralInput = ({ onSubmit }) => {
  const [referralCode, setReferralCode] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = () => {
    if (referralCode.trim()) {
      onSubmit(referralCode.trim())
      setReferralCode('')
      setIsExpanded(false)
    }
  }

  return (
    <div className='mb-6'>
      <button
        className='w-full px-4 py-4 bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 border border-pink-200 rounded-xl flex items-center justify-center space-x-3 text-pink-700 hover:from-pink-100 hover:via-rose-100 hover:to-purple-100 transition-all'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Users className='w-5 h-5' />
        <span className='font-medium'>Have a referral code?</span>
      </button>

      {isExpanded && (
        <div className='mt-3 p-4 bg-white/90 backdrop-blur-sm border border-pink-200 rounded-xl'>
          <div className='flex space-x-3'>
            <input
              type='text'
              placeholder='Enter referral code'
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className='flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300'
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={handleSubmit}
              disabled={!referralCode.trim()}
              className='px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-600 hover:to-rose-600 transition-all'
            >
              Apply
            </button>
          </div>
          <p className='text-sm text-gray-500 mt-3'>
            Get bonus points with a valid referral code!
          </p>
        </div>
      )}
    </div>
  )
}

const SuccessMessage = ({ selectedSpa, rewardData, onContinue }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className='bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm'
  >
    <div className='w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center'>
      <CheckCircle className='w-8 h-8 text-white' />
    </div>

    <h3 className='text-xl font-semibold text-gray-800 mb-2'>
      Successfully Joined!
    </h3>

    <p className='text-lg text-pink-600 font-medium mb-1'>{selectedSpa.name}</p>
    <p className='text-sm text-gray-500 mb-4'>{selectedSpa.address}</p>

    {rewardData && (
      <div className='bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-lg p-4 mb-4'>
        <div className='flex items-center justify-center gap-2 mb-2'>
          <Award className='w-5 h-5 text-pink-600' />
          <span className='font-semibold text-pink-800'>Points Earned!</span>
        </div>
        <p className='text-2xl font-bold text-pink-700 mb-2'>
          +
          {(rewardData.profileCompletion || 0) +
            (rewardData.referral?.data?.referredPoints || 0)}{' '}
          Points
        </p>
        <div className='text-sm text-pink-600 space-y-1'>
          <div>Profile completion: +{rewardData.profileCompletion || 0}</div>
          {rewardData.referral?.success && (
            <div>
              Referral bonus: +{rewardData.referral.data.referredPoints}
            </div>
          )}
        </div>
      </div>
    )}

    {rewardData?.referral?.success && (
      <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
        <p className='text-sm text-blue-700 font-medium'>
          Referral code applied successfully!
        </p>
        <p className='text-xs text-blue-600 mt-1'>
          You and {rewardData.referral.data.referrerName} both earned bonus
          points!
        </p>
      </div>
    )}

    <button
      onClick={onContinue}
      className='w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-shadow'
    >
      Continue to Dashboard
    </button>
  </motion.div>
)

const WelcomePage = () => {
  const [selectedSpa, setSelectedSpa] = useState(null)
  const [referralCode, setReferralCode] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [rewardData, setRewardData] = useState(null)

  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  // Fetch active locations
  const {
    data: locationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['active-locations'],
    queryFn: locationService.getActiveLocations,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  // Check onboarding status (but don't block UI)
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: authService.getOnboardingStatus,
    enabled: !isComplete,
    staleTime: 30 * 1000, // Short cache since we're on welcome page
  })

  // Spa selection mutation with Redux update
  const spaSelectionMutation = useMutation({
    mutationFn: ({ locationId, referralCode }) =>
      authService.selectSpa(locationId, referralCode),
    onSuccess: (data) => {
      console.log('Spa selection response:', data)

      // Update Redux immediately with new spa selection
      if (data?.data?.user) {
        dispatch(
          updateProfile({
            selectedLocation: data.data.user.selectedLocation,
            profileCompleted: data.data.user.profileCompleted,
            points: data.data.user.points,
            hasSelectedSpa: true, // Explicitly set this
          })
        )
      }

      const rewards = data?.data?.rewards || null
      setRewardData(rewards)
      setIsComplete(true)
      toast.success('Spa selected successfully!')

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries(['onboarding-status'])
      queryClient.invalidateQueries(['current-user'])
    },
    onError: (error) => {
      console.error('Spa selection error:', error)
      toast.error(error.response?.data?.message || 'Failed to select spa')
      setSelectedSpa(null)
    },
  })

  // Transform API data
  const spas = React.useMemo(() => {
    if (!locationsData?.data?.locations) return []
    return locationsData.data.locations
      .filter((location) => location.name?.trim())
      .map((location) => ({
        locationId: location.locationId,
        name: location.name,
        address: location.address || 'Address not available',
        phone: location.phone || '',
      }))
  }, [locationsData])

  // Redirect if spa already selected (but don't block render)
  useEffect(() => {
    if (onboardingData?.data?.onboardingStatus?.hasSelectedSpa && !isComplete) {
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 100)
    }
  }, [onboardingData, isComplete])

  const handleSpaSelect = async (spa) => {
    setSelectedSpa(spa)
    await spaSelectionMutation.mutateAsync({
      locationId: spa.locationId,
      referralCode: referralCode || null,
    })
  }

  const handleContinue = () => {
    // Ensure all caches are updated
    queryClient.invalidateQueries(['onboarding-status'])
    queryClient.invalidateQueries(['current-user'])

    // Small delay to ensure Redux is updated
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 100)
  }

  const handleReferralSubmit = (code) => {
    setReferralCode(code)
    toast.success('Referral code applied!')
  }

  if (error?.response?.status === 401) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
        <div className='max-w-sm mx-auto text-center bg-white p-6 rounded-xl shadow-sm'>
          <h2 className='text-lg font-semibold text-red-600 mb-2'>
            Authentication Required
          </h2>
          <p className='text-sm text-gray-600 mb-4'>
            Please log in to continue.
          </p>
          <button
            onClick={() => (window.location.href = '/auth')}
            className='w-full py-3 bg-blue-500 text-white font-medium rounded-lg'
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 px-4 py-6'>
      <div className='max-w-md mx-auto'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold mb-3'>
            Welcome to{' '}
            <span className='bg-gradient-to-r from-pink-500 to-rose-600 bg-clip-text text-transparent'>
              RadiantAI
            </span>
          </h1>
          <p className='text-gray-600 mb-4'>
            Intelligent automation for beauty clinics
          </p>
          <div className='flex items-center justify-center space-x-4 text-sm text-gray-500'>
            <div className='flex items-center space-x-2'>
              <div className='w-2 h-2 bg-pink-500 rounded-full' />
              <span>AI-Powered</span>
            </div>
            <div className='flex items-center space-x-2'>
              <Heart className='w-4 h-4 text-pink-500' />
              <span>Human Touch</span>
            </div>
          </div>
        </div>

        {isComplete ? (
          <SuccessMessage
            selectedSpa={selectedSpa}
            rewardData={rewardData}
            onContinue={handleContinue}
          />
        ) : (
          <>
            <ReferralInput onSubmit={handleReferralSubmit} />

            <div className='mb-8'>
              <h2 className='text-xl font-semibold text-gray-800 mb-4 text-center'>
                Choose Your Spa
              </h2>
              <SpaDropdown
                spas={spas}
                onSelect={handleSpaSelect}
                isLoading={isLoading || spaSelectionMutation.isLoading}
                error={error}
              />
            </div>
          </>
        )}

        <div className='text-center pt-4'>
          <p className='text-sm text-gray-400 flex items-center justify-center space-x-2'>
            <Sparkles className='w-4 h-4' />
            <span>AI technology meets human touch</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
