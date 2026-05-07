import MembershipCard from '@/components/Bookings/MembershipCard'
import React from 'react'

const MembershipPlansGrid = ({
  plans = [],
  membershipServices = [],
  onSelectService,
  includeServiceMemberships = true,
  getPlanActionProps,
  isProcessing = false,
  processingSelectionKey = null,
  className = 'grid grid-cols-1 gap-6 md:px-8',
}) => {
  const hasPlans = Array.isArray(plans) && plans.length > 0
  const hasMembershipServices =
    includeServiceMemberships &&
    Array.isArray(membershipServices) &&
    membershipServices.length > 0

  if (!hasPlans && !hasMembershipServices) return null

  const normalizeText = (value) => `${value || ''}`.trim().toLowerCase()

  const resolveLinkedServiceForPlan = (plan) => {
    if (!Array.isArray(membershipServices) || membershipServices.length === 0) {
      return null
    }

    const planId = `${plan?._id || plan?.planId || plan?.id || ''}`.trim()
    const planName = normalizeText(plan?.name)

    const matchedService = membershipServices.find((service) =>
      Array.isArray(service?.membershipPricing) &&
      service.membershipPricing.some((entry) => {
        const entryPlanId = `${entry?.membershipPlanId || ''}`.trim()
        if (planId && entryPlanId && entryPlanId === planId) {
          return entry?.isActive !== false
        }

        return (
          planName &&
          normalizeText(entry?.membershipPlanName) === planName &&
          entry?.isActive !== false
        )
      })
    )

    if (matchedService) {
      return matchedService
    }

    if (planName) {
      const singlePlanServiceMatch = membershipServices.find((service) =>
        Array.isArray(service?.membershipPricing) &&
        (() => {
          const activeEntries = service.membershipPricing.filter(
            (entry) => entry?.isActive !== false
          )
          return (
            activeEntries.length === 1 &&
            normalizeText(activeEntries[0]?.membershipPlanName) === planName
          )
        })()
      )

      if (singlePlanServiceMatch) {
        return singlePlanServiceMatch
      }
    }

    return null
  }

  const getSelectionKey = (service, plan) => {
    const serviceId = `${service?._id || ''}`.trim()
    const planId = `${plan?._id || plan?.planId || plan?.id || ''}`.trim()
    const planName = normalizeText(plan?.name)
    return `${serviceId}::${planId || planName || 'default'}`
  }

  return (
    <div className={className}>
      {hasPlans &&
        plans.map((plan, index) => {
          const linkedService = resolveLinkedServiceForPlan(plan)
          const actionProps = getPlanActionProps
            ? getPlanActionProps(plan, linkedService)
            : {}
          const selectionKey = getSelectionKey(linkedService, plan)
          const isCardProcessing =
            Boolean(isProcessing) &&
            Boolean(processingSelectionKey) &&
            processingSelectionKey === selectionKey

          return (
            <MembershipCard
              service={{
                _id: linkedService?._id || `location-membership-${index}`,
                name: plan?.name,
                description: plan?.description,
                basePrice: plan?.price,
                duration: 0,
                categoryId: { name: 'Membership' },
              }}
              membership={plan}
              key={`location-membership-plan-${index}`}
              onSelect={linkedService ? onSelectService : undefined}
              ctaLabel={actionProps?.ctaLabel}
              disabled={Boolean(actionProps?.disabled) || Boolean(isProcessing)}
              isProcessing={isCardProcessing}
              statusBadge={actionProps?.statusBadge}
              helperText={actionProps?.helperText}
            />
          )
        })}

      {hasMembershipServices &&
        membershipServices.map((service) => (
          <MembershipCard
            key={service._id || service.serviceId || service.id || service.name}
            service={service}
            onSelect={onSelectService}
          />
        ))}
    </div>
  )
}

export default MembershipPlansGrid
