export const isRewardApplicableToService = (rewardSnapshot = {}, serviceId = null) => {
  if (!serviceId) return false

  const normalizedServiceId = String(serviceId)
  const rewardServiceId = rewardSnapshot?.serviceId
    ? String(rewardSnapshot.serviceId)
    : null
  const rewardServiceIds = Array.isArray(rewardSnapshot?.serviceIds)
    ? rewardSnapshot.serviceIds.map((id) => String(id))
    : []

  if (!rewardServiceId && rewardServiceIds.length === 0) {
    return true
  }

  return (
    (rewardServiceId && rewardServiceId === normalizedServiceId) ||
    rewardServiceIds.includes(normalizedServiceId)
  )
}

export const calculateSingleBookingRewardDiscount = ({
  rewardSnapshot = {},
  subtotal = 0,
  serviceId = null,
}) => {
  const amount = Number(subtotal) || 0
  if (amount <= 0) return 0
  if (!isRewardApplicableToService(rewardSnapshot, serviceId)) return 0

  const minPurchase = Number(rewardSnapshot?.minPurchase)
  if (Number.isFinite(minPurchase) && amount < minPurchase) {
    return 0
  }

  const rewardType = `${rewardSnapshot?.type || ''}`.toLowerCase()
  const rewardValue = Number(rewardSnapshot?.value) || 0

  if (rewardType === 'credit' || rewardType === 'referral') {
    return Math.min(rewardValue, amount)
  }

  if (['discount', 'service_discount', 'combo'].includes(rewardType)) {
    let discount = (amount * rewardValue) / 100
    const maxValue = Number(rewardSnapshot?.maxValue)
    if (Number.isFinite(maxValue)) {
      discount = Math.min(discount, maxValue)
    }
    return Math.max(0, discount)
  }

  if (rewardType === 'service' || rewardType === 'free_service') {
    return amount
  }

  return 0
}

export const resolveSingleBookingRewardUsage = ({
  rewardSnapshot = {},
  subtotal = 0,
  serviceId = null,
  userRewardId = null,
}) => {
  const rewardDiscountAmount = calculateSingleBookingRewardDiscount({
    rewardSnapshot,
    subtotal,
    serviceId,
  })

  return {
    rewardDiscountAmount,
    resolvedRewardUsed:
      rewardDiscountAmount > 0 && userRewardId ? String(userRewardId) : null,
  }
}
