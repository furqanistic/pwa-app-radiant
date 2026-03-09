import MembershipCard from '@/components/Bookings/MembershipCard'
import React from 'react'

const MembershipPlansGrid = ({
  plans = [],
  membershipServices = [],
  onSelectService,
  includeServiceMemberships = true,
  className = 'grid grid-cols-1 gap-6 md:px-8',
}) => {
  const hasPlans = Array.isArray(plans) && plans.length > 0
  const hasMembershipServices =
    includeServiceMemberships &&
    Array.isArray(membershipServices) &&
    membershipServices.length > 0

  if (!hasPlans && !hasMembershipServices) return null

  return (
    <div className={className}>
      {hasPlans &&
        plans.map((plan, index) => (
          <MembershipCard
            service={{
              _id: `location-membership-${index}`,
              name: plan?.name,
              description: plan?.description,
              basePrice: plan?.price,
              duration: 0,
              categoryId: { name: 'Membership' },
            }}
            membership={plan}
            key={`location-membership-plan-${index}`}
          />
        ))}

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
