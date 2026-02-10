import MembershipCard from '@/components/Bookings/MembershipCard'
import { useBranding } from '@/context/BrandingContext'
import { useActiveServices } from '@/hooks/useServices'
import { Crown } from 'lucide-react'
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout/Layout'

const MembershipPage = () => {
    const navigate = useNavigate()
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

    const { services, isLoading } = useActiveServices()

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

                    <div className="relative w-full max-w-2xl text-center mb-12 mt-8">
                        {/* Decorative Background for Header */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[color:var(--brand-primary)/0.1] rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 bg-white rounded-[2.5rem] border border-gray-200/70 p-8 shadow-xl shadow-gray-200/50">
                            
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <Crown size={32} strokeWidth={1.5} />
                            </div>

                            <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
                                Not a Member
                            </h1>
                            
                            <p className="text-gray-500 font-medium leading-relaxed max-w-md mx-auto">
                                You are currently not subscribed to any premium plan. Unlock exclusive perks and discounts today!
                            </p>
                        </div>
                    </div>

                    <div className="w-full relative z-10 animate-fadeIn">
                        {isLoading ? (
                            <div className="w-full h-80 bg-gray-200 rounded-[2.5rem] animate-pulse max-w-md mx-auto" />
                        ) : membershipServices.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 px-2 w-full max-w-7xl mx-auto">
                                {membershipServices.map(service => (
                                    <MembershipCard 
                                        key={service._id} 
                                        service={service} 
                                        onSelect={onServiceSelect} 
                                    />
                                ))}
                            </div>
                        ) : (
                            // Demo Card if no real memberships found
                            <div className="w-full max-w-7xl mx-auto">
                                <MembershipCard 
                                    service={{
                                        _id: 'demo-vip',
                                        name: 'Gold Glow Membership',
                                        description: 'Unlock the ultimate glow up with our exclusive VIP tier.',
                                        basePrice: 99,
                                        duration: 0,
                                        image: 'https://images.unsplash.com/photo-1596178065248-7241d9a05fec?auto=format&fit=crop&q=80&w=800', 
                                        categoryId: { name: 'Membership' }
                                    }} 
                                    onSelect={onServiceSelect} 
                                />
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </Layout>
    )
}

export default MembershipPage
