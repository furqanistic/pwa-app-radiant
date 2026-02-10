// File: client/src/pages/Other/WelcomePage.jsx - SPA selector (pre-login)
import { locationService } from '@/services/locationService'
import { useQuery } from '@tanstack/react-query'
import {
    MapPin,
    Search,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const WelcomePage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

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

  const spas = useMemo(() => {
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

  const filteredSpas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return spas
    return spas.filter(
      (spa) =>
        spa.name.toLowerCase().includes(term) ||
        spa.address.toLowerCase().includes(term)
    )
  }, [spas, searchTerm])

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
            onClick={() => navigate('/auth')}
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
      <div className='max-w-2xl mx-auto'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl sm:text-4xl font-black text-gray-900 tracking-tight'>
            Choose your spa
          </h1>
          <p className='text-sm text-gray-500 mt-2'>
            Select a location to continue to login.
          </p>
        </div>

        <div className='bg-white rounded-3xl border border-gray-200/70 p-4 sm:p-6 shadow-sm'>
          <div className='relative mb-4'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              placeholder='Search by spa name or address...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm'
            />
          </div>

          {isLoading ? (
            <div className='space-y-3'>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className='h-16 bg-gray-100 rounded-2xl animate-pulse' />
              ))}
            </div>
          ) : filteredSpas.length === 0 ? (
            <div className='text-center py-10 text-sm text-gray-500'>
              No locations match your search.
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {filteredSpas.map((spa) => (
                <button
                  key={spa.locationId}
                  onClick={() => navigate(`/auth?spa=${encodeURIComponent(spa.locationId)}`)}
                  className='text-left p-4 rounded-2xl border border-gray-200/70 bg-white hover:bg-gray-50 transition-all'
                >
                  <div className='font-semibold text-gray-900 text-sm mb-1'>
                    {spa.name}
                  </div>
                  <div className='flex items-center gap-1 text-xs text-gray-500'>
                    <MapPin className='w-3 h-3' />
                    <span className='line-clamp-1'>{spa.address}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
