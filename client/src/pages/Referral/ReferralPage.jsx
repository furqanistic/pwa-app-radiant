// File: client/src/pages/Referral/ReferralPage.jsx - PWA OPTIMIZED
import { useBranding } from '@/context/BrandingContext'
import {
    useGenerateMyReferralCode,
    useReferralStatsWithComputedData,
} from '@/hooks/useReferral'
import { motion } from 'framer-motion'
import {
    Check,
    Copy,
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
        <div className='min-h-screen bg-gradient-to-br from-[color:var(--brand-primary)/0.08] to-white p-4 space-y-4 max-w-7xl mx-auto'>
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
        <div className='min-h-screen grid place-items-center bg-gradient-to-br from-[color:var(--brand-primary)/0.08] to-white p-4'>
            <div className='text-center p-6 bg-white rounded-3xl shadow-xl max-w-sm w-full border border-gray-200/70'>
                <div className='w-14 h-14 bg-[color:var(--brand-primary)/0.08] rounded-2xl grid place-items-center mx-auto mb-4 text-[color:var(--brand-primary)]'>
                    <Target size={28} />
                </div>
                <h2 className='text-lg font-bold text-gray-900 mb-2'>Oops!</h2>
                <p className='text-gray-500 text-sm mb-6'>{error?.message || 'Something went wrong'}</p>
                {retry && (
                    <button onClick={retry} className='w-full py-3 bg-[color:var(--brand-primary)/0.08]0 text-white rounded-xl font-semibold hover:brightness-95 transition-colors text-sm'>
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
    const { branding } = useBranding()
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
        totalEarnings = 0,
        recentReferrals = [],
        tierRewards = {},
    } = computedStats || {}
    const currentTierKey = currentTier?.toLowerCase() || 'bronze'
    const pointsPerReferral = tierRewards?.[currentTierKey]?.points || 0
    const successfulReferrals = recentReferrals.filter(
        (referral) => referral?.status === 'completed'
    )
    const uniqueLink = shareUrl || ''
    const uniqueLinkDisplay = uniqueLink.replace(/^https?:\/\//, '')
    const formatPoints = (value) => `${Number(value || 0).toLocaleString()} pts`
    const brandName = branding?.name || 'RadiantAI'

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
            sms: `sms:?&body=${encodeURIComponent(text + ' ' + shareUrl)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`,
            email: `mailto:?subject=${encodeURIComponent('Join RadiantAI with me!')}&body=${encodeURIComponent(text + '\n\n' + shareUrl)}`,
        }
        if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=400')
    }
    const handleNativeShare = async () => {
        if (!shareUrl) return
        const text = 'Join me on RadiantAI and start your beauty transformation!'
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Refer & Earn',
                    text,
                    url: shareUrl,
                })
            } else {
                await copyToClipboard(shareUrl, setLinkCopied)
            }
        } catch (err) {
            console.error('Share failed', err)
        }
    }

    const MotionDiv = motion.div

    return (
        <Layout>
            <div
                className='min-h-screen pb-20 md:pb-12 md:bg-gradient-to-br md:from-[color:var(--brand-primary)/0.08] md:to-white'
                style={{
                    ['--brand-primary']: brandColor,
                    ['--brand-primary-dark']: brandColorDark,
                }}
            >
                <div className='md:hidden max-w-md mx-auto min-h-screen overflow-hidden'>
                    <div className='bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] px-6 pt-10 pb-8 text-center'>
                        <p className='text-[11px] tracking-[0.2em] uppercase text-white font-semibold mb-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/20 border border-white/25'>
                            <Sparkles size={12} />
                            Refer & Earn
                        </p>
                        <h1 className='text-[34px] leading-[1.08] font-semibold text-[#f7f7f7]'>Share Your Link</h1>
                    </div>

                    <div className='px-4 pb-8 pt-4 space-y-4'>
                        <div className='rounded-2xl border border-gray-200/70 bg-white px-4 py-3 flex items-center justify-between gap-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]'>
                            <div>
                                <p className='text-xs text-[#8a8a8a]'>Total Earned</p>
                                <p className='text-[29px] leading-none font-semibold text-[color:var(--brand-primary-dark)]'>{formatPoints(totalEarnings)}</p>
                            </div>
                            <div className='text-right'>
                                <p className='text-xs text-[#8a8a8a]'>Per Referral</p>
                                <p className='text-[30px] leading-none font-semibold text-[color:var(--brand-primary)]'>+{formatPoints(pointsPerReferral)}</p>
                            </div>
                        </div>

                        <div className='rounded-2xl bg-white border border-gray-200/70 p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]'>
                            <p className='text-xs text-[#8a8a8a] mb-2'>Your unique link</p>
                            <div className='flex items-center gap-2'>
                                <code className='flex-1 block truncate text-[13px] text-[#2f2f2f]'>{uniqueLinkDisplay || 'Generate your code to get your unique link'}</code>
                                <button
                                    onClick={() => copyToClipboard(uniqueLink, setLinkCopied)}
                                    disabled={!uniqueLink}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                        linkCopied
                                            ? 'bg-[color:var(--brand-primary-dark)] text-white'
                                            : 'bg-[color:var(--brand-primary)] text-white disabled:opacity-45 disabled:cursor-not-allowed'
                                    }`}
                                >
                                    {linkCopied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <div className='rounded-2xl bg-white border border-gray-200/70 p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)]'>
                            <p className='text-xs text-[#8a8a8a] mb-2'>Your referral code</p>
                            {referralCode ? (
                                <button
                                    onClick={() => copyToClipboard(referralCode, setCopied)}
                                    className='w-full rounded-xl bg-white border border-gray-200/70 px-3 py-2.5 flex items-center justify-between text-left'
                                >
                                    <span className='font-semibold tracking-wide text-[#1d1d1d]'>{referralCode}</span>
                                    <span className='text-[color:var(--brand-primary)]'>
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => generateCodeMutation.mutate()}
                                    disabled={generateCodeMutation.isPending}
                                    className='w-full py-3 bg-[color:var(--brand-primary)] text-white rounded-xl font-semibold flex items-center justify-center gap-2'
                                >
                                    {generateCodeMutation.isPending && <Loader2 className='animate-spin' size={16} />}
                                    Generate Code
                                </button>
                            )}
                        </div>

                        <div className='grid grid-cols-3 gap-2.5'>
                                <button
                                    onClick={() => handleShare('sms')}
                                    className='rounded-xl border border-gray-200/70 bg-white py-2.5 text-[#4d4d4d] text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform'
                                >
                                <MessageSquare size={16} />
                                SMS
                            </button>
                                <button
                                    onClick={() => handleShare('email')}
                                    className='rounded-xl border border-gray-200/70 bg-white py-2.5 text-[#4d4d4d] text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform'
                                >
                                <Mail size={16} />
                                Email
                            </button>
                                <button
                                    onClick={handleNativeShare}
                                    className='rounded-xl border border-gray-200/70 bg-white py-2.5 text-[#4d4d4d] text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform'
                                >
                                <Share2 size={16} />
                                Share
                            </button>
                        </div>

                        <div>
                            <p className='text-xs font-medium tracking-[0.14em] text-[#979797] uppercase mb-2'>Friends Joined</p>
                            <div className='space-y-2.5'>
                                {successfulReferrals.length > 0 ? (
                                    successfulReferrals.map((referral) => {
                                        const referralName =
                                            referral?.referred?.name ||
                                            referral?.referred?.email ||
                                            'New Friend'
                                        const awardedPoints = referral?.referrerReward?.points || pointsPerReferral

                                        return (
                                            <div
                                                key={referral?._id}
                                                className='rounded-2xl border border-gray-200/70 bg-white px-3 py-3 flex items-center justify-between shadow-[0_1px_0_rgba(0,0,0,0.02)]'
                                            >
                                                <div className='flex items-center gap-2.5 min-w-0'>
                                                    <div className='w-8 h-8 rounded-full bg-[color:var(--brand-primary)/0.15] text-[color:var(--brand-primary)] grid place-items-center'>
                                                        <User size={14} />
                                                    </div>
                                                    <p className='text-[17px] font-medium text-[#252525] truncate'>{referralName}</p>
                                                </div>
                                                <p className='text-[25px] font-semibold text-[color:var(--brand-primary)]'>+{formatPoints(awardedPoints)}</p>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className='rounded-2xl border border-dashed border-gray-200/90 bg-[#f8f8f8] p-4 text-sm text-[#7a7a7a]'>
                                        No successful referrals yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {nextTierProgress && (
                            <div className='rounded-2xl bg-[#f8f8f9] border border-gray-200/70 p-3'>
                                <div className='flex items-center justify-between mb-2'>
                                    <div>
                                        <p className='text-sm font-semibold text-[#1f1f1f]'>Tier: {currentTier}</p>
                                        <p className='text-xs text-[#7d7d7d]'>Refer {nextTierProgress.referralsNeeded} more friends</p>
                                    </div>
                                    <div className='text-xs font-semibold text-[color:var(--brand-primary)]'>
                                        {totalReferrals || 0} total
                                    </div>
                                </div>
                                <div className='relative h-2.5 bg-[color:var(--brand-primary)/0.12] rounded-full overflow-hidden'>
                                    <MotionDiv
                                        initial={{ width: 0 }}
                                        animate={{ width: `${nextTierProgress.progress}%` }}
                                        transition={{ duration: 0.9, ease: 'easeOut' }}
                                        className='absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-full'
                                    />
                                </div>
                                <div className='mt-2 text-right'>
                                    <span className='text-xs font-semibold text-[color:var(--brand-primary)]'>
                                        {nextTierProgress.progress.toFixed(0)}% to {nextTierProgress.nextTier}
                                    </span>
                                </div>
                            </div>
                        )}

                            <div className='rounded-2xl bg-white border border-gray-200/70 p-3 flex items-start gap-2.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]'>
                            <div className='w-8 h-8 rounded-full bg-white border border-gray-200/70 grid place-items-center text-[color:var(--brand-primary)] mt-0.5'>
                                <Zap size={14} />
                            </div>
                            <div>
                                <p className='text-sm font-semibold text-[#2a2a2a]'>How it works</p>
                                <p className='text-xs text-[#777] mt-1'>Send your link. When friends join successfully, points are added to your earned total and shown in this history.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='hidden md:block max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8'>
                    <div className='rounded-[2.25rem] bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white p-8 lg:p-10 shadow-xl shadow-[color:var(--brand-primary)/0.25] mb-6'>
                        <div className='flex items-start justify-between gap-4'>
                            <div>
                                <p className='text-xs tracking-[0.16em] uppercase text-white/80 mb-2 inline-flex items-center gap-1'>
                                    <Sparkles size={12} />
                                    Referral Program
                                </p>
                                <h1 className='text-4xl lg:text-5xl font-black leading-tight'>Share Your Link</h1>
                                <p className='text-white/85 mt-2 text-sm lg:text-base'>
                                    {brandName} referral tracking with points and successful referral history.
                                </p>
                            </div>
                            <div className='grid grid-cols-2 gap-3 min-w-[260px]'>
                                <div className='rounded-2xl bg-white/15 border border-white/30 px-4 py-3 text-center'>
                                    <p className='text-2xl font-black'>{totalReferrals || 0}</p>
                                    <p className='text-[11px] tracking-wider uppercase text-white/80'>Referrals</p>
                                </div>
                                <div className='rounded-2xl bg-white text-[color:var(--brand-primary)] px-4 py-3 text-center'>
                                    <p className='text-2xl font-black'>{formatPoints(totalEarnings)}</p>
                                    <p className='text-[11px] tracking-wider uppercase font-bold'>Earned</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='grid lg:grid-cols-3 gap-6'>
                        <div className='lg:col-span-2 space-y-6'>
                            <div className='rounded-[1.8rem] bg-white border border-gray-200/70 p-6 shadow-sm'>
                                <div className='grid sm:grid-cols-2 gap-4 mb-5'>
                                    <div className='rounded-2xl border border-[color:var(--brand-primary)/0.2] bg-[color:var(--brand-primary)/0.06] p-4'>
                                        <p className='text-xs uppercase tracking-wider text-gray-500'>Total Earned</p>
                                        <p className='text-2xl font-black text-gray-900 mt-1'>{formatPoints(totalEarnings)}</p>
                                    </div>
                                    <div className='rounded-2xl border border-[color:var(--brand-primary)/0.2] bg-[color:var(--brand-primary)/0.06] p-4'>
                                        <p className='text-xs uppercase tracking-wider text-gray-500'>Per Referral</p>
                                        <p className='text-2xl font-black text-[color:var(--brand-primary)] mt-1'>+{formatPoints(pointsPerReferral)}</p>
                                    </div>
                                </div>

                                <div className='rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4'>
                                    <p className='text-xs text-gray-500 mb-2'>Your unique link</p>
                                    <div className='flex items-center gap-3'>
                                        <code className='flex-1 truncate text-sm text-gray-800'>{uniqueLinkDisplay || 'Generate your code to get your unique link'}</code>
                                        <button
                                            onClick={() => copyToClipboard(uniqueLink, setLinkCopied)}
                                            disabled={!uniqueLink}
                                            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                                linkCopied
                                                    ? 'bg-[color:var(--brand-primary-dark)] text-white'
                                                    : 'bg-[color:var(--brand-primary)] text-white disabled:opacity-45 disabled:cursor-not-allowed'
                                            }`}
                                        >
                                            {linkCopied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                <div className='rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4'>
                                    <p className='text-xs text-gray-500 mb-2'>Your referral code</p>
                                    {referralCode ? (
                                        <button
                                            onClick={() => copyToClipboard(referralCode, setCopied)}
                                            className='w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 flex items-center justify-between'
                                        >
                                            <span className='font-semibold tracking-wide text-gray-900'>{referralCode}</span>
                                            <span className='text-[color:var(--brand-primary)]'>{copied ? <Check size={18} /> : <Copy size={18} />}</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => generateCodeMutation.mutate()}
                                            disabled={generateCodeMutation.isPending}
                                            className='w-full py-3 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl font-semibold flex items-center justify-center gap-2'
                                        >
                                            {generateCodeMutation.isPending && <Loader2 className='animate-spin' size={16} />}
                                            Generate Code
                                        </button>
                                    )}
                                </div>

                                <div className='grid grid-cols-4 gap-2.5'>
                                    <button onClick={() => handleShare('sms')} className='rounded-xl border border-gray-200 bg-white py-2.5 text-gray-700 text-sm font-medium flex items-center justify-center gap-1.5'>
                                        <MessageSquare size={16} />
                                        SMS
                                    </button>
                                    <button onClick={() => handleShare('email')} className='rounded-xl border border-gray-200 bg-white py-2.5 text-gray-700 text-sm font-medium flex items-center justify-center gap-1.5'>
                                        <Mail size={16} />
                                        Email
                                    </button>
                                    <button onClick={() => handleShare('whatsapp')} className='rounded-xl border border-gray-200 bg-white py-2.5 text-gray-700 text-sm font-medium flex items-center justify-center gap-1.5'>
                                        <MessageSquare size={16} />
                                        WhatsApp
                                    </button>
                                    <button onClick={handleNativeShare} className='rounded-xl border border-gray-200 bg-white py-2.5 text-gray-700 text-sm font-medium flex items-center justify-center gap-1.5'>
                                        <Share2 size={16} />
                                        Share
                                    </button>
                                </div>
                            </div>

                            <div className='rounded-[1.8rem] bg-white border border-gray-200/70 p-6 shadow-sm'>
                                <p className='text-xs font-medium tracking-[0.14em] text-gray-500 uppercase mb-3'>Friends Joined</p>
                                <div className='space-y-3'>
                                    {successfulReferrals.length > 0 ? (
                                        successfulReferrals.map((referral) => {
                                            const referralName =
                                                referral?.referred?.name ||
                                                referral?.referred?.email ||
                                                'New Friend'
                                            const awardedPoints = referral?.referrerReward?.points || pointsPerReferral

                                            return (
                                                <div key={referral?._id} className='rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between'>
                                                    <div className='flex items-center gap-2.5 min-w-0'>
                                                        <div className='w-8 h-8 rounded-full bg-[color:var(--brand-primary)/0.15] text-[color:var(--brand-primary)] grid place-items-center'>
                                                            <User size={14} />
                                                        </div>
                                                        <p className='text-base font-semibold text-gray-900 truncate'>{referralName}</p>
                                                    </div>
                                                    <p className='text-base font-bold text-[color:var(--brand-primary)]'>+{formatPoints(awardedPoints)}</p>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className='rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500'>
                                            No successful referrals yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className='space-y-6'>
                            {nextTierProgress && (
                                <div className='rounded-[1.8rem] bg-white border border-gray-200/70 p-6 shadow-sm'>
                                    <div className='flex items-center justify-between mb-2'>
                                        <div>
                                            <p className='text-base font-bold text-gray-900 capitalize'>Tier: {currentTier}</p>
                                            <p className='text-xs text-gray-500'>Refer {nextTierProgress.referralsNeeded} more friends</p>
                                        </div>
                                        <span className='text-xs font-semibold text-[color:var(--brand-primary)]'>
                                            {nextTierProgress.progress.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className='relative h-2.5 bg-[color:var(--brand-primary)/0.12] rounded-full overflow-hidden'>
                                        <MotionDiv
                                            initial={{ width: 0 }}
                                            animate={{ width: `${nextTierProgress.progress}%` }}
                                            transition={{ duration: 0.9, ease: 'easeOut' }}
                                            className='absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-full'
                                        />
                                    </div>
                                    <p className='text-xs font-semibold text-[color:var(--brand-primary)] mt-2 text-right'>
                                        to {nextTierProgress.nextTier}
                                    </p>
                                </div>
                            )}

                            <div className='rounded-[1.8rem] bg-white border border-gray-200/70 p-6 shadow-sm'>
                                <div className='flex items-start gap-3'>
                                    <div className='w-9 h-9 rounded-xl bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)] grid place-items-center'>
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <p className='text-base font-bold text-gray-900'>How it works</p>
                                        <p className='text-sm text-gray-600 mt-1'>
                                            Share your link, friends sign up, successful referrals are tracked here, and points are added to your total.
                                        </p>
                                    </div>
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
