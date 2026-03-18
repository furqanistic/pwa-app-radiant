import MembershipPlansGrid from '@/components/Membership/MembershipPlansGrid'
import MembershipBillingSection from '@/components/Membership/MembershipBillingSection'
import { useBranding } from '@/context/BrandingContext'
import { useActiveServices } from '@/hooks/useServices'
import { locationService } from '@/services/locationService'
import { authService } from '@/services/authService'
import stripeService from '@/services/stripeService'
import { FRONTEND_URL } from '@/config'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useMemo } from 'react'
import { updateProfile } from '@/redux/userSlice'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '../Layout/Layout'

const normalizeMembershipPlans = (membership) => {
    if (!membership) return []
    if (Array.isArray(membership.plans) && membership.plans.length > 0) {
        return membership.plans
    }
    if (membership.name || membership.description || membership.price !== undefined) {
        return [membership]
    }
    return []
}

const MembershipPage = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const queryClient = useQueryClient()
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
    const locationMembershipPlans = useMemo(
        () => normalizeMembershipPlans(locationMembership),
        [locationMembership]
    )

    const membershipServices = useMemo(() => {
        return (services || []).filter(
            (s) =>
                s.name.toLowerCase().includes('membership') ||
                s.categoryName?.toLowerCase().includes('membership') ||
                s.categoryId?.name?.toLowerCase().includes('membership') ||
                s.description?.toLowerCase().includes('subscription') ||
                (Array.isArray(s.membershipPricing) &&
                    s.membershipPricing.some((entry) => entry?.isActive !== false))
        )
    }, [services])

    const withSpaParam = (path) =>
        locationId ? `${path}?spa=${encodeURIComponent(locationId)}` : path

    const activeLocationId =
        locationId ||
        currentUser?.membershipBilling?.locationId ||
        currentUser?.membership?.locationId ||
        currentUser?.selectedLocation?.locationId ||
        currentUser?.spaLocation?.locationId ||
        null

    const {
        data: membershipBillingResponse,
        isLoading: isLoadingBilling,
        refetch: refetchMembershipBilling,
    } = useQuery({
        queryKey: ['membership-billing-summary', activeLocationId],
        queryFn: () => stripeService.getMembershipBillingSummary(activeLocationId),
        enabled: Boolean(activeLocationId && currentUser?._id),
    })

    const {
        data: membershipInvoicesResponse,
        isFetching: isLoadingInvoices,
        refetch: refetchMembershipInvoices,
    } = useQuery({
        queryKey: ['membership-invoices', activeLocationId],
        queryFn: () => stripeService.getMembershipInvoices(activeLocationId),
        enabled: false,
    })

    const membershipSummary = membershipBillingResponse?.summary || null
    const membershipInvoices = membershipInvoicesResponse?.invoices || []

    const refreshCurrentUser = async () => {
        try {
            const meResponse = await authService.getCurrentUser()
            const latestUser = meResponse?.data?.user
            if (latestUser) {
                dispatch(updateProfile(latestUser))
            }
        } catch (error) {
            console.error('Failed to refresh current user after membership update:', error)
        }
    }

    const refreshMembershipState = async () => {
        await Promise.all([
            refetchMembershipBilling(),
            queryClient.invalidateQueries({ queryKey: ['profile'] }),
            refreshCurrentUser(),
        ])
    }

    const normalizePlanValue = (value) => `${value || ''}`.trim().toLowerCase()
    const currentPlanId = membershipSummary?.membership?.planId || null
    const currentPlanName = membershipSummary?.membership?.planName || ''
    const currentPlanPrice = Number(membershipSummary?.membership?.price || 0)
    const hasSavedCard = Boolean(membershipSummary?.hasPaymentMethod)
    const membershipStatus = `${membershipSummary?.membership?.status || membershipSummary?.subscription?.status || 'inactive'}`
        .trim()
        .toLowerCase()
    const hasExistingSubscription = Boolean(
        membershipSummary?.subscription?.id &&
            ['active', 'trialing', 'past_due', 'incomplete', 'unpaid'].includes(membershipStatus)
    )

    const getPlanActionProps = (plan, linkedService) => {
        const planId = `${plan?._id || plan?.planId || plan?.id || ''}`.trim()
        const planName = normalizePlanValue(plan?.name)
        const planPrice = Number(plan?.price || 0)
        const isCurrentPlan =
            (currentPlanId && planId && String(currentPlanId) === String(planId)) ||
            (normalizePlanValue(currentPlanName) &&
                planName &&
                normalizePlanValue(currentPlanName) === planName)
        const isPendingPlan =
            membershipSummary?.subscription?.pendingPlan?.planId === planId ||
            normalizePlanValue(membershipSummary?.subscription?.pendingPlan?.planName) ===
                planName

        if (isCurrentPlan && hasExistingSubscription && !isPendingPlan) {
            return {
                ctaLabel: 'Current Plan',
                disabled: true,
                statusBadge: 'Active plan',
                helperText: 'This is the membership plan currently applied to your account.',
            }
        }

        if (isPendingPlan) {
            return {
                ctaLabel: 'Scheduled',
                disabled: true,
                statusBadge: 'Next renewal',
                helperText: 'This plan is already scheduled to start on your next billing date.',
            }
        }

        if (!linkedService?._id) {
            return {
                disabled: true,
                ctaLabel: 'Unavailable',
                helperText: 'This plan is not linked to online membership billing yet.',
            }
        }

        if (!hasSavedCard) {
            return {
                disabled: true,
                ctaLabel: hasExistingSubscription ? 'Add Card First' : 'Add Card to Subscribe',
                helperText: 'A saved card is required before you can start, upgrade, or downgrade a plan.',
            }
        }

        if (!hasExistingSubscription) {
            return {
                ctaLabel: 'Subscribe',
                statusBadge: 'Monthly billing',
            }
        }

        if (planPrice > currentPlanPrice) {
            return {
                ctaLabel: 'Upgrade',
                statusBadge: 'Monthly billing',
            }
        }

        if (planPrice < currentPlanPrice) {
            return {
                ctaLabel: 'Downgrade',
                statusBadge: 'Monthly billing',
            }
        }

        return {
            ctaLabel: 'Change Plan',
            statusBadge: 'Monthly billing',
        }
    }

    const onServiceSelect = async (service, plan) => {
        if (!service?._id) {
            toast.error('This plan is not linked to online checkout yet.')
            return
        }

        const checkoutLocationId =
            locationId ||
            currentUser?.selectedLocation?.locationId ||
            currentUser?.spaLocation?.locationId

        if (!checkoutLocationId) {
            toast.error('Please select a location first.')
            return
        }

        try {
            if (!hasSavedCard) {
                toast.error('Add a card before buying a membership plan.')
                return
            }

            const payload = {
                serviceId: service._id,
                locationId: checkoutLocationId,
                planId: plan?._id || plan?.planId || plan?.id || null,
                planName: plan?.name || null,
            }

            if (hasExistingSubscription) {
                const response = await stripeService.changeMembershipSubscriptionPlan(
                    payload
                )
                if (response?.success) {
                    toast.success(
                        response?.message ||
                            'Membership plan update scheduled for your next renewal.'
                    )
                    await refreshMembershipState()
                    await refetchMembershipInvoices()
                    return
                }
            } else {
                const response = await stripeService.createMembershipSubscription(
                    payload
                )
                if (response?.success) {
                    toast.success(response?.message || 'Membership activated successfully.')
                    await refreshMembershipState()
                    await refetchMembershipInvoices()
                    return
                }
            }

            toast.error('Unable to update this membership plan right now.')
        } catch (error) {
            console.error('Membership checkout error:', error)
            toast.error(
                error?.response?.data?.message ||
                    'Failed to update membership.'
            )
            navigate(withSpaParam(`/services/${service._id}`))
        }
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
                <div className='max-w-6xl mx-auto px-4 py-6 min-h-[80vh]'>
                    <MembershipBillingSection
                        locationId={activeLocationId}
                        summary={membershipSummary}
                        loading={isLoadingBilling}
                        invoices={membershipInvoices}
                        invoicesLoading={isLoadingInvoices}
                        onRefresh={refreshMembershipState}
                        onOpenInvoicePortal={async () => {
                            try {
                                const response =
                                    await stripeService.createMembershipBillingPortalSession({
                                        locationId: activeLocationId,
                                        returnUrl: `${FRONTEND_URL}${withSpaParam('/membership')}`,
                                    })

                                if (response?.success && response?.url) {
                                    window.location.href = response.url
                                    return
                                }

                                toast.error('Unable to open Stripe invoices right now.')
                            } catch (error) {
                                console.error('Failed to open membership billing portal:', error)
                                toast.error(
                                    error?.response?.data?.message ||
                                        'Unable to open Stripe invoices right now.'
                                )
                            }
                        }}
                        onMakeDefault={async (paymentMethodId) => {
                            await stripeService.setMembershipDefaultPaymentMethod({
                                locationId: activeLocationId,
                                paymentMethodId,
                            })
                            toast.success('Default card updated')
                            await refreshMembershipState()
                        }}
                        onRemoveCard={async (paymentMethodId) => {
                            await stripeService.removeMembershipPaymentMethod({
                                locationId: activeLocationId,
                                paymentMethodId,
                            })
                            toast.success('Saved card removed')
                            await refreshMembershipState()
                        }}
                    />

                    <div className="w-full relative z-10 animate-fadeIn">
                        {isLoading || isLoadingLocation ? (
                            <div className="w-full h-48 bg-gray-200 rounded-[1.75rem] animate-pulse" />
                        ) : (
                            <MembershipPlansGrid
                                plans={locationMembershipPlans}
                                membershipServices={membershipServices}
                                onSelectService={onServiceSelect}
                                includeServiceMemberships={false}
                                getPlanActionProps={getPlanActionProps}
                                className="grid grid-cols-1 gap-4 w-full"
                            />
                        )}
                    </div>

                </div>
            </div>
        </Layout>
    )
}

export default MembershipPage
