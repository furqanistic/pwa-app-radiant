// File: client/src/components/Management/PointsManager.jsx
import { useBranding } from '@/context/BrandingContext'
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
  locationId = '',
}) => {
  const queryClient = useQueryClient()
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = (() => {
    const cleaned = `${brandColor}`.replace('#', '')
    if (cleaned.length !== 6) return '#be185d'
    const parsed = parseInt(cleaned, 16)
    const clamp = (value) => Math.max(0, Math.min(255, value))
    const r = clamp(((parsed >> 16) & 255) - 24)
    const g = clamp(((parsed >> 8) & 255) - 24)
    const b = clamp((parsed & 255) - 24)
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })()

  const [formData, setFormData] = useState({
    type: 'add', // 'add', 'remove', 'set'
    amount: '',
    reason: '',
  })

  const [step, setStep] = useState(1) // Step-based flow

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
    mutationFn: ({ userId, type, amount, reason, locationId }) =>
      authService.adjustUserPoints(userId, type, amount, reason, locationId),
    onSuccess: () => {
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
      locationId,
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
    <div className='flex justify-center mb-5'>
      <div className='flex items-center gap-2'>
        {[1, 2, 3].map((stepNum) => (
          <React.Fragment key={stepNum}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                stepNum <= step
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
              style={stepNum <= step ? { backgroundColor: brandColor } : undefined}
            >
              {stepNum < step ? <Check className='w-3.5 h-3.5' /> : stepNum}
            </div>
            {stepNum < 3 && (
              <div
                className={`w-6 h-0.5 rounded-full transition-colors ${
                  stepNum < step ? '' : 'bg-slate-100'
                }`}
                style={stepNum < step ? { backgroundColor: brandColor } : undefined}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )

  const renderOperationTypeStep = () => (
    <div className='space-y-4'>
      <div>
        <h3 className='text-sm font-semibold text-slate-900 mb-1'>Select Operation</h3>
        <p className='text-xs text-slate-500'>Choose how to adjust {user?.name}'s points</p>
      </div>
      <div className='space-y-2'>
        {operationTypes.map((operation) => (
          <button
            key={operation.value}
            type='button'
            onClick={() => setFormData((prev) => ({ ...prev, type: operation.value }))}
            className={`w-full p-3.5 rounded-xl border transition-all text-left ${
              formData.type === operation.value
                ? `${operation.borderColor} ${operation.bgColor}`
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className='flex items-center gap-3'>
              <operation.icon className={`w-5 h-5 ${formData.type === operation.value ? operation.color : 'text-slate-400'}`} />
              <div>
                <div className={`text-sm font-medium ${formData.type === operation.value ? operation.color : 'text-slate-900'}`}>
                  {operation.label}
                </div>
                <div className={`text-xs ${formData.type === operation.value ? operation.color.replace('600', '700') : 'text-slate-500'}`}>
                  {operation.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className='rounded-xl border border-slate-200 p-3.5' style={{ backgroundColor: `${brandColor}0a` }}>
        <div className='flex items-center gap-3'>
          <Calculator className='w-4 h-4 shrink-0' style={{ color: brandColor }} />
          <div>
            <div className='text-xs text-slate-500'>Current Balance</div>
            <div className='text-sm font-bold text-slate-900'>{user?.points || 0} points</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAmountStep = () => {
    const operation = getOperationDetails()

    return (
      <div className='space-y-5'>
        <div className='text-center'>
          <div className={`w-10 h-10 ${operation.bgColor} ${operation.borderColor} border-2 rounded-xl flex items-center justify-center mx-auto mb-3`}>
            <operation.icon className={`w-5 h-5 ${operation.color}`} />
          </div>
          <h3 className='text-sm font-semibold text-slate-900 mb-1'>{operation.title}</h3>
          <p className='text-xs text-slate-500'>
            Enter the amount of points to {formData.type === 'set' ? 'set' : formData.type}
          </p>
        </div>

        <div className='space-y-3'>
          <div>
            <label className='block text-xs font-medium text-slate-700 mb-1.5'>
              {formData.type === 'set' ? 'Set Points To' : 'Point Amount'} *
            </label>
            <input
              type='number'
              min='0'
              step='1'
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder={formData.type === 'set' ? 'Enter exact amount' : 'Enter amount to ' + formData.type}
              className='w-full h-10 px-4 text-sm text-center font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 transition-shadow placeholder:text-slate-400'
            />
          </div>

          {formData.amount && !isNaN(formData.amount) && Number(formData.amount) > 0 && (
            <div className={`${operation.bgColor} ${operation.borderColor} border rounded-xl p-3.5`}>
              <div className='text-center'>
                <div className='text-xs text-slate-500 mb-1'>New balance</div>
                <div className={`text-sm font-semibold ${operation.color}`}>{operation.newBalance} points</div>
              </div>
            </div>
          )}

          {formData.type === 'remove' && Number(formData.amount) > (user?.points || 0) && (
            <div className='flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3'>
              <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
              <div>
                <div className='text-xs font-semibold text-amber-800'>Balance Warning</div>
                <div className='text-xs text-amber-700'>Amount exceeds current balance. Points will be set to 0.</div>
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
      <div className='space-y-5'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold text-slate-900 mb-1'>Confirm Adjustment</h3>
          <p className='text-xs text-slate-500'>Provide a reason for this points adjustment</p>
        </div>

        <div className={`${operation.bgColor} ${operation.borderColor} border rounded-xl p-4`}>
          <div className='flex items-center gap-3 mb-3'>
            <operation.icon className={`w-5 h-5 ${operation.color} shrink-0`} />
            <div>
              <div className={`text-sm font-semibold ${operation.color}`}>{operation.title}</div>
              <div className='text-xs text-slate-500'>{operation.description}</div>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3 text-center'>
            <div className='rounded-lg bg-white/60 p-2.5'>
              <div className='text-xs text-slate-500'>Current</div>
              <div className='text-sm font-bold text-slate-900'>{user?.points || 0}</div>
            </div>
            <div className='rounded-lg bg-white/60 p-2.5'>
              <div className='text-xs text-slate-500'>New Balance</div>
              <div className={`text-sm font-bold ${operation.color}`}>{operation.newBalance}</div>
            </div>
          </div>
        </div>

        <div>
          <label className='block text-xs font-medium text-slate-700 mb-1.5'>Reason *</label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder='Reason for this points adjustment...'
            rows={2}
            className='w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 transition-shadow resize-none placeholder:text-slate-400'
            required
          />
          <p className='mt-1 text-xs text-slate-400'>Logged and sent to the user as a notification</p>
        </div>
      </div>
    )
  }

  if (!isOpen || !user) return null

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center'>
      <div className='bg-white w-full max-w-lg sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl shadow-xl'>
        {/* Brand accent bar */}
        <div className='h-0.5 w-full shrink-0' style={{ background: brandColor }} />

        {/* Header */}
        <div className='flex items-center justify-between px-5 pt-4 pb-3 shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ backgroundColor: `${brandColor}14` }}>
              <Calculator className='w-4 h-4' style={{ color: brandColor }} />
            </div>
            <div>
              <h2 className='text-sm font-semibold text-slate-900'>Manage Points</h2>
              <p className='text-xs text-slate-500'>{user.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className='p-1.5 rounded-lg hover:bg-slate-100 transition-colors'
          >
            <X className='w-4 h-4 text-slate-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto px-5 py-4'>
          {renderStepIndicator()}
          {step === 1 && renderOperationTypeStep()}
          {step === 2 && renderAmountStep()}
          {step === 3 && renderReasonStep()}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-100 shrink-0'>
          {step > 1 && (
            <Button
              variant='outline'
              onClick={() => setStep(step - 1)}
              disabled={adjustPointsMutation.isLoading}
              className='rounded-xl h-10 text-sm font-medium px-5 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors'
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
              className='rounded-xl h-10 text-sm font-medium px-5 text-white transition-all hover:opacity-90 active:scale-[0.98]'
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
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
              className='rounded-xl h-10 text-sm font-medium px-5 text-white transition-all hover:opacity-90 active:scale-[0.98]'
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
            >
              {adjustPointsMutation.isLoading ? (
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Processing...
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <Check className='w-4 h-4' />
                  Confirm
                </div>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PointsManager
