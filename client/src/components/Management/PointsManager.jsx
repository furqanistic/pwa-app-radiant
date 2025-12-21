// File: client/src/components/Management/PointsManager.jsx
import { authService } from '@/services/authService'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    AlertTriangle,
    Calculator,
    Check,
    Minus,
    Plus,
    Target,
    X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'

const PointsManager = ({
  isOpen,
  onClose,
  user = null, // The user whose points we're managing
}) => {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    type: 'add', // 'add', 'remove', 'set'
    amount: '',
    reason: '',
  })

  const [step, setStep] = useState(1) // Step-based flow
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevent background scroll on mobile when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Points adjustment mutation
  const adjustPointsMutation = useMutation({
    mutationFn: ({ userId, type, amount, reason }) =>
      authService.adjustUserPoints(userId, type, amount, reason),
    onSuccess: (data) => {
      toast.success('Points updated successfully!')
      queryClient.invalidateQueries(['all-users'])
      handleClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update points')
    },
  })

  const handleClose = () => {
    setFormData({
      type: 'add',
      amount: '',
      reason: '',
    })
    setStep(1)
    onClose()
  }

  const handleSubmit = async () => {
    if (
      !formData.amount ||
      isNaN(formData.amount) ||
      Number(formData.amount) <= 0
    ) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for this adjustment')
      return
    }

    await adjustPointsMutation.mutateAsync({
      userId: user._id,
      type: formData.type,
      amount: Number(formData.amount),
      reason: formData.reason.trim(),
    })
  }

  const getOperationDetails = () => {
    const currentPoints = user?.points || 0
    const amount = Number(formData.amount) || 0

    switch (formData.type) {
      case 'add':
        return {
          icon: Plus,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Add Points',
          description: `Add ${amount} points to ${user?.name}'s account`,
          newBalance: currentPoints + amount,
          operation: `${currentPoints} + ${amount} = ${currentPoints + amount}`,
        }
      case 'remove':
        return {
          icon: Minus,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Remove Points',
          description: `Remove ${amount} points from ${user?.name}'s account`,
          newBalance: Math.max(0, currentPoints - amount),
          operation: `${currentPoints} - ${amount} = ${Math.max(
            0,
            currentPoints - amount
          )}`,
        }
      case 'set':
        return {
          icon: Target,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Set Exact Points',
          description: `Set ${user?.name}'s points to exactly ${amount}`,
          newBalance: amount,
          operation: `Set to ${amount} points`,
        }
      default:
        return {
          icon: Calculator,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Adjust Points',
          description: '',
          newBalance: currentPoints,
          operation: '',
        }
    }
  }

  const operationTypes = [
    {
      value: 'add',
      label: 'Add Points',
      icon: Plus,
      description: "Increase user's point balance",
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      value: 'remove',
      label: 'Remove Points',
      icon: Minus,
      description: "Decrease user's point balance",
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      value: 'set',
      label: 'Set Exact Amount',
      icon: Target,
      description: 'Set specific point balance',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  ]

  const renderStepIndicator = () => (
    <div className='flex justify-center mb-6'>
      <div className='flex items-center space-x-2'>
        {[1, 2, 3].map((stepNum) => (
          <React.Fragment key={stepNum}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                stepNum <= step
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {stepNum < step ? <Check className='w-4 h-4' /> : stepNum}
            </div>
            {stepNum < 3 && (
              <div
                className={`w-8 h-1 rounded-full transition-colors ${
                  stepNum < step ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )

  const renderOperationTypeStep = () => (
    <div className='space-y-6'>
      <div className='text-center'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          Select Operation
        </h3>
        <p className='text-gray-600'>
          Choose how you want to adjust {user?.name}'s points
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4'>
        {operationTypes.map((operation) => (
          <button
            key={operation.value}
            type='button'
            onClick={() =>
              setFormData((prev) => ({ ...prev, type: operation.value }))
            }
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              formData.type === operation.value
                ? `${operation.borderColor} ${operation.bgColor}`
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className='flex items-center'>
              <operation.icon
                className={`w-6 h-6 mr-3 ${
                  formData.type === operation.value
                    ? operation.color
                    : 'text-gray-400'
                }`}
              />
              <div>
                <div
                  className={`font-medium ${
                    formData.type === operation.value
                      ? operation.color.replace('text-', 'text-')
                      : 'text-gray-900'
                  }`}
                >
                  {operation.label}
                </div>
                <div
                  className={`text-sm ${
                    formData.type === operation.value
                      ? operation.color.replace('600', '700')
                      : 'text-gray-500'
                  }`}
                >
                  {operation.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
        <div className='flex items-start'>
          <Calculator className='w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0' />
          <div>
            <div className='font-medium text-blue-900'>Current Balance</div>
            <div className='text-lg font-bold text-blue-700'>
              {user?.points || 0} points
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAmountStep = () => {
    const operation = getOperationDetails()

    return (
      <div className='space-y-6'>
        <div className='text-center'>
          <div
            className={`w-12 h-12 ${operation.bgColor} ${operation.borderColor} border-2 rounded-full flex items-center justify-center mx-auto mb-3`}
          >
            <operation.icon className={`w-6 h-6 ${operation.color}`} />
          </div>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            {operation.title}
          </h3>
          <p className='text-gray-600'>
            Enter the amount of points to{' '}
            {formData.type === 'set' ? 'set' : formData.type}
          </p>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              {formData.type === 'set' ? 'Set Points To' : 'Point Amount'} *
            </label>
            <input
              type='number'
              min='0'
              step='1'
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder={
                formData.type === 'set'
                  ? 'Enter exact amount'
                  : 'Enter amount to ' + formData.type
              }
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-center text-lg font-medium'
            />
          </div>

          {formData.amount &&
            !isNaN(formData.amount) &&
            Number(formData.amount) > 0 && (
              <div
                className={`${operation.bgColor} ${operation.borderColor} border rounded-lg p-4`}
              >
                <div className='text-center'>
                  <div className='text-sm text-gray-600 mb-1'>Calculation</div>
                  <div className={`text-lg font-medium ${operation.color}`}>
                    {operation.operation}
                  </div>
                  <div className='mt-2 text-sm text-gray-600'>
                    New Balance:{' '}
                    <span className='font-semibold'>
                      {operation.newBalance} points
                    </span>
                  </div>
                </div>
              </div>
            )}

          {formData.type === 'remove' &&
            Number(formData.amount) > (user?.points || 0) && (
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                <div className='flex'>
                  <AlertTriangle className='w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5' />
                  <div>
                    <div className='font-medium text-yellow-800'>
                      Balance Warning
                    </div>
                    <div className='text-sm text-yellow-700'>
                      Amount exceeds current balance. Points will be set to 0.
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    )
  }

  const renderReasonStep = () => {
    const operation = getOperationDetails()

    return (
      <div className='space-y-6'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Confirm Adjustment
          </h3>
          <p className='text-gray-600'>
            Provide a reason for this points adjustment
          </p>
        </div>

        {/* Summary Card */}
        <div
          className={`${operation.bgColor} ${operation.borderColor} border-2 rounded-xl p-4`}
        >
          <div className='flex items-center mb-3'>
            <operation.icon className={`w-6 h-6 ${operation.color} mr-3`} />
            <div>
              <div className={`font-semibold ${operation.color}`}>
                {operation.title}
              </div>
              <div className='text-sm text-gray-600'>
                {operation.description}
              </div>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4 text-center'>
            <div>
              <div className='text-sm text-gray-600'>Current</div>
              <div className='text-lg font-bold text-gray-900'>
                {user?.points || 0}
              </div>
            </div>
            <div>
              <div className='text-sm text-gray-600'>New Balance</div>
              <div className={`text-lg font-bold ${operation.color}`}>
                {operation.newBalance}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Reason for Adjustment *
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder='Enter the reason for this points adjustment...'
            rows={3}
            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base'
            required
          />
          <div className='mt-1 text-xs text-gray-500'>
            This will be logged and sent to the user as a notification
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen || !user) return null

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center'>
      <div className='bg-white w-full max-w-lg sm:rounded-xl max-h-[90vh] overflow-hidden flex flex-col sm:max-h-[85vh] rounded-t-3xl sm:rounded-t-xl'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0'>
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
              <Calculator className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-gray-900'>
                Manage Points
              </h2>
              <p className='text-sm text-gray-600'>User: {user.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto px-6 py-6'>
          {renderStepIndicator()}

          {step === 1 && renderOperationTypeStep()}
          {step === 2 && renderAmountStep()}
          {step === 3 && renderReasonStep()}
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0'>
          {step > 1 && (
            <Button
              variant='outline'
              onClick={() => setStep(step - 1)}
              disabled={adjustPointsMutation.isLoading}
              className='flex-1 h-12'
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                step === 2 &&
                (!formData.amount ||
                  isNaN(formData.amount) ||
                  Number(formData.amount) <= 0)
              }
              className='flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={
                adjustPointsMutation.isLoading ||
                !formData.reason.trim() ||
                !formData.amount ||
                isNaN(formData.amount) ||
                Number(formData.amount) <= 0
              }
              className='flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            >
              {adjustPointsMutation.isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' />
                  Processing...
                </>
              ) : (
                <>
                  <Check className='w-4 h-4 mr-2' />
                  Confirm Adjustment
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PointsManager
