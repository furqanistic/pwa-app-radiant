// File: client/src/pages/Referral/ReferralPage.jsx - PWA OPTIMIZED & PINK THEME
import {
    useGenerateMyReferralCode,
    useReferralStatsWithComputedData,
} from '@/hooks/useReferral'
import { motion } from 'framer-motion'
import {
    Check,
    Copy,
    Facebook,
    Gift,
    Link2,
    Loader2,
    Mail,
    MessageSquare,
    Share2,
    Sparkles,
    Target,
    User,
    Zap,
} from 'lucide-react'
import React, { useState } from 'react'
import Layout from '../Layout/Layout'

// Loading Skeleton
const ReferralSkeleton = () => (
    <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-4 space-y-4 max-w-7xl mx-auto'>
            <div className='h-40 rounded-3xl bg-white/50 animate-pulse w-full' />
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6'>
                <div className='md:col-span-2 h-64 rounded-3xl bg-white/50 animate-pulse' />
                <div className='h-64 rounded-3xl bg-white/50 animate-pulse' />
            </div>
        </div>
    </Layout>
)

// Error State
const ErrorState = ({ error, retry }) => (
    <Layout>
        <div className='min-h-screen grid place-items-center bg-gradient-to-br from-pink-50 to-rose-50 p-4'>
            <div className='text-center p-6 bg-white rounded-3xl shadow-xl max-w-sm w-full border border-pink-100'>
                <div className='w-14 h-14 bg-pink-50 rounded-2xl grid place-items-center mx-auto mb-4 text-pink-500'>
                    <Target size={28} />
                </div>
                <h2 className='text-lg font-bold text-gray-900 mb-2'>Oops!</h2>
                <p className='text-gray-500 text-sm mb-6'>{error?.message || 'Something went wrong'}</p>
                {retry && (
                    <button onClick={retry} className='w-full py-3 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600 transition-colors text-sm'>
                        Try Again
                    </button>
                )}
            </div>
        </div>
    </Layout>
)

// Main Component
const ReferralPage = () => {
    const [copied, setCopied] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)

    const {
        data: computedStats,
        isLoading: statsLoading,
        error: statsError,
        refetch: refetchStats,
    } = useReferralStatsWithComputedData()

    const generateCodeMutation = useGenerateMyReferralCode({
        onSuccess: () => refetchStats(),
    })

    if (statsLoading) return <ReferralSkeleton />
    if (statsError) return <ErrorState error={statsError} retry={refetchStats} />

    const {
        referralCode,
        totalReferrals,
        currentTier = 'bronze',
        shareUrl,
        nextTierProgress,
    } = computedStats || {}

    const copyToClipboard = async (text, setter) => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            setter(true)
            setTimeout(() => setter(false), 2000)
        } catch (err) {
            console.error('Failed to copy works', err)
        }
    }

    const handleShare = (platform) => {
        if (!shareUrl) return
        const text = 'Join me on RadiantAI and start your beauty transformation!'
        const urls = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`,
            email: `mailto:?subject=${encodeURIComponent('Join RadiantAI with me!')}&body=${encodeURIComponent(text + '\n\n' + shareUrl)}`,
        }
        if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=400')
    }

    const tierColors = {
        bronze: 'from-amber-600 to-orange-400',
        silver: 'from-gray-400 to-gray-200', 
        gold: 'from-yellow-400 to-amber-500',
        platinum: 'from-pink-500 to-rose-400', 
    }
    
    const activeGradient = tierColors[currentTier?.toLowerCase()] || tierColors.bronze

    return (
        <Layout>
            <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 pb-20 md:pb-12'>
                <div className='max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8'>
                    
                    {/* Compact Header Section */}
                    <div className='relative overflow-hidden rounded-3xl md:rounded-[2.5rem] bg-gradient-to-r from-pink-600 via-rose-500 to-pink-700 text-white p-5 md:p-12 mb-4 md:mb-8 shadow-xl shadow-pink-500/20'>
                        <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-10 mix-blend-overlay' />
                        
                        <div className='relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6'>
                            <div className='text-center md:text-left space-y-3 max-w-xl w-full'>
                                <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] md:text-xs font-semibold tracking-wider uppercase mx-auto md:mx-0'>
                                    <Sparkles size={10} className='text-yellow-300' />
                                    Referral Program
                                </div>
                                <h1 className='text-3xl md:text-5xl font-black tracking-tight leading-tight'>
                                    Share the <span className='text-pink-100'>Magic</span>
                                </h1>
                                <p className='text-sm md:text-lg text-white/90 font-medium leading-relaxed max-w-xs mx-auto md:mx-0'>
                                    Invite friends and unlock exclusive rewards instantly.
                                </p>
                            </div>
                            
                            {/* Stats Pills - Compact Mobile Grid */}
                            <div className='grid grid-cols-2 gap-3 w-full md:w-auto'>
                                <div className='p-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-center md:min-w-[100px]'>
                                    <div className='text-xl md:text-2xl font-bold'>{totalReferrals || 0}</div>
                                    <div className='text-[10px] md:text-xs text-white/80 font-medium uppercase tracking-wider'>Referrals</div>
                                </div>
                                <div className='p-3 md:px-6 md:py-4 bg-white text-pink-600 rounded-2xl text-center md:min-w-[100px] shadow-lg'>
                                    <div className='text-xl md:text-2xl font-bold'>${computedStats?.totalEarningsValue || 0}</div>
                                    <div className='text-[10px] md:text-xs text-pink-500 font-bold uppercase tracking-wider'>Earned</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='grid lg:grid-cols-3 gap-4 md:gap-8'>
                        {/* Main Content Column */}
                        <div className='lg:col-span-2 space-y-4 md:space-y-8'>
                            
                            {/* Referral Code Card */}
                            <div className='bg-white rounded-3xl md:rounded-[2rem] p-1 shadow-sm border border-pink-100'>
                                <div className='bg-gradient-to-br from-pink-50/50 to-white rounded-[1.4rem] md:rounded-[1.8rem] p-5 md:p-8 border border-white'>
                                    <div className='flex flex-col gap-5 md:gap-6'>
                                        <div className='w-full'>
                                            <h3 className='text-base md:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2'>
                                                <Zap className='text-pink-500' size={18} />
                                                Your Magic Code
                                            </h3>
                                            
                                            {referralCode ? (
                                                <div className='relative group cursor-pointer mt-3' onClick={() => copyToClipboard(referralCode, setCopied)}>
                                                    <div className='absolute inset-0 bg-pink-500/10 blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100' />
                                                    <div className='relative flex items-center justify-between bg-white border-2 border-dashed border-pink-200 hover:border-pink-300 rounded-2xl p-3 md:p-4 transition-all group-hover:shadow-lg active:scale-[0.98]'>
                                                        <code className='text-2xl md:text-3xl font-mono font-black text-gray-800 tracking-wider'>{referralCode}</code>
                                                        <button 
                                                            className={`p-2 rounded-xl transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-pink-50 text-pink-400 group-hover:bg-pink-100 group-hover:text-pink-600'}`}
                                                        >
                                                            {copied ? <Check size={18} /> : <Copy size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => generateCodeMutation.mutate()}
                                                    disabled={generateCodeMutation.isPending}
                                                    className='w-full py-3.5 md:py-4 mt-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 active:scale-[0.98]'
                                                >
                                                    {generateCodeMutation.isPending && <Loader2 className='animate-spin' size={18} />}
                                                    Generate Code
                                                </button>
                                            )}
                                        </div>

                                        {/* Share Links - Horizontal Scroll on Mobile */}
                                        <div className='md:border-t md:border-pink-100 md:pt-6'>
                                             <p className='text-gray-500 text-xs md:text-sm mb-3 md:mb-4'>Share quickly via:</p>
                                            <div className='grid grid-cols-4 gap-2 md:grid-cols-4 md:gap-3'>
                                                {[
                                                    { icon: MessageSquare, color: 'bg-[#25D366]', id: 'whatsapp' },
                                                    { icon: Facebook, color: 'bg-[#1877F2]', id: 'facebook' },
                                                    { icon: Mail, color: 'bg-rose-500', id: 'email' }
                                                ].map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleShare(item.id)}
                                                        className={`${item.color} p-3 md:p-4 rounded-2xl text-white shadow-md shadow-gray-200 active:scale-90 transition-transform flex items-center justify-center`}
                                                    >
                                                        <item.icon size={20} />
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => copyToClipboard(shareUrl, setLinkCopied)}
                                                    className='bg-gray-800 p-3 md:p-4 rounded-2xl text-white shadow-md shadow-gray-200 active:scale-90 transition-transform flex items-center justify-center'
                                                >
                                                    {linkCopied ? <Check size={20} /> : <Link2 size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tiers Progress - Compact */}
                            {nextTierProgress && (
                                <div className='bg-white rounded-3xl md:rounded-[2rem] p-5 md:p-8 border border-pink-100 shadow-sm'>
                                    <div className='flex items-center justify-between mb-4 md:mb-6'>
                                        <div>
                                            <h3 className='text-base md:text-lg font-bold text-gray-900'>Your Tier</h3>
                                            <p className='text-xs md:text-sm text-gray-500'>Refer {nextTierProgress.referralsNeeded} more friends!</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${activeGradient} text-white text-xs md:text-sm font-bold shadow-sm capitalize`}>
                                            {currentTier}
                                        </div>
                                    </div>

                                    <div className='relative h-3 md:h-4 bg-pink-50 rounded-full overflow-hidden'>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${nextTierProgress.progress}%` }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                            className='absolute top-0 bottom-0 left-0 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full'
                                        />
                                    </div>
                                    <div className='mt-2 text-right'>
                                       <span className='text-xs font-bold text-pink-600'>{nextTierProgress.progress.toFixed(0)}% to {nextTierProgress.nextTier}</span>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Sidebar Column - Optimized for Mobile Flow */}
                        <div className='space-y-4 md:space-y-8'>
                            
                            {/* How it Works - Minimal horizontal on desktop, maybe vertical on mobile? Keeping vertical consistent but tighter. */}
                            <div className='bg-white rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 border border-pink-100 shadow-sm'>
                                <h3 className='font-bold text-lg md:text-xl text-gray-900 mb-4 md:mb-6 border-b border-pink-50 pb-2'>How it works</h3>
                                <div className='space-y-4 md:space-y-6 relative'>
                                    {/* Vertical Line */}
                                    <div className='absolute left-[19px] top-2 bottom-6 w-0.5 bg-pink-100' />
                                    
                                    {[
                                        { title: 'Send Invite', desc: 'Share code w/ friends', icon: Share2 },
                                        { title: 'They Join', desc: 'Friends sign up', icon: User },
                                        { title: 'You Earn', desc: 'Get rewards cash', icon: Gift }
                                    ].map((step, i) => (
                                        <div key={i} className='relative flex items-center gap-4'>
                                            <div className='relative z-10 w-10 h-10 rounded-2xl bg-white border-2 border-pink-100 flex items-center justify-center text-pink-500 shadow-sm flex-shrink-0'>
                                                <step.icon size={18} />
                                            </div>
                                            <div>
                                                <h4 className='font-bold text-sm md:text-base text-gray-900'>{step.title}</h4>
                                                <p className='text-xs text-gray-500'>{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    )
}

export default ReferralPage
