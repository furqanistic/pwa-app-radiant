import { useBranding } from '@/context/BrandingContext'
import { authService } from '@/services/authService'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    BadgeCent,
    Calculator,
    Crown,
    Mail,
    Phone,
    Shield,
    User,
    X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const adjustHex = (hex, amount) => {
  const cleaned = (hex || '').replace('#', '')
  if (cleaned.length !== 6) return '#be185d'
  const num = parseInt(cleaned, 16)
  const clamp = (value) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0xff) + amount)
  const b = clamp((num & 0xff) + amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const EditUserForm = ({ isOpen, onClose, user }) => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)
  const queryClient = useQueryClient()

  const isSuperAdmin = currentUser?.role === 'super-admin'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
      })
      setErrors({})
    }
  }, [user])

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }) => authService.updateUser(userId, data),
    onSuccess: () => {
      toast.success('User updated successfully')
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update user')
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, newRole }) =>
      authService.changeUserRole(userId, newRole, 'Updated via Contacts'),
    onSuccess: () => {
      toast.success('User role updated')
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change role')
    },
  })

  const availableRoles = isSuperAdmin
    ? [
        { value: 'super-admin', label: 'Super Admin' },
        { value: 'admin', label: 'Admin' },
        { value: 'spa', label: 'Spa' },
        { value: 'user', label: 'User' },
      ]
    : []

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Invalid email address'
    }
    if (formData.phone && !formData.phone.startsWith('+')) {
      newErrors.phone = 'Must start with country code, e.g. +1'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const hasChanges = () => {
    if (!user) return false
    return (
      formData.name !== (user.name || '') ||
      formData.email !== (user.email || '') ||
      formData.phone !== (user.phone || '') ||
      formData.role !== (user.role || '')
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate() || !user) return

    const userId = user._id || user.userId || user.id
    if (!userId) {
      toast.error('Cannot identify user')
      return
    }

    const profileChanged =
      formData.name !== (user.name || '') ||
      formData.email !== (user.email || '') ||
      formData.phone !== (user.phone || '')
    const roleChanged = formData.role !== (user.role || '')

    if (profileChanged) {
      await updateMutation.mutateAsync({
        userId,
        data: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
      })
    }

    if (roleChanged) {
      await roleMutation.mutateAsync({
        userId,
        newRole: formData.role,
      })
    }

    if (!profileChanged && !roleChanged) {
      toast.info('No changes made')
      onClose()
    }
  }

  const isPending = updateMutation.isPending || roleMutation.isPending
  const userId = user?._id || user?.userId || user?.id
  const cantEditSelf = userId === (currentUser?._id || currentUser?.id)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className='p-0 overflow-hidden max-h-[92vh] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 flex flex-col border-0'
      >
        <div className='h-0.5 w-full shrink-0' style={{ background: brandColor }} />

        <div className='flex items-center justify-between px-5 pt-4 pb-3 shrink-0'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ backgroundColor: `${brandColor}14` }}>
              <User className='w-4 h-4' style={{ color: brandColor }} />
            </div>
            <DialogTitle className='text-sm font-semibold text-slate-900'>
              Edit User
            </DialogTitle>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-lg hover:bg-slate-100 transition-colors'
            type='button'
          >
            <X className='w-4 h-4 text-slate-400' />
          </button>
        </div>

        <div className='px-5 pb-3 text-xs text-slate-500 border-b border-slate-100 shrink-0'>
          {user?.name || user?.email} — {user?.role}
        </div>

        <form onSubmit={handleSubmit} className='flex-1 overflow-y-auto px-5 py-4 space-y-5'>
          {cantEditSelf && (
            <div className='rounded-xl border border-amber-200 bg-amber-50 p-3'>
              <p className='text-xs font-medium text-amber-700'>
                You are editing your own account. Be careful with role changes.
              </p>
            </div>
          )}

          {/* Name */}
          <div className='space-y-1.5'>
            <Label htmlFor='edit-name' className='text-xs font-medium text-slate-700'>Full Name <span className='text-red-400'>*</span></Label>
            <div className='relative'>
              <Input
                id='edit-name'
                type='text'
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder='Enter full name...'
                className={`h-10 pl-10 text-sm rounded-xl border-slate-200 transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 ${errors.name ? 'border-red-300' : ''}`}
                disabled={isPending}
              />
              <User className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            </div>
            {errors.name && <p className='text-xs text-red-500'>{errors.name}</p>}
          </div>

          {/* Email */}
          <div className='space-y-1.5'>
            <Label htmlFor='edit-email' className='text-xs font-medium text-slate-700'>Email <span className='text-red-400'>*</span></Label>
            <div className='relative'>
              <Input
                id='edit-email'
                type='email'
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder='Enter email address...'
                className={`h-10 pl-10 text-sm rounded-xl border-slate-200 transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 ${errors.email ? 'border-red-300' : ''}`}
                disabled={isPending}
              />
              <Mail className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            </div>
            {errors.email && <p className='text-xs text-red-500'>{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className='space-y-1.5'>
            <Label htmlFor='edit-phone' className='text-xs font-medium text-slate-700'>Phone</Label>
            <div className='relative'>
              <Input
                id='edit-phone'
                type='text'
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder='+1 555 000 0000'
                className={`h-10 pl-10 text-sm rounded-xl border-slate-200 transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 ${errors.phone ? 'border-red-300' : ''}`}
                disabled={isPending}
              />
              <Phone className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            </div>
            {errors.phone && <p className='text-xs text-red-500'>{errors.phone}</p>}
          </div>

          {/* Role */}
          {isSuperAdmin && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-slate-700'>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange('role', value)}
                disabled={isPending || !isSuperAdmin}
              >
                <SelectTrigger className='h-10 rounded-xl border-slate-200 text-sm transition-shadow focus-visible:ring-2 focus-visible:ring-slate-200'>
                  <div className='flex items-center gap-2'>
                    <Shield className='w-4 h-4 text-slate-400' />
                    <SelectValue placeholder='Select role...' />
                  </div>
                </SelectTrigger>
                <SelectContent className='rounded-xl border-slate-200'>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className='flex items-center gap-2'>
                        {role.value === 'super-admin' && <Crown className='w-3.5 h-3.5 text-amber-500' />}
                        {role.value === 'admin' && <Shield className='w-3.5 h-3.5 text-blue-500' />}
                        {role.value === 'spa' && <BadgeCent className='w-3.5 h-3.5 text-slate-500' />}
                        {role.value === 'user' && <User className='w-3.5 h-3.5 text-slate-400' />}
                        <span>{role.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-slate-400'>
                {formData.role === 'super-admin' && 'Full platform access — assign carefully'}
                {formData.role === 'admin' && 'Can manage locations, users, and system settings'}
                {formData.role === 'spa' && 'Can manage users and services in their assigned location'}
                {formData.role === 'user' && 'Regular end user'}
              </p>
            </div>
          )}

          {/* Points & Credits info */}
          <div className='rounded-xl border border-slate-200 p-3.5' style={{ backgroundColor: `${brandColor}08` }}>
            <div className='flex items-start gap-2.5'>
              <Calculator className='w-4 h-4 mt-0.5 shrink-0' style={{ color: brandColor }} />
              <div>
                <h4 className='text-xs font-semibold text-slate-900 mb-0.5'>
                  Points & Credits
                </h4>
                <p className='text-xs text-slate-500'>
                  Use "Manage Points" or "Manage Credits" from the user menu to adjust balance.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isPending}
              className='rounded-xl h-10 text-sm font-medium px-5 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isPending || !hasChanges()}
              className='rounded-xl h-10 text-sm font-medium px-5 text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50'
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
            >
              {isPending ? (
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditUserForm
