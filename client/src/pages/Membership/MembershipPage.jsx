import MembershipCard from '@/components/Bookings/MembershipCard'
import { useBranding } from '@/context/BrandingContext'
import { useActiveServices } from '@/hooks/useServices'
import { locationService } from '@/services/locationService'
import { useQuery } from '@tanstack/react-query'
import { Crown } from 'lucide-react'
import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout/Layout'

const MembershipPage = () => {
    const navigate = useNavigate()
    const { currentUser } = useSelector((state) => state.user)
    const { branding, locationId } = useBranding()
    const brandColor = branding?.themeColor || '#ec4899'
    const brandColorDark = (() => {
        const cleaned = brandColor.replace('#', '')
        if (cleaned.length !== 6) return '#b0164e'
        const num = parseInt(cleaned, 16)
        const r = Math.max(0, ((num >> 16) & 255) - 24)
        const g = Math.max(0, ((num >> 8) & 255) - 24)
        const b = Math.max(0, (num & 255) - 24)
        return `#${r.toString(16).padStart(2, '0')}${g
            .toString(16)
            .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    })()

    const { services, isLoading } = useActiveServices({ locationId })

    // Fetch location data if needed (primarily for manager/admin to get latest edits)
    const { data: locationData, isLoading: isLoadingLocation } = useQuery({
        queryKey: ['my-location'],
        queryFn: () => locationService.getMyLocation(),
        enabled: !!(currentUser?.role === 'spa' || currentUser?.role === 'admin' || currentUser?.role === 'super-admin'),
    })

    // Use branding membership as primary source for customers, or locationData for owners
    const locationMembership = branding?.membership || locationData?.data?.location?.membership

    const membershipServices = useMemo(() => {
        return (services || []).filter(
            (s) =>
                s.name.toLowerCase().includes('membership') ||
                s.categoryName?.toLowerCase().includes('membership') ||
                s.description?.toLowerCase().includes('subscription')
        )
    }, [services])

    const withSpaParam = (path) =>
        locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path

    const onServiceSelect = (service) => {
        navigate(withSpaParam(`/services/${service._id}`))
    }

    return (
        <Layout>
            <div
                className='min-h-screen bg-[#FAFAFA] pb-20'
                style={{
                    ['--brand-primary']: brandColor,
                    ['--brand-primary-dark']: brandColorDark,
                }}
            >
                <div className='max-w-[1600px] mx-auto px-4 py-8 flex flex-col items-center justify-start min-h-[80vh]'>
                    <div className="text-center mb-10 mt-4 animate-fadeIn">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200 mb-4">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Tier Status</span>
                        </div>
                        
                        <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight italic">
                            You are a <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-900">Free Member</span>
                        </h2>
                        
                        <p className="text-gray-500 font-bold uppercase text-[11px] tracking-[0.15em]">
                            Join a premium plan below to unlock everything
                        </p>
                    </div>

                    <div className="w-full relative z-10 animate-fadeIn">
                        {isLoading || isLoadingLocation ? (
                            <div className="w-full h-80 bg-gray-200 rounded-[2.5rem] animate-pulse max-w-md mx-auto" />
                        ) : (
                            <div className="grid grid-cols-1 gap-6 px-2 w-full max-w-7xl mx-auto">
                                {/* Show location membership if it exists */}
                                {locationMembership && (
                                    <MembershipCard 
                                        service={{
                                            _id: 'location-membership',
                                            name: locationMembership.name,
                                            description: locationMembership.description,
                                            basePrice: locationMembership.price,
                                            duration: 0,
                                            categoryId: { name: 'Membership' }
                                        }} 
                                        membership={locationMembership}
                                        onSelect={onServiceSelect} 
                                    />
                                )}
                                {/* Show membership services from catalog */}
                                {membershipServices.map(service => (
                                    <MembershipCard 
                                        key={service._id} 
                                        service={service} 
                                        membership={locationMembership}
                                        onSelect={onServiceSelect} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </Layout>
    )
}

export default MembershipPage

