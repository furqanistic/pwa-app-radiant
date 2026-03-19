export const getLinkedServiceId = (reward) => {
  if (!reward) return null

  const linkedServices = Array.isArray(reward.linkedServices)
    ? reward.linkedServices
    : []
  const firstLinkedService = linkedServices[0] || null

  const value =
    reward.serviceId?._id ||
    reward.serviceId ||
    reward.linkedServiceId?._id ||
    reward.linkedServiceId ||
    reward.service?._id ||
    reward.linkedService?._id ||
    reward.linkedService?.serviceId ||
    firstLinkedService?.serviceId?._id ||
    firstLinkedService?.serviceId ||
    firstLinkedService?._id

  return value ? String(value) : null
}

export const buildAutoApplyRewardState = ({
  data = null,
  rewardId = null,
  fallbackReward = null,
}) => {
  const claimedUserReward = data?.data?.userReward || data?.userReward || null
  const claimedPayload =
    data?.data?.claimedReward ||
    data?.data?.reward ||
    data?.data?.userReward ||
    data?.claimedReward ||
    data?.reward ||
    null

  return {
    linkedServiceId:
      getLinkedServiceId(claimedPayload) || getLinkedServiceId(fallbackReward),
    autoApplyState: {
      autoApplyRewardId: claimedUserReward?._id
        ? String(claimedUserReward._id)
        : String(rewardId || ''),
      autoApplyRewardName:
        claimedPayload?.name ||
        claimedPayload?.rewardSnapshot?.name ||
        claimedUserReward?.rewardSnapshot?.name ||
        fallbackReward?.name ||
        'Reward',
      autoApplyRewardSnapshot: claimedUserReward?.rewardSnapshot || null,
    },
  }
}

export const isRewardApplicableToService = ({
  rewardSnapshot = null,
  serviceId = null,
}) => {
  if (!rewardSnapshot || !serviceId) return false

  const snapshotServiceId = rewardSnapshot.serviceId
    ? String(rewardSnapshot.serviceId)
    : null
  const snapshotServiceIds = Array.isArray(rewardSnapshot.serviceIds)
    ? rewardSnapshot.serviceIds.map((id) => String(id))
    : []

  if (!snapshotServiceId && snapshotServiceIds.length === 0) {
    return true
  }

  const currentServiceId = String(serviceId)
  return (
    (snapshotServiceId && snapshotServiceId === currentServiceId) ||
    snapshotServiceIds.includes(currentServiceId)
  )
}

export const calculateRewardDiscount = ({
  rewardSnapshot = null,
  subtotal = 0,
  serviceId = null,
}) => {
  if (!rewardSnapshot) return 0
  if (
    !isRewardApplicableToService({
      rewardSnapshot,
      serviceId,
    })
  ) {
    return 0
  }

  const normalizedSubtotal = Number(subtotal) || 0
  const rewardValue = Number(rewardSnapshot.value) || 0
  const rewardType = String(rewardSnapshot.type || '').toLowerCase()

  if (
    Number.isFinite(Number(rewardSnapshot.minPurchase)) &&
    normalizedSubtotal < Number(rewardSnapshot.minPurchase)
  ) {
    return 0
  }

  if (rewardType === 'credit' || rewardType === 'referral') {
    return Math.min(rewardValue, normalizedSubtotal)
  }

  if (['discount', 'service_discount', 'combo'].includes(rewardType)) {
    let discount = (normalizedSubtotal * rewardValue) / 100
    if (Number.isFinite(Number(rewardSnapshot.maxValue))) {
      discount = Math.min(discount, Number(rewardSnapshot.maxValue))
    }
    return Math.max(0, discount)
  }

  if (rewardType === 'service' || rewardType === 'free_service') {
    return normalizedSubtotal
  }

  return 0
}

export const normalizeUserRewardCatalogId = (userReward) => {
  const rewardRef = userReward?.rewardId
  if (!rewardRef) return null
  if (typeof rewardRef === 'string') return rewardRef
  if (rewardRef?._id) return String(rewardRef._id)
  return null
}

export const mergeCatalogRewardsWithClaims = ({
  catalogRewards = [],
  userRewards = [],
}) => {
  const groupedByCatalogReward = new Map()

  userRewards.forEach((userReward) => {
    const catalogRewardId = normalizeUserRewardCatalogId(userReward)
    if (!catalogRewardId) return
    const group = groupedByCatalogReward.get(catalogRewardId) || []
    group.push(userReward)
    groupedByCatalogReward.set(catalogRewardId, group)
  })

  return catalogRewards.map((reward) => {
    const catalogRewardId = String(reward?._id || '')
    const claimedRewards = groupedByCatalogReward.get(catalogRewardId) || []
    const sortedClaims = [...claimedRewards].sort((a, b) => {
      const aTime = new Date(a?.claimedAt || a?.createdAt || 0).getTime()
      const bTime = new Date(b?.claimedAt || b?.createdAt || 0).getTime()
      return bTime - aTime
    })
    const mostRecentClaim = sortedClaims[0] || null

    return {
      ...reward,
      hasActiveClaim: claimedRewards.length > 0,
      activeClaimCount: claimedRewards.length,
      activeUserRewardId: mostRecentClaim?._id ? String(mostRecentClaim._id) : null,
      activeRewardSnapshot: mostRecentClaim?.rewardSnapshot || null,
    }
  })
}

export const getRewardDisplayValue = (rewardSnapshot = null) => {
  if (!rewardSnapshot) return '$0'
  const type = String(rewardSnapshot?.type || '').toLowerCase()
  const value = Number(rewardSnapshot?.value) || 0
  if (['discount', 'service_discount', 'combo', 'experience'].includes(type)) {
    return `${value}%`
  }
  if (type === 'service' || type === 'free_service') {
    return 'Free service'
  }
  return `$${value}`
}

export const calculateCartRewardDiscount = ({
  rewardSnapshot = null,
  items = [],
  totalAmount = 0,
}) => {
  if (!rewardSnapshot) return 0

  const type = String(rewardSnapshot?.type || '').toLowerCase()
  const value = Number(rewardSnapshot?.value) || 0
  const serviceId = rewardSnapshot?.serviceId
    ? String(rewardSnapshot.serviceId)
    : null
  const serviceIds = Array.isArray(rewardSnapshot?.serviceIds)
    ? rewardSnapshot.serviceIds.map((id) => String(id))
    : []

  if (
    Number.isFinite(Number(rewardSnapshot?.minPurchase)) &&
    totalAmount < Number(rewardSnapshot.minPurchase)
  ) {
    return 0
  }

  if (type === 'credit' || type === 'referral') {
    return Math.min(value, totalAmount)
  }

  if (['discount', 'service_discount', 'combo'].includes(type)) {
    const hasServiceFilter = Boolean(serviceId || serviceIds.length > 0)
    const applicableTotal = hasServiceFilter
      ? items
          .filter(
            (item) =>
              String(item?.serviceId || '') === serviceId ||
              serviceIds.includes(String(item?.serviceId || ''))
          )
          .reduce((sum, item) => sum + (Number(item?.totalPrice) || 0), 0)
      : totalAmount

    let discount = (applicableTotal * value) / 100
    if (Number.isFinite(Number(rewardSnapshot?.maxValue))) {
      discount = Math.min(discount, Number(rewardSnapshot.maxValue))
    }
    return Math.max(0, discount)
  }

  if (type === 'service' || type === 'free_service') {
    const applicableItems = items.filter(
      (item) =>
        (!serviceId && serviceIds.length === 0) ||
        String(item?.serviceId || '') === serviceId ||
        serviceIds.includes(String(item?.serviceId || ''))
    )
    if (applicableItems.length === 0) return 0
    const freeItem = applicableItems.reduce((prev, curr) =>
      (Number(prev?.totalPrice) || 0) > (Number(curr?.totalPrice) || 0)
        ? prev
        : curr
    )
    return Number(freeItem?.totalPrice) || 0
  }

  return 0
}

export const getApplicableRewardsForService = ({
  userRewards = [],
  serviceId = null,
}) =>
  userRewards
    .filter((reward) =>
      isRewardApplicableToService({
        rewardSnapshot: reward?.rewardSnapshot || null,
        serviceId,
      })
    )
    .map((reward) => ({
      ...reward,
      isApplicableToCurrentService: true,
    }))

export const selectBestCartReward = ({
  rewards = [],
  items = [],
  totalAmount = 0,
}) => {
  if (!Array.isArray(rewards) || rewards.length === 0) return null

  const scored = rewards
    .map((reward) => {
      const estimatedDiscount = calculateCartRewardDiscount({
        rewardSnapshot: reward?.rewardSnapshot || null,
        items,
        totalAmount,
      })
      return {
        reward,
        estimatedDiscount,
        expiresAtMs: new Date(
          reward?.expiresAt || '9999-12-31T23:59:59.999Z'
        ).getTime(),
        claimedAtMs: new Date(reward?.claimedAt || reward?.createdAt || 0).getTime(),
      }
    })
    .filter((entry) => entry.estimatedDiscount > 0)
    .sort((a, b) => {
      if (b.estimatedDiscount !== a.estimatedDiscount) {
        return b.estimatedDiscount - a.estimatedDiscount
      }
      if (a.expiresAtMs !== b.expiresAtMs) {
        return a.expiresAtMs - b.expiresAtMs
      }
      return b.claimedAtMs - a.claimedAtMs
    })

  return scored[0]
    ? {
        ...scored[0].reward,
        estimatedDiscount: scored[0].estimatedDiscount,
      }
    : null
}
