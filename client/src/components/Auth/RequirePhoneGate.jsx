import { useBranding } from '@/context/BrandingContext'
import { logout, selectCurrentUser, updateProfile } from '@/redux/userSlice'
import { isValidProfilePhone, PHONE_FORMAT_ERROR, PHONE_FORMAT_HINT } from '@/lib/phoneValidation'
import { authService } from '@/services/authService'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Phone } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const userNeedsPhone = (user) => {
  if (!user || user.role === 'super-admin') return false
  return !`${user.phone || ''}`.trim()
}

const RequirePhoneGate = () => {
  const currentUser = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const open = useMemo(() => userNeedsPhone(currentUser), [currentUser])

  const validate = (value) => {
    const trimmed = `${value || ''}`.trim()
    if (!trimmed) return 'Phone number is required.'
    if (!isValidProfilePhone(trimmed)) return PHONE_FORMAT_ERROR
    return ''
  }

  const handleChange = (e) => {
    setPhone(e.target.value)
    if (phoneError) setPhoneError(validate(e.target.value))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = `${phone || ''}`.trim()
      const err = validate(trimmed)
      if (err) {
        setPhoneError(err)
        throw new Error(err)
      }
      const res = await authService.updateUser(currentUser._id, { phone: trimmed })
      return res?.data?.user ?? null
    },
    onSuccess: (updatedUser) => {
      if (updatedUser && typeof updatedUser === 'object') {
        dispatch(updateProfile(updatedUser))
      } else {
        dispatch(updateProfile({ phone: `${phone || ''}`.trim() }))
      }
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      toast.success('Phone number saved')
      setPhone('')
      setPhoneError('')
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Could not save phone number'
      setPhoneError(msg)
    },
  })

  const buildSpaPath = (path) => {
    const spa = new URLSearchParams(location.search).get('spa')
    return spa ? `${path}?spa=${encodeURIComponent(spa)}` : path
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate(buildSpaPath('/auth'))
  }

  if (!open) return null

  const hasError = Boolean(phoneError)

  return (
    <div
      className='fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
      aria-modal='true'
      role='dialog'
      aria-labelledby='require-phone-title'
    >
      <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100'>
        <div
          className='flex h-12 w-12 items-center justify-center rounded-xl text-white mb-4'
          style={{ backgroundColor: brandColor }}
        >
          <Phone className='h-6 w-6' />
        </div>

        <h2 id='require-phone-title' className='text-xl font-bold text-gray-900 tracking-tight'>
          Add your number
        </h2>
        <p className='mt-2 text-sm text-gray-600 leading-relaxed'>
          Completes your profile. Save to continue.
        </p>

        <div className='mt-5'>
          <label className='block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5'>
            Mobile
          </label>
          <input
            type='tel'
            inputMode='tel'
            autoComplete='tel'
            value={phone}
            onChange={handleChange}
            placeholder='+1 555 000 0000'
            className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition focus:ring-2 ${
              hasError
                ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                : 'border-gray-200 focus:border-gray-400 focus:ring-gray-100'
            }`}
            disabled={saveMutation.isPending}
          />

          {hasError ? (
            <p className='mt-2 flex items-start gap-1.5 text-xs font-medium text-red-600'>
              <AlertCircle className='h-3.5 w-3.5 mt-0.5 shrink-0' />
              {phoneError}
            </p>
          ) : (
            <p className='mt-2 text-xs text-gray-400'>{PHONE_FORMAT_HINT}</p>
          )}
        </div>

        <button
          type='button'
          disabled={saveMutation.isPending || !phone.trim()}
          onClick={() => saveMutation.mutate()}
          className='mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2'
          style={{ backgroundColor: brandColor }}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              Saving…
            </>
          ) : (
            'Save and continue'
          )}
        </button>

        <p className='mt-4 text-center text-xs text-gray-500'>
          Wrong account?{' '}
          <button
            type='button'
            onClick={handleLogout}
            className='font-semibold text-gray-800 underline underline-offset-2 hover:text-gray-950'
          >
            Log out
          </button>
        </p>
      </div>
    </div>
  )
}

export default RequirePhoneGate
