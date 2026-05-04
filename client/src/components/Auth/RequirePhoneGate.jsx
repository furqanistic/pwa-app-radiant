import { useBranding } from '@/context/BrandingContext'
import { logout, selectCurrentUser, updateProfile } from '@/redux/userSlice'
import { isValidProfilePhone } from '@/lib/phoneValidation'
import { authService } from '@/services/authService'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Phone } from 'lucide-react'
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

  const open = useMemo(() => userNeedsPhone(currentUser), [currentUser])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = `${phone || ''}`.trim()
      if (!isValidProfilePhone(trimmed)) {
        throw new Error('Enter a valid phone number (at least 8 digits).')
      }
      const res = await authService.updateUser(currentUser._id, {
        phone: trimmed,
      })
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
    },
    onError: (err) => {
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        'Could not save phone number'
      toast.error(msg)
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="require-phone-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white mb-4" style={{ backgroundColor: brandColor }}>
            <Phone className="h-6 w-6" />
          </div>
          <h2 id="require-phone-title" className="text-xl font-bold text-gray-900 tracking-tight">
            Add your phone number
          </h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            A phone number is required on your account for SMS notifications (for example check-in
            messages) and to reach you about your bookings. You cannot continue until you add one.
          </p>

          <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-gray-500">
            Mobile number
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition"
            disabled={saveMutation.isPending}
          />

          <button
            type="button"
            disabled={saveMutation.isPending || !`${phone}`.trim()}
            onClick={() => saveMutation.mutate()}
            className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: brandColor }}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save and continue'
            )}
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            Wrong account?{' '}
            <button
              type="button"
              onClick={handleLogout}
              className="font-semibold text-gray-800 underline underline-offset-2 hover:text-gray-950"
            >
              Log out
            </button>
          </p>
      </div>
    </div>
  )
}

export default RequirePhoneGate
