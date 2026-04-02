// File: server/controller/stripeController.js - Stripe Connect & Payment Controller
import stripe from '../config/stripe.js'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Location from '../models/Location.js'
import Payment from '../models/Payment.js'
import Service from '../models/Service.js'
import User from '../models/User.js'
import UserReward from '../models/UserReward.js'
import { createGhlAppointmentForBooking } from './ghl.js'
import { getPointsMethodForLocation } from '../utils/pointsSettings.js'
import {
  resolveSingleBookingRewardUsage,
} from '../utils/rewardCheckout.js'
import {
  assertSlotAvailable,
  getServiceCalendarSelection,
} from '../utils/bookingScheduling.js'

const DEFAULT_MEMBERSHIP_PLAN = {
  name: 'Gold Glow Membership',
  description: 'Unlock exclusive perks and premium benefits',
  price: 99,
  benefits: ['Priority Booking', 'Free Premium Facial', '15% Product Discount'],
  currency: 'usd',
}

const toPlainObject = (value) =>
  value && typeof value.toObject === 'function' ? value.toObject() : value

const normalizeMembershipPlan = (planInput = {}, fallbackPlan = DEFAULT_MEMBERSHIP_PLAN) => {
  const base = toPlainObject(planInput) || {}
  const fallback = toPlainObject(fallbackPlan) || DEFAULT_MEMBERSHIP_PLAN
  const normalizedBenefits = Array.isArray(base.benefits)
    ? base.benefits.map((item) => `${item || ''}`.trim()).filter(Boolean)
    : []

  return {
    name: `${base.name || fallback.name || DEFAULT_MEMBERSHIP_PLAN.name}`.trim(),
    description: `${base.description || fallback.description || DEFAULT_MEMBERSHIP_PLAN.description}`.trim(),
    price: Math.max(
      0,
      Number.isFinite(Number(base.price))
        ? Number(base.price)
        : Number(fallback.price || DEFAULT_MEMBERSHIP_PLAN.price)
    ),
    benefits: normalizedBenefits.length
      ? normalizedBenefits
      : [...(fallback.benefits || DEFAULT_MEMBERSHIP_PLAN.benefits)],
    currency: `${base.currency || fallback.currency || 'usd'}`.trim().toLowerCase(),
    stripeProductId: base.stripeProductId || fallback.stripeProductId || null,
    stripePriceId: base.stripePriceId || fallback.stripePriceId || null,
    syncedAt: base.syncedAt || fallback.syncedAt || null,
  }
}

const normalizeMembershipForStripe = (membershipInput = {}) => {
  const membership = toPlainObject(membershipInput) || {}
  let plans = Array.isArray(membership.plans) && membership.plans.length > 0
    ? membership.plans
    : null

  if (!plans && (membership.name || membership.description || membership.price !== undefined)) {
    plans = [membership]
  }

  if (!plans || plans.length === 0) {
    plans = [DEFAULT_MEMBERSHIP_PLAN]
  }

  const normalizedPlans = plans.map((plan, index) =>
    normalizeMembershipPlan(plan, plans[index] || DEFAULT_MEMBERSHIP_PLAN)
  )

  const firstPlan = normalizedPlans[0] || normalizeMembershipPlan(DEFAULT_MEMBERSHIP_PLAN)

  return {
    ...membership,
    isActive: Boolean(membership.isActive),
    pendingStripeActivation: Boolean(membership.pendingStripeActivation),
    plans: normalizedPlans,
    name: firstPlan.name,
    description: firstPlan.description,
    price: firstPlan.price,
    benefits: firstPlan.benefits,
    currency: firstPlan.currency || 'usd',
    stripeProductId: firstPlan.stripeProductId || null,
    stripePriceId: firstPlan.stripePriceId || null,
    syncedAt: firstPlan.syncedAt || null,
  }
}

const syncMembershipPlansToStripe = async ({ location, stripeAccount }) => {
  const normalizedMembership = normalizeMembershipForStripe(location.membership || {})
  const existingPlans = Array.isArray(location.membership?.plans)
    ? location.membership.plans.map((plan) => toPlainObject(plan))
    : []

  const syncedPlans = []
  for (let index = 0; index < normalizedMembership.plans.length; index += 1) {
    const plan = normalizeMembershipPlan(normalizedMembership.plans[index], normalizedMembership.plans[index])
    const existingPlan = normalizeMembershipPlan(
      existingPlans[index] || location.membership || DEFAULT_MEMBERSHIP_PLAN,
      DEFAULT_MEMBERSHIP_PLAN
    )

    const resolvedName = plan.name
    const resolvedDescription = plan.description || ''
    const resolvedPrice = plan.price
    const currency = plan.currency || 'usd'
    const nameChanged = resolvedName !== existingPlan.name
    const descriptionChanged = resolvedDescription !== existingPlan.description
    const priceChanged = resolvedPrice !== existingPlan.price

    let stripeProductId = plan.stripeProductId || existingPlan.stripeProductId || null
    let stripePriceId = plan.stripePriceId || existingPlan.stripePriceId || null

    if (!stripeProductId) {
      const product = await stripe.products.create(
        {
          name: resolvedName,
          description: resolvedDescription,
          metadata: {
            type: 'membership',
            locationId: location.locationId,
            planIndex: `${index}`,
          },
        },
        { stripeAccount }
      )
      stripeProductId = product.id
    } else if (nameChanged || descriptionChanged) {
      await stripe.products.update(
        stripeProductId,
        {
          name: resolvedName,
          description: resolvedDescription,
        },
        { stripeAccount }
      )
    }

    if (!stripePriceId || priceChanged) {
      const price = await stripe.prices.create(
        {
          product: stripeProductId,
          unit_amount: Math.round(resolvedPrice * 100),
          currency,
          recurring: { interval: 'month' },
        },
        { stripeAccount }
      )
      stripePriceId = price.id
    }

    syncedPlans.push({
      ...plan,
      stripeProductId,
      stripePriceId,
      currency,
      syncedAt: new Date(),
    })
  }

  const firstPlan = syncedPlans[0] || normalizeMembershipPlan(DEFAULT_MEMBERSHIP_PLAN)
  return {
    ...normalizedMembership,
    isActive: true,
    pendingStripeActivation: false,
    plans: syncedPlans,
    name: firstPlan.name,
    description: firstPlan.description,
    price: firstPlan.price,
    benefits: firstPlan.benefits,
    currency: firstPlan.currency || 'usd',
    stripeProductId: firstPlan.stripeProductId || null,
    stripePriceId: firstPlan.stripePriceId || null,
    syncedAt: firstPlan.syncedAt || null,
  }
}

const autoActivatePendingMembershipForSpa = async (user) => {
  if (
    user?.role !== 'spa' ||
    !user?.spaLocation?.locationId ||
    !user?.stripe?.accountId ||
    !user?.stripe?.chargesEnabled
  ) {
    return
  }

  const location = await Location.findOne({ locationId: user.spaLocation.locationId })
  if (!location?.membership?.pendingStripeActivation) {
    return
  }

  const syncedMembership = await syncMembershipPlansToStripe({
    location,
    stripeAccount: user.stripe.accountId,
  })

  location.membership = syncedMembership
  await location.save()
}

const findStripeReadySpaOwnerByLocation = async (locationId) => {
  if (!locationId) return null

  return User.findOne({
    role: 'spa',
    'spaLocation.locationId': locationId,
    'stripe.accountId': { $nin: [null, ''] },
    'stripe.chargesEnabled': true,
  }).sort({ 'stripe.lastUpdated': -1, updatedAt: -1, createdAt: -1 })
}

const getActiveMembershipPricingEntries = (service) =>
  Array.isArray(service?.membershipPricing)
    ? service.membershipPricing.filter((entry) => entry?.isActive !== false)
    : []

const isMembershipServicePurchase = (service) => {
  if (!service) return false

  if (getActiveMembershipPricingEntries(service).length > 0) {
    return true
  }

  const text = `${service?.name || ''} ${service?.description || ''}`.toLowerCase()
  return text.includes('membership') || text.includes('subscription')
}

const resolvePurchasedMembershipPlan = (service, paidAmount) => {
  const entries = getActiveMembershipPricingEntries(service)
  if (entries.length === 0) {
    return {
      planName: service?.name || 'Membership',
      planId: null,
      planPrice: Number.isFinite(Number(paidAmount)) ? Number(paidAmount) : null,
      currency: 'usd',
    }
  }

  const paid = Number(paidAmount)
  if (!Number.isFinite(paid)) {
    const first = entries[0]
    return {
      planName: first?.membershipPlanName || service?.name || 'Membership',
      planId: first?.membershipPlanId || null,
      planPrice: Number.isFinite(Number(first?.price)) ? Number(first.price) : null,
      currency: 'usd',
    }
  }

  let best = entries[0]
  let bestDelta = Math.abs(Number(best?.price || 0) - paid)
  for (let i = 1; i < entries.length; i += 1) {
    const candidate = entries[i]
    const delta = Math.abs(Number(candidate?.price || 0) - paid)
    if (delta < bestDelta) {
      best = candidate
      bestDelta = delta
    }
  }

  return {
    planName: best?.membershipPlanName || service?.name || 'Membership',
    planId: best?.membershipPlanId || null,
    planPrice: Number.isFinite(Number(best?.price)) ? Number(best.price) : paid,
    currency: 'usd',
  }
}

const MEMBERSHIP_PRICE_ELIGIBLE_STATUSES = new Set([
  'active',
  'trialing',
  'paid',
  'current',
  'past_due',
  'incomplete',
  'unpaid',
])

const isUserEligibleForMembershipPricing = (user) => {
  if (!user) return false

  if (['super-admin', 'admin', 'spa', 'enterprise'].includes(user.role)) {
    return true
  }

  if (user?.membership?.isActive || user?.activeMembership?.isActive) {
    return true
  }

  const candidateStatuses = [
    user?.membership?.status,
    user?.membershipStatus,
    user?.activeMembership?.status,
    user?.subscription?.status,
  ]
    .filter(Boolean)
    .map((status) => `${status}`.trim().toLowerCase())

  return candidateStatuses.some((status) =>
    MEMBERSHIP_PRICE_ELIGIBLE_STATUSES.has(status)
  )
}

const resolveMemberPriceForUserAndService = ({ user, service }) => {
  if (!user || !Array.isArray(service?.membershipPricing)) return null

  const activeEntries = service.membershipPricing.filter((entry) => entry?.isActive !== false)
  if (activeEntries.length === 0) return null

  const userPlanId =
    user?.membership?.planId ||
    user?.membership?.plan?._id ||
    user?.activeMembership?.planId ||
    user?.activeMembership?.plan?._id ||
    null
  const userPlanName = user?.membership?.planName || user?.activeMembership?.planName || ''

  const normalize = (value) => `${value || ''}`.trim().toLowerCase()
  const matchedEntry = activeEntries.find((entry) => {
    const entryPlanId = entry?.membershipPlanId || null
    const entryPlanName = entry?.membershipPlanName || ''

    const planIdMatch =
      userPlanId && entryPlanId && `${userPlanId}`.trim() === `${entryPlanId}`.trim()
    const planNameMatch =
      normalize(userPlanName) &&
      normalize(entryPlanName) &&
      normalize(userPlanName) === normalize(entryPlanName)

    return planIdMatch || planNameMatch
  })

  const numericPrice = Number(matchedEntry?.price)
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return null
  }
  return numericPrice
}

const activateMembershipForCustomer = async ({ customerId, booking, service }) => {
  if (!customerId || !booking || !service) return false
  if (!isMembershipServicePurchase(service)) return false

  const customer = await User.findById(customerId)
  if (!customer) return false

  const purchasedPlan = resolvePurchasedMembershipPlan(service, booking.finalPrice)
  const startedAt = new Date()
  const expiresAt = new Date(startedAt)
  expiresAt.setMonth(expiresAt.getMonth() + 1)

  customer.membership = {
    ...(customer.membership || {}),
    isActive: true,
    status: 'active',
    planName: purchasedPlan.planName,
    planId: purchasedPlan.planId,
    price: purchasedPlan.planPrice,
    currency: purchasedPlan.currency || 'usd',
    serviceId: service._id,
    locationId: booking.locationId || service.locationId || customer.selectedLocation?.locationId || null,
    startedAt,
    expiresAt,
    lastPaymentAt: startedAt,
  }
  customer.membershipStatus = 'active'
  customer.activeMembership = {
    ...(customer.activeMembership || {}),
    isActive: true,
    status: 'active',
    planName: purchasedPlan.planName,
    planId: purchasedPlan.planId,
    startedAt,
    expiresAt,
    locationId: booking.locationId || service.locationId || customer.selectedLocation?.locationId || null,
  }

  await customer.save()
  return true
}

const resolvePurchasePoints = async (locationId, amount, cache = null) => {
  const normalizedAmount = Number(amount) || 0
  if (!locationId || normalizedAmount <= 0) return 0

  let purchaseMethod = cache?.get(locationId)
  if (purchaseMethod === undefined) {
    purchaseMethod = await getPointsMethodForLocation(locationId, 'purchase')
    if (cache) cache.set(locationId, purchaseMethod || null)
  }

  if (!purchaseMethod?.isActive) {
    return 0
  }

  const pointsValue =
    typeof purchaseMethod.pointsValue === 'number'
      ? purchaseMethod.pointsValue
      : 1

  if (purchaseMethod.perDollar !== false) {
    return Math.max(0, Math.floor(normalizedAmount * pointsValue))
  }

  return Math.max(0, Math.floor(pointsValue))
}

const MEMBERSHIP_ACTIVE_STATUSES = new Set(['active', 'trialing'])
const MEMBERSHIP_VISIBLE_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'incomplete',
  'unpaid',
])
const MEMBERSHIP_PAYMENT_GRACE_DAYS = 7
const MEMBERSHIP_PAYMENT_GRACE_MS = MEMBERSHIP_PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000

const toDateFromUnix = (value) =>
  Number.isFinite(Number(value)) ? new Date(Number(value) * 1000) : null

const getEmptyMembershipDefaultPaymentMethod = () => ({
  paymentMethodId: null,
  brand: null,
  last4: null,
  expMonth: null,
  expYear: null,
})

const getEmptyMembershipPendingPlan = () => ({
  planId: null,
  planName: null,
  price: null,
  currency: 'usd',
  effectiveAt: null,
})

const ensureMembershipBillingShape = (user) => {
  if (!user.membershipBilling?.defaultPaymentMethod) {
    user.set(
      'membershipBilling.defaultPaymentMethod',
      getEmptyMembershipDefaultPaymentMethod()
    )
  }

  if (!user.membershipBilling?.pendingPlan) {
    user.set('membershipBilling.pendingPlan', getEmptyMembershipPendingPlan())
  }
}

const clearMembershipDelinquencyState = (user) => {
  user.set('membershipBilling.paymentFailureStartedAt', null)
  user.set('membershipBilling.gracePeriodEndsAt', null)
}

const markMembershipPaymentFailureState = ({
  user,
  failureStartedAt = new Date(),
}) => {
  const existingFailureStart = user.membershipBilling?.paymentFailureStartedAt
  const normalizedFailureStart =
    existingFailureStart && !Number.isNaN(new Date(existingFailureStart).getTime())
      ? new Date(existingFailureStart)
      : new Date(failureStartedAt)
  const normalizedGraceEndsAt = new Date(
    normalizedFailureStart.getTime() + MEMBERSHIP_PAYMENT_GRACE_MS
  )

  user.set('membershipBilling.paymentFailureStartedAt', normalizedFailureStart)
  user.set('membershipBilling.gracePeriodEndsAt', normalizedGraceEndsAt)

  return {
    paymentFailureStartedAt: normalizedFailureStart,
    gracePeriodEndsAt: normalizedGraceEndsAt,
  }
}

const downgradeUserToFreeMembership = async ({ user, downgradedAt = new Date() }) => {
  ensureMembershipBillingShape(user)

  user.set('membershipBilling.subscriptionId', null)
  user.set('membershipBilling.subscriptionItemId', null)
  user.set('membershipBilling.subscriptionStatus', 'inactive')
  user.set('membershipBilling.serviceId', null)
  user.set('membershipBilling.currentPeriodStart', null)
  user.set('membershipBilling.currentPeriodEnd', null)
  user.set('membershipBilling.cancelAtPeriodEnd', false)
  user.set('membershipBilling.pendingPlan', getEmptyMembershipPendingPlan())
  user.set('membershipBilling.autoDowngradedAt', downgradedAt)
  clearMembershipDelinquencyState(user)

  user.membership = {
    ...(user.membership || {}),
    isActive: false,
    status: 'inactive',
    planName: null,
    planId: null,
    price: null,
    currency: user.membership?.currency || 'usd',
    serviceId: null,
    locationId: user.membership?.locationId || user.membershipBilling?.locationId || null,
    startedAt: null,
    expiresAt: null,
  }

  user.activeMembership = {
    ...(user.activeMembership || {}),
    isActive: false,
    status: 'inactive',
    planName: null,
    planId: null,
    startedAt: null,
    expiresAt: null,
    locationId:
      user.activeMembership?.locationId || user.membership?.locationId || null,
  }

  user.membershipStatus = 'inactive'
  await user.save()
}

const buildMembershipPlanId = (plan, fallback = null) =>
  `${plan?._id || plan?.planId || plan?.id || fallback || ''}`.trim() || null

const getLocationMembershipPlans = (location) => {
  const membership = normalizeMembershipForStripe(location?.membership || {})
  return Array.isArray(membership.plans) ? membership.plans : []
}

const getMembershipLocationIdFromRequest = (req) =>
  req.body?.locationId ||
  req.query?.locationId ||
  req.user?.membershipBilling?.locationId ||
  req.user?.membership?.locationId ||
  req.user?.selectedLocation?.locationId ||
  req.user?.spaLocation?.locationId ||
  null

const resolveMembershipLocationAndOwner = async (locationId) => {
  if (!locationId) {
    throw createError(400, 'Location ID is required for membership billing.')
  }

  const [location, spaOwner] = await Promise.all([
    Location.findOne({ locationId }),
    findStripeReadySpaOwnerByLocation(locationId),
  ])

  if (!location) {
    throw createError(404, 'Location not found')
  }

  if (!spaOwner) {
    throw createError(400, 'No Stripe-ready spa account found for this location')
  }

  if (!location?.membership?.isActive) {
    throw createError(400, 'Membership is not active for this location yet.')
  }

  return { location, spaOwner, stripeAccountId: spaOwner.stripe.accountId }
}

const findMembershipServiceForLocation = async ({ locationId, serviceId, planName = null }) => {
  if (serviceId) {
    const service = await Service.findById(serviceId)
    if (service && !service.isDeleted && service.status === 'active') {
      return service
    }
  }

  const services = await Service.find({
    locationId,
    isDeleted: { $ne: true },
    status: 'active',
  })

  return (
    services.find((service) => {
      if (!isMembershipServicePurchase(service)) return false
      if (!planName) return true
      return getActiveMembershipPricingEntries(service).some(
        (entry) =>
          `${entry?.membershipPlanName || ''}`.trim().toLowerCase() ===
          `${planName}`.trim().toLowerCase()
      )
    }) || null
  )
}

const resolveMembershipPlanForLocation = ({ location, planId, planName }) => {
  const plans = getLocationMembershipPlans(location)
  const requestedPlanId = `${planId || ''}`.trim()
  const requestedPlanName = `${planName || ''}`.trim().toLowerCase()
  const hasRequestedPlan = Boolean(requestedPlanId || requestedPlanName)

  const matchedPlan = hasRequestedPlan
    ? plans.find((plan, index) => {
        const candidatePlanId = buildMembershipPlanId(plan, `membership-plan-${index}`)
        if (requestedPlanId && candidatePlanId && candidatePlanId === requestedPlanId) {
          return true
        }

        if (requestedPlanName) {
          return `${plan?.name || ''}`.trim().toLowerCase() === requestedPlanName
        }

        return false
      })
    : plans[0]

  if (!matchedPlan) {
    throw createError(
      404,
      hasRequestedPlan
        ? 'Requested membership plan not found for this location'
        : 'Membership plan not found for this location'
    )
  }

  if (!matchedPlan.stripePriceId) {
    throw createError(
      400,
      'This membership plan is not connected to recurring Stripe billing yet.'
    )
  }

  return {
    ...matchedPlan,
    resolvedPlanId: buildMembershipPlanId(matchedPlan, matchedPlan.name),
    numericPrice: Number(matchedPlan.price || 0),
    currency: `${matchedPlan.currency || 'usd'}`.toLowerCase(),
  }
}

const isStripeMissingResourceError = (error, param = null) =>
  error?.type === 'StripeInvalidRequestError' &&
  error?.code === 'resource_missing' &&
  (param ? error?.param === param : true)

const isStripeMissingPriceError = (error) => {
  if (error?.type !== 'StripeInvalidRequestError' || error?.code !== 'resource_missing') {
    return false
  }

  const param = `${error?.param || ''}`.toLowerCase()
  const message = `${error?.message || ''}`.toLowerCase()
  return param.includes('price') || message.includes('no such price')
}

const isTestStripeSecretKey = () =>
  `${process.env.STRIPE_SECRET_KEY || ''}`.trim().startsWith('sk_test_')

const canAutoCreateMembershipTestPrice = () =>
  process.env.NODE_ENV !== 'production' && isTestStripeSecretKey()

const createEphemeralMembershipTestPrice = async ({
  plan,
  stripeAccountId,
  locationId = '',
}) => {
  const safeCurrency = `${plan?.currency || 'usd'}`.trim().toLowerCase() || 'usd'
  const safeAmount = Number(plan?.numericPrice || plan?.price || 0)
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw createError(400, 'Invalid membership amount configured for this plan.')
  }

  const product = await stripe.products.create(
    {
      name: `${plan?.name || 'Membership Plan'} (Test)`,
      description:
        'Auto-generated test-mode product because the configured plan price does not exist in this Stripe mode.',
      metadata: {
        source: 'membership_test_price_fallback',
        locationId: `${locationId || ''}`,
        planId: `${plan?.resolvedPlanId || ''}`,
        planName: `${plan?.name || ''}`,
      },
    },
    { stripeAccount: stripeAccountId }
  )

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: Math.round(safeAmount * 100),
      currency: safeCurrency,
      recurring: { interval: 'month' },
      metadata: {
        source: 'membership_test_price_fallback',
        locationId: `${locationId || ''}`,
        planId: `${plan?.resolvedPlanId || ''}`,
        planName: `${plan?.name || ''}`,
      },
    },
    { stripeAccount: stripeAccountId }
  )

  return {
    ...plan,
    stripeProductId: product.id,
    stripePriceId: price.id,
    isEphemeralTestPrice: true,
  }
}

const resolveBillableMembershipPlanForStripeAccount = async ({
  plan,
  stripeAccountId,
  locationId = '',
}) => {
  if (!plan?.stripePriceId) {
    throw createError(400, 'This membership plan is not connected to Stripe billing yet.')
  }

  try {
    await stripe.prices.retrieve(plan.stripePriceId, {}, { stripeAccount: stripeAccountId })
    return plan
  } catch (error) {
    if (!isStripeMissingResourceError(error, 'id') && !isStripeMissingPriceError(error)) {
      throw error
    }

    if (!canAutoCreateMembershipTestPrice()) {
      throw createError(
        400,
        'This membership plan is linked to a Stripe price from a different mode (live/test). Use matching Stripe keys or re-sync membership pricing for this environment.'
      )
    }

    const fallbackPlan = await createEphemeralMembershipTestPrice({
      plan,
      stripeAccountId,
      locationId,
    })
    return fallbackPlan
  }
}

const mapCardPaymentMethod = (paymentMethod, defaultPaymentMethodId = null) => ({
  id: paymentMethod.id,
  brand: paymentMethod.card?.brand || null,
  last4: paymentMethod.card?.last4 || null,
  expMonth: paymentMethod.card?.exp_month || null,
  expYear: paymentMethod.card?.exp_year || null,
  isDefault: Boolean(defaultPaymentMethodId && paymentMethod.id === defaultPaymentMethodId),
})

const syncMembershipDefaultPaymentMethodOnUser = async ({
  user,
  stripeAccountId,
  paymentMethod,
  locationId = null,
}) => {
  ensureMembershipBillingShape(user)
  user.set(
    'membershipBilling.stripeAccountId',
    stripeAccountId || user.membershipBilling?.stripeAccountId || null
  )
  user.set(
    'membershipBilling.locationId',
    locationId || user.membershipBilling?.locationId || null
  )
  user.set(
    'membershipBilling.defaultPaymentMethod',
    paymentMethod
      ? {
          paymentMethodId: paymentMethod.id,
          brand: paymentMethod.card?.brand || null,
          last4: paymentMethod.card?.last4 || null,
          expMonth: paymentMethod.card?.exp_month || null,
          expYear: paymentMethod.card?.exp_year || null,
        }
      : getEmptyMembershipDefaultPaymentMethod()
  )

  await user.save()
}

const ensureMembershipCustomer = async ({
  user,
  stripeAccountId,
  locationId,
}) => {
  const isMissingCustomerError = (error) => {
    const message = `${error?.message || ''}`.toLowerCase()
    return (
      error?.type === 'StripeInvalidRequestError' &&
      error?.code === 'resource_missing' &&
      (error?.param === 'customer' ||
        error?.param === 'id' ||
        message.includes('no such customer'))
    )
  }

  const existingCustomerId = user.membershipBilling?.stripeCustomerId
  const existingStripeAccountId = user.membershipBilling?.stripeAccountId

  if (existingCustomerId && existingStripeAccountId === stripeAccountId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(
        existingCustomerId,
        {},
        { stripeAccount: stripeAccountId }
      )

      if (existingCustomer && !existingCustomer.deleted) {
        return existingCustomerId
      }
    } catch (error) {
      if (!isMissingCustomerError(error)) {
        throw error
      }

      // Stale customer pointer (often test/live mismatch) - clear before recreating.
      user.set('membershipBilling.stripeCustomerId', null)
      user.set(
        'membershipBilling.defaultPaymentMethod',
        getEmptyMembershipDefaultPaymentMethod()
      )
      await user.save()
    }
  }

  const customer = await stripe.customers.create(
    {
      email: user.email,
      name: user.name || user.email,
      metadata: {
        userId: user._id.toString(),
        locationId: `${locationId || ''}`,
      },
    },
    { stripeAccount: stripeAccountId }
  )

  ensureMembershipBillingShape(user)
  user.set('membershipBilling.stripeCustomerId', customer.id)
  user.set('membershipBilling.stripeAccountId', stripeAccountId)
  user.set('membershipBilling.locationId', locationId)
  await user.save()

  return customer.id
}

const listMembershipPaymentMethods = async ({
  customerId,
  stripeAccountId,
}) => {
  const customer = await stripe.customers.retrieve(
    customerId,
    {},
    {
      stripeAccount: stripeAccountId,
    }
  )
  const defaultPaymentMethodId =
    customer?.invoice_settings?.default_payment_method || null
  const paymentMethodsResponse = await stripe.paymentMethods.list(
    {
      customer: customerId,
      type: 'card',
    },
    { stripeAccount: stripeAccountId }
  )

  return {
    defaultPaymentMethodId,
    paymentMethods: (paymentMethodsResponse?.data || []).map((paymentMethod) =>
      mapCardPaymentMethod(paymentMethod, defaultPaymentMethodId)
    ),
  }
}

const findMembershipUserByCustomer = async ({ customerId, stripeAccountId }) =>
  User.findOne({
    'membershipBilling.stripeCustomerId': customerId,
    'membershipBilling.stripeAccountId': stripeAccountId,
  })

const findMembershipUserBySubscription = async ({
  subscriptionId,
  stripeAccountId,
}) =>
  User.findOne({
    'membershipBilling.subscriptionId': subscriptionId,
    'membershipBilling.stripeAccountId': stripeAccountId,
  })

const resolveMembershipPlanFromPriceId = ({ location, priceId }) => {
  if (!location || !priceId) return null
  const plans = getLocationMembershipPlans(location)
  const matchedPlan = plans.find(
    (plan) => `${plan?.stripePriceId || ''}`.trim() === `${priceId}`.trim()
  )

  if (!matchedPlan) return null

  return {
    ...matchedPlan,
    resolvedPlanId: buildMembershipPlanId(matchedPlan, matchedPlan.name),
    numericPrice: Number(matchedPlan.price || 0),
    currency: `${matchedPlan.currency || 'usd'}`.toLowerCase(),
  }
}

const applyMembershipStateToUser = async ({
  user,
  locationId,
  serviceId = null,
  subscription = null,
  plan = null,
  invoice = null,
  stripeAccountId = null,
  defaultPaymentMethod = null,
  preserveCurrentPlan = false,
  clearPendingPlan = false,
}) => {
  ensureMembershipBillingShape(user)
  const subscriptionStatus = `${subscription?.status || user.membershipBilling?.subscriptionStatus || 'inactive'}`
    .trim()
    .toLowerCase()
  const currentPeriodStart =
    toDateFromUnix(subscription?.current_period_start) ||
    user.membershipBilling?.currentPeriodStart ||
    null
  const currentPeriodEnd =
    toDateFromUnix(subscription?.current_period_end) ||
    user.membershipBilling?.currentPeriodEnd ||
    null
  const isActiveMembership = MEMBERSHIP_ACTIVE_STATUSES.has(subscriptionStatus)
  const shouldShowMembership = MEMBERSHIP_VISIBLE_STATUSES.has(subscriptionStatus)
  const nextPlan = preserveCurrentPlan ? null : plan
  const membershipPlan =
    preserveCurrentPlan && user.membership?.planName ? null : plan

  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    clearMembershipDelinquencyState(user)
  }

  user.set(
    'membershipBilling.stripeAccountId',
    stripeAccountId || user.membershipBilling?.stripeAccountId || null
  )
  user.set(
    'membershipBilling.locationId',
    locationId || user.membershipBilling?.locationId || null
  )
  user.set(
    'membershipBilling.serviceId',
    serviceId || user.membershipBilling?.serviceId || null
  )
  user.set(
    'membershipBilling.subscriptionId',
    subscription?.id || user.membershipBilling?.subscriptionId || null
  )
  user.set(
    'membershipBilling.subscriptionItemId',
    subscription?.items?.data?.[0]?.id ||
      user.membershipBilling?.subscriptionItemId ||
      null
  )
  user.set('membershipBilling.subscriptionStatus', subscriptionStatus)
  user.set('membershipBilling.currentPeriodStart', currentPeriodStart)
  user.set('membershipBilling.currentPeriodEnd', currentPeriodEnd)
  user.set(
    'membershipBilling.cancelAtPeriodEnd',
    Boolean(subscription?.cancel_at_period_end ?? user.membershipBilling?.cancelAtPeriodEnd)
  )
  user.set(
    'membershipBilling.lastInvoiceId',
    invoice?.id || user.membershipBilling?.lastInvoiceId || null
  )
  user.set(
    'membershipBilling.lastInvoiceUrl',
    invoice?.hosted_invoice_url || user.membershipBilling?.lastInvoiceUrl || null
  )
  user.set(
    'membershipBilling.lastPaymentAt',
    (invoice?.status_transitions?.paid_at
      ? toDateFromUnix(invoice.status_transitions.paid_at)
      : null) ||
      user.membershipBilling?.lastPaymentAt ||
      null
  )
  user.set(
    'membershipBilling.defaultPaymentMethod',
    defaultPaymentMethod
      ? {
          paymentMethodId: defaultPaymentMethod.id,
          brand: defaultPaymentMethod.card?.brand || null,
          last4: defaultPaymentMethod.card?.last4 || null,
          expMonth: defaultPaymentMethod.card?.exp_month || null,
          expYear: defaultPaymentMethod.card?.exp_year || null,
        }
      : user.membershipBilling?.defaultPaymentMethod ||
          getEmptyMembershipDefaultPaymentMethod()
  )
  user.set(
    'membershipBilling.pendingPlan',
    clearPendingPlan
      ? getEmptyMembershipPendingPlan()
      : user.membershipBilling?.pendingPlan || getEmptyMembershipPendingPlan()
  )

  const currentPlanName = membershipPlan?.name || user.membership?.planName || null
  const currentPlanId =
    membershipPlan?.resolvedPlanId || user.membership?.planId || null
  const currentPrice =
    membershipPlan && Number.isFinite(Number(membershipPlan.numericPrice))
      ? Number(membershipPlan.numericPrice)
      : user.membership?.price ?? null
  const currentCurrency =
    membershipPlan?.currency || user.membership?.currency || 'usd'

  user.membership = {
    ...(user.membership || {}),
    isActive: isActiveMembership,
    status: shouldShowMembership ? subscriptionStatus : 'inactive',
    planName: currentPlanName,
    planId: currentPlanId,
    price: currentPrice,
    currency: currentCurrency,
    serviceId: serviceId || user.membership?.serviceId || null,
    locationId: locationId || user.membership?.locationId || null,
    startedAt: currentPeriodStart || user.membership?.startedAt || null,
    expiresAt: currentPeriodEnd || user.membership?.expiresAt || null,
    lastPaymentAt:
      user.membershipBilling?.lastPaymentAt || user.membership?.lastPaymentAt || null,
  }
  user.membershipStatus = shouldShowMembership ? subscriptionStatus : 'inactive'
  user.activeMembership = {
    ...(user.activeMembership || {}),
    isActive: isActiveMembership,
    status: shouldShowMembership ? subscriptionStatus : 'inactive',
    planName: currentPlanName,
    planId: currentPlanId,
    startedAt: currentPeriodStart || user.activeMembership?.startedAt || null,
    expiresAt: currentPeriodEnd || user.activeMembership?.expiresAt || null,
    locationId: locationId || user.activeMembership?.locationId || null,
  }

  await user.save()
}

const buildMembershipSummaryResponse = async ({
  user,
  locationId,
  stripeAccountId = null,
  paymentMethods = [],
}) => {
  const membership = user.membership || {}
  const billing = user.membershipBilling || {}
  const resolvedDefaultMethod =
    paymentMethods.find(
      (method) =>
        method.id === billing?.defaultPaymentMethod?.paymentMethodId && method.isDefault
    ) ||
    (billing?.defaultPaymentMethod?.paymentMethodId
      ? {
          id: billing.defaultPaymentMethod.paymentMethodId,
          brand: billing.defaultPaymentMethod.brand,
          last4: billing.defaultPaymentMethod.last4,
          expMonth: billing.defaultPaymentMethod.expMonth,
          expYear: billing.defaultPaymentMethod.expYear,
          isDefault: true,
        }
      : null)

  return {
    locationId: locationId || billing.locationId || membership.locationId || null,
    stripeAccountId: stripeAccountId || billing.stripeAccountId || null,
    customerId: billing.stripeCustomerId || null,
    paymentMethods,
    defaultPaymentMethod: resolvedDefaultMethod,
    hasPaymentMethod: paymentMethods.length > 0 || Boolean(resolvedDefaultMethod),
    membership: {
      isActive: Boolean(membership.isActive),
      status: membership.status || 'inactive',
      planName: membership.planName || null,
      planId: membership.planId || null,
      price: membership.price ?? null,
      currency: membership.currency || 'usd',
      startedAt: membership.startedAt || null,
      expiresAt: membership.expiresAt || null,
      lastPaymentAt: membership.lastPaymentAt || billing.lastPaymentAt || null,
    },
    subscription: {
      id: billing.subscriptionId || null,
      status: billing.subscriptionStatus || 'inactive',
      currentPeriodStart: billing.currentPeriodStart || null,
      currentPeriodEnd: billing.currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(billing.cancelAtPeriodEnd),
      lastInvoiceId: billing.lastInvoiceId || null,
      lastInvoiceUrl: billing.lastInvoiceUrl || null,
      pendingPlan: billing.pendingPlan || null,
    },
  }
}

// ==================== STRIPE CONNECT FUNCTIONS ====================

/**
 * Create a Stripe Connect account for a spa user (spa owner)
 */
export const createConnectAccount = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Only spa role can connect Stripe accounts
    if (user.role !== 'spa') {
      return next(
        createError(
          403,
          'Only spa owners (spa role) can connect Stripe accounts'
        )
      )
    }

    // Check if user already has a Stripe account
    if (user.stripe?.accountId) {
      return next(createError(400, 'Stripe account already connected'))
    }

    // Check if spa location is configured
    if (!user.spaLocation?.locationId) {
      return next(createError(400, 'Please configure your spa location first'))
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        name: user.spaLocation.locationName,
        support_email: user.spaLocation.locationEmail || user.email,
        support_phone: user.spaLocation.locationPhone,
      },
      metadata: {
        userId: user._id.toString(),
        locationId: user.spaLocation.locationId,
        locationName: user.spaLocation.locationName,
      },
    })

    // Update user with Stripe account info
    user.stripe = {
      accountId: account.id,
      accountStatus: 'pending',
      onboardingCompleted: false,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      connectedAt: new Date(),
      lastUpdated: new Date(),
    }

    await user.save()

    res.status(201).json({
      success: true,
      message: 'Stripe Connect account created successfully',
      accountId: account.id,
    })
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    next(error)
  }
}

/**
 * Create an account link for Stripe Connect onboarding
 */
export const createAccountLink = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user || !user.stripe?.accountId) {
      return next(
        createError(400, 'No Stripe account found. Please create one first.')
      )
    }

    const { returnUrl, refreshUrl } = req.body

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: user.stripe.accountId,
      refresh_url:
        refreshUrl || `${process.env.CLIENT_URL}/management?stripe=refresh`,
      return_url:
        returnUrl || `${process.env.CLIENT_URL}/management?stripe=success`,
      type: 'account_onboarding',
    })

    res.status(200).json({
      success: true,
      url: accountLink.url,
    })
  } catch (error) {
    console.error('Error creating account link:', error)
    next(error)
  }
}

/**
 * Get Stripe Connect account status
 */
export const getAccountStatus = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (!user.stripe?.accountId) {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'No Stripe account connected',
      })
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(user.stripe.accountId)

    // Update user's Stripe info
    user.stripe.chargesEnabled = account.charges_enabled
    user.stripe.payoutsEnabled = account.payouts_enabled
    user.stripe.detailsSubmitted = account.details_submitted
    user.stripe.onboardingCompleted =
      account.details_submitted && account.charges_enabled
    user.stripe.accountStatus = account.charges_enabled ? 'active' : 'pending'
    user.stripe.lastUpdated = new Date()

    await user.save()
    try {
      await autoActivatePendingMembershipForSpa(user)
    } catch (membershipSyncError) {
      console.error(
        'Auto-activation failed after Stripe status refresh:',
        membershipSyncError
      )
    }

    res.status(200).json({
      success: true,
      connected: true,
      account: {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        onboardingCompleted: user.stripe.onboardingCompleted,
        status: user.stripe.accountStatus,
        email: account.email,
        businessProfile: account.business_profile,
      },
    })
  } catch (error) {
    console.error('Error fetching account status:', error)
    next(error)
  }
}

/**
 * Disconnect Stripe account
 */
export const disconnectAccount = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user || !user.stripe?.accountId) {
      return next(createError(400, 'No Stripe account connected'))
    }

    // Delete the account from Stripe
    await stripe.accounts.del(user.stripe.accountId)

    // Clear Stripe info from user
    user.stripe = {
      accountId: null,
      accountStatus: null,
      onboardingCompleted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      connectedAt: null,
      lastUpdated: new Date(),
    }

    await user.save()

    res.status(200).json({
      success: true,
      message: 'Stripe account disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting Stripe account:', error)
    next(error)
  }
}

/**
 * Get account dashboard link
 */
export const getAccountDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user || !user.stripe?.accountId) {
      return next(createError(400, 'No Stripe account connected'))
    }

    const account = await stripe.accounts.retrieve(user.stripe.accountId)

    // Stripe Express login links are only available after onboarding details are submitted.
    if (!account.details_submitted) {
      return next(
        createError(
          409,
          'Complete Stripe onboarding before opening the Stripe dashboard.'
        )
      )
    }

    // Create login link for Stripe Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      user.stripe.accountId
    )

    res.status(200).json({
      success: true,
      url: loginLink.url,
    })
  } catch (error) {
    console.error('Error creating dashboard link:', error)
    next(error)
  }
}

// ==================== PAYMENT FUNCTIONS ====================

export const getMembershipBillingSummary = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    if (!locationId) {
      return res.status(200).json({
        success: true,
        summary: await buildMembershipSummaryResponse({ user, locationId: null }),
      })
    }

    let paymentMethods = []
    const billingLocationMatches =
      user.membershipBilling?.locationId &&
      `${user.membershipBilling.locationId}`.trim() === `${locationId}`.trim()
    const stripeAccountId = billingLocationMatches
      ? user.membershipBilling?.stripeAccountId
      : null

    if (user.membershipBilling?.stripeCustomerId && stripeAccountId) {
      try {
        const paymentMethodState = await listMembershipPaymentMethods({
          customerId: user.membershipBilling.stripeCustomerId,
          stripeAccountId,
        })
        paymentMethods = paymentMethodState.paymentMethods
      } catch (paymentMethodError) {
        console.error('Failed to load membership payment methods:', paymentMethodError)
      }
    }

    res.status(200).json({
      success: true,
      summary: await buildMembershipSummaryResponse({
        user,
        locationId,
        stripeAccountId,
        paymentMethods,
      }),
    })
  } catch (error) {
    console.error('Error fetching membership billing summary:', error)
    next(error)
  }
}

export const createMembershipSetupIntent = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    const { stripeAccountId } = await resolveMembershipLocationAndOwner(locationId)
    const customerId = await ensureMembershipCustomer({
      user,
      stripeAccountId,
      locationId,
    })

    let setupIntent
    try {
      setupIntent = await stripe.setupIntents.create(
        {
          customer: customerId,
          payment_method_types: ['card'],
          usage: 'off_session',
          metadata: {
            userId: user._id.toString(),
            locationId: `${locationId}`,
            membershipSetup: 'true',
          },
        },
        { stripeAccount: stripeAccountId }
      )
    } catch (stripeError) {
      const stripeMessage = `${stripeError?.message || ''}`.toLowerCase()
      const shouldRegenerateCustomer =
        stripeError?.type === 'StripeInvalidRequestError' &&
        stripeError?.code === 'resource_missing' &&
        (stripeError?.param === 'customer' ||
          stripeError?.param === 'id' ||
          stripeMessage.includes('no such customer'))

      if (!shouldRegenerateCustomer) {
        throw stripeError
      }

      // Recover automatically when stored customer is stale (deleted / wrong mode).
      user.set('membershipBilling.stripeCustomerId', null)
      user.set(
        'membershipBilling.defaultPaymentMethod',
        getEmptyMembershipDefaultPaymentMethod()
      )
      await user.save()

      const regeneratedCustomerId = await ensureMembershipCustomer({
        user,
        stripeAccountId,
        locationId,
      })

      setupIntent = await stripe.setupIntents.create(
        {
          customer: regeneratedCustomerId,
          payment_method_types: ['card'],
          usage: 'off_session',
          metadata: {
            userId: user._id.toString(),
            locationId: `${locationId}`,
            membershipSetup: 'true',
          },
        },
        { stripeAccount: stripeAccountId }
      )
    }

    res.status(201).json({
      success: true,
      clientSecret: setupIntent.client_secret,
      customerId,
      stripeAccountId,
    })
  } catch (error) {
    console.error('Error creating membership setup intent:', error)
    next(error)
  }
}

export const getMembershipPaymentMethods = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    const billingLocationMatches =
      locationId &&
      user.membershipBilling?.locationId &&
      `${user.membershipBilling.locationId}`.trim() === `${locationId}`.trim()

    if (
      !user.membershipBilling?.stripeCustomerId ||
      !user.membershipBilling?.stripeAccountId ||
      !billingLocationMatches
    ) {
      return res.status(200).json({
        success: true,
        paymentMethods: [],
        defaultPaymentMethodId: null,
      })
    }

    const paymentMethodState = await listMembershipPaymentMethods({
      customerId: user.membershipBilling.stripeCustomerId,
      stripeAccountId: user.membershipBilling.stripeAccountId,
    })

    res.status(200).json({
      success: true,
      ...paymentMethodState,
    })
  } catch (error) {
    console.error('Error fetching membership payment methods:', error)
    next(error)
  }
}

export const setMembershipDefaultPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.body
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (!paymentMethodId) {
      return next(createError(400, 'paymentMethodId is required'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    const billingLocationMatches =
      locationId &&
      user.membershipBilling?.locationId &&
      `${user.membershipBilling.locationId}`.trim() === `${locationId}`.trim()

    if (
      !user.membershipBilling?.stripeCustomerId ||
      !user.membershipBilling?.stripeAccountId ||
      !billingLocationMatches
    ) {
      return next(createError(400, 'No saved membership billing profile found'))
    }

    const stripeAccountId = user.membershipBilling.stripeAccountId

    await stripe.customers.update(
      user.membershipBilling.stripeCustomerId,
      {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      },
      { stripeAccount: stripeAccountId }
    )

    if (user.membershipBilling?.subscriptionId) {
      await stripe.subscriptions.update(
        user.membershipBilling.subscriptionId,
        {
          default_payment_method: paymentMethodId,
        },
        { stripeAccount: stripeAccountId }
      )
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(
      paymentMethodId,
      {},
      {
        stripeAccount: stripeAccountId,
      }
    )
    await syncMembershipDefaultPaymentMethodOnUser({
      user,
      stripeAccountId,
      paymentMethod,
      locationId,
    })

    const paymentMethodState = await listMembershipPaymentMethods({
      customerId: user.membershipBilling.stripeCustomerId,
      stripeAccountId,
    })

    res.status(200).json({
      success: true,
      message: 'Default payment method updated successfully',
      ...paymentMethodState,
    })
  } catch (error) {
    console.error('Error setting membership default payment method:', error)
    next(error)
  }
}

export const removeMembershipPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.body
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (!paymentMethodId) {
      return next(createError(400, 'paymentMethodId is required'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    const billingLocationMatches =
      locationId &&
      user.membershipBilling?.locationId &&
      `${user.membershipBilling.locationId}`.trim() === `${locationId}`.trim()

    if (
      !user.membershipBilling?.stripeCustomerId ||
      !user.membershipBilling?.stripeAccountId ||
      !billingLocationMatches
    ) {
      return next(createError(400, 'No saved membership billing profile found'))
    }

    const stripeAccountId = user.membershipBilling.stripeAccountId
    const paymentMethodState = await listMembershipPaymentMethods({
      customerId: user.membershipBilling.stripeCustomerId,
      stripeAccountId,
    })
    const paymentMethods = paymentMethodState.paymentMethods || []
    const targetMethod = paymentMethods.find((method) => method.id === paymentMethodId)

    if (!targetMethod) {
      return next(createError(404, 'Saved card not found'))
    }

    const visibleSubscriptionStatuses = ['active', 'trialing', 'past_due', 'incomplete', 'unpaid']
    const hasSubscriptionRequiringCard =
      user.membershipBilling?.subscriptionId &&
      visibleSubscriptionStatuses.includes(
        `${user.membershipBilling?.subscriptionStatus || ''}`.toLowerCase()
      )

    if (hasSubscriptionRequiringCard && paymentMethods.length === 1) {
      return next(
        createError(
          400,
          'You cannot remove the only saved card while your membership subscription is active.'
        )
      )
    }

    const fallbackDefaultMethod = paymentMethods.find(
      (method) => method.id !== paymentMethodId
    )

    if (targetMethod.isDefault) {
      const nextDefaultMethodId = fallbackDefaultMethod?.id || null

      await stripe.customers.update(
        user.membershipBilling.stripeCustomerId,
        {
          invoice_settings: {
            default_payment_method: nextDefaultMethodId,
          },
        },
        { stripeAccount: stripeAccountId }
      )

      if (user.membershipBilling?.subscriptionId) {
        await stripe.subscriptions.update(
          user.membershipBilling.subscriptionId,
          {
            default_payment_method: nextDefaultMethodId,
          },
          { stripeAccount: stripeAccountId }
        )
      }

      if (nextDefaultMethodId) {
        const nextDefaultMethod = await stripe.paymentMethods.retrieve(
          nextDefaultMethodId,
          {},
          {
            stripeAccount: stripeAccountId,
          }
        )
        await syncMembershipDefaultPaymentMethodOnUser({
          user,
          stripeAccountId,
          paymentMethod: nextDefaultMethod,
          locationId,
        })
      } else {
        await syncMembershipDefaultPaymentMethodOnUser({
          user,
          stripeAccountId,
          paymentMethod: null,
          locationId,
        })
      }
    }

    await stripe.paymentMethods.detach(paymentMethodId, {
      stripeAccount: stripeAccountId,
    })

    const refreshedPaymentMethodState = await listMembershipPaymentMethods({
      customerId: user.membershipBilling.stripeCustomerId,
      stripeAccountId,
    })

    if ((refreshedPaymentMethodState.paymentMethods || []).length === 0) {
      await syncMembershipDefaultPaymentMethodOnUser({
        user,
        stripeAccountId,
        paymentMethod: null,
        locationId,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Saved card removed successfully',
      ...refreshedPaymentMethodState,
    })
  } catch (error) {
    console.error('Error removing membership payment method:', error)
    next(error)
  }
}

export const createMembershipSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    const { serviceId, planId, planName } = req.body

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    const { location, stripeAccountId } =
      await resolveMembershipLocationAndOwner(locationId)
    const service = await findMembershipServiceForLocation({
      locationId,
      serviceId,
      planName,
    })

    if (!service || !isMembershipServicePurchase(service)) {
      return next(createError(404, 'Membership service not found for this location'))
    }

    const resolvedPlan = resolveMembershipPlanForLocation({
      location,
      planId,
      planName,
    })
    const plan = await resolveBillableMembershipPlanForStripeAccount({
      plan: resolvedPlan,
      stripeAccountId,
      locationId,
    })
    const customerId = await ensureMembershipCustomer({
      user,
      stripeAccountId,
      locationId,
    })
    const paymentMethodState = await listMembershipPaymentMethods({
      customerId,
      stripeAccountId,
    })

    if (paymentMethodState.paymentMethods.length === 0) {
      return next(createError(400, 'Add a card before buying a membership plan.'))
    }

    const defaultPaymentMethodId =
      paymentMethodState.defaultPaymentMethodId ||
      paymentMethodState.paymentMethods[0]?.id ||
      null

    if (!defaultPaymentMethodId) {
      return next(createError(400, 'No default card found for membership billing.'))
    }

    if (
      user.membershipBilling?.subscriptionId &&
      MEMBERSHIP_VISIBLE_STATUSES.has(
        `${user.membershipBilling.subscriptionStatus || ''}`.toLowerCase()
      )
    ) {
      return next(
        createError(
          409,
          'You already have a membership subscription. Use upgrade or downgrade instead.'
        )
      )
    }

    let activePlan = plan
    let subscription = null

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        subscription = await stripe.subscriptions.create(
          {
            customer: customerId,
            items: [{ price: activePlan.stripePriceId }],
            default_payment_method: defaultPaymentMethodId,
            collection_method: 'charge_automatically',
            payment_behavior: 'error_if_incomplete',
            metadata: {
              userId: user._id.toString(),
              locationId: `${locationId}`,
              serviceId: service._id.toString(),
              planId: `${activePlan.resolvedPlanId || ''}`,
              planName: `${activePlan.name || ''}`,
            },
            expand: ['default_payment_method', 'items.data.price'],
          },
          { stripeAccount: stripeAccountId }
        )
        break
      } catch (subscriptionCreateError) {
        if (
          attempt === 0 &&
          !activePlan?.isEphemeralTestPrice &&
          isStripeMissingPriceError(subscriptionCreateError) &&
          canAutoCreateMembershipTestPrice()
        ) {
          activePlan = await createEphemeralMembershipTestPrice({
            plan: activePlan,
            stripeAccountId,
            locationId,
          })
          continue
        }

        throw subscriptionCreateError
      }
    }

    if (!subscription) {
      throw createError(500, 'Unable to create membership subscription at the moment.')
    }

    const defaultPaymentMethod = await stripe.paymentMethods.retrieve(
      defaultPaymentMethodId,
      {},
      {
        stripeAccount: stripeAccountId,
      }
    )

    await applyMembershipStateToUser({
      user,
      locationId,
      serviceId: service._id,
      subscription,
      plan: activePlan,
      stripeAccountId,
      defaultPaymentMethod,
      clearPendingPlan: true,
    })

    res.status(201).json({
      success: true,
      message: 'Membership subscription created successfully',
      subscriptionId: subscription.id,
    })
  } catch (error) {
    console.error('Error creating membership subscription:', error)
    if (isStripeMissingPriceError(error)) {
      return next(
        createError(
          400,
          'This membership plan pricing is out of sync with the current Stripe mode (test/live). Please retry after refreshing billing data.'
        )
      )
    }
    next(error)
  }
}

export const changeMembershipSubscriptionPlan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    const { planId, planName } = req.body

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (
      !user.membershipBilling?.subscriptionId ||
      !user.membershipBilling?.stripeAccountId
    ) {
      return next(createError(400, 'No active membership subscription found'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    const { location } = await resolveMembershipLocationAndOwner(locationId)
    const resolvedPlan = resolveMembershipPlanForLocation({ location, planId, planName })
    const stripeAccountId = user.membershipBilling.stripeAccountId
    const plan = await resolveBillableMembershipPlanForStripeAccount({
      plan: resolvedPlan,
      stripeAccountId,
      locationId,
    })

    const subscription = await stripe.subscriptions.retrieve(
      user.membershipBilling.subscriptionId,
      {
        expand: ['items.data.price'],
      },
      {
        stripeAccount: stripeAccountId,
      }
    )

    const currentPriceId = subscription?.items?.data?.[0]?.price?.id || null
    if (!currentPriceId) {
      return next(
        createError(
          400,
          'Current membership plan pricing could not be resolved for this subscription.'
        )
      )
    }
    if (currentPriceId && currentPriceId === plan.stripePriceId) {
      return next(createError(400, 'You are already on this membership plan'))
    }

    const currentPeriodEndUnix = Number(subscription?.current_period_end || 0)
    if (!Number.isFinite(currentPeriodEndUnix) || currentPeriodEndUnix <= 0) {
      return next(
        createError(
          400,
          'Unable to schedule this membership change because the current billing period is unknown.'
        )
      )
    }

    const subscriptionQuantity = Number(subscription?.items?.data?.[0]?.quantity || 1)
    const currentPeriodStartUnix = Number(
      subscription?.current_period_start || Math.floor(Date.now() / 1000)
    )

    let scheduleId =
      typeof subscription.schedule === 'string'
        ? subscription.schedule
        : subscription.schedule?.id || null

    if (!scheduleId) {
      const createdSchedule = await stripe.subscriptionSchedules.create(
        {
          from_subscription: user.membershipBilling.subscriptionId,
        },
        { stripeAccount: stripeAccountId }
      )
      scheduleId = createdSchedule.id
    }

    const schedule = await stripe.subscriptionSchedules.retrieve(
      scheduleId,
      {},
      { stripeAccount: stripeAccountId }
    )
    const currentPhaseStartUnix = Number(
      schedule?.current_phase?.start_date || currentPeriodStartUnix
    )

    let activePlan = plan
    let updateApplied = false

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await stripe.subscriptionSchedules.update(
          scheduleId,
          {
            end_behavior: 'release',
            phases: [
              {
                start_date: currentPhaseStartUnix,
                end_date: currentPeriodEndUnix,
                items: [
                  {
                    price: currentPriceId,
                    quantity: Number.isFinite(subscriptionQuantity) ? subscriptionQuantity : 1,
                  },
                ],
                proration_behavior: 'none',
              },
              {
                start_date: currentPeriodEndUnix,
                items: [
                  {
                    price: activePlan.stripePriceId,
                    quantity: Number.isFinite(subscriptionQuantity) ? subscriptionQuantity : 1,
                  },
                ],
                proration_behavior: 'none',
              },
            ],
          },
          { stripeAccount: stripeAccountId }
        )
        updateApplied = true
        break
      } catch (scheduleUpdateError) {
        if (
          attempt === 0 &&
          !activePlan?.isEphemeralTestPrice &&
          isStripeMissingPriceError(scheduleUpdateError) &&
          canAutoCreateMembershipTestPrice()
        ) {
          activePlan = await createEphemeralMembershipTestPrice({
            plan: activePlan,
            stripeAccountId,
            locationId,
          })
          continue
        }

        throw scheduleUpdateError
      }
    }

    if (!updateApplied) {
      throw createError(500, 'Unable to update membership plan at the moment.')
    }

    ensureMembershipBillingShape(user)
    user.set('membershipBilling.pendingPlan', {
      planId: activePlan.resolvedPlanId,
      planName: activePlan.name,
      price: activePlan.numericPrice,
      currency: activePlan.currency,
      effectiveAt: toDateFromUnix(currentPeriodEndUnix),
    })
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Membership plan update scheduled for your next renewal',
      pendingPlan: user.membershipBilling.pendingPlan,
    })
  } catch (error) {
    console.error('Error changing membership subscription plan:', error)
    if (isStripeMissingPriceError(error)) {
      return next(
        createError(
          400,
          'This membership plan pricing is out of sync with the current Stripe mode (test/live). Please retry after refreshing billing data.'
        )
      )
    }
    next(error)
  }
}

export const getMembershipInvoices = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    const billingLocationMatches =
      locationId &&
      user.membershipBilling?.locationId &&
      `${user.membershipBilling.locationId}`.trim() === `${locationId}`.trim()

    if (
      !user.membershipBilling?.stripeCustomerId ||
      !user.membershipBilling?.stripeAccountId ||
      !billingLocationMatches
    ) {
      return res.status(200).json({
        success: true,
        invoices: [],
      })
    }

    const invoices = await stripe.invoices.list(
      {
        customer: user.membershipBilling.stripeCustomerId,
        limit: 20,
        subscription: user.membershipBilling.subscriptionId || undefined,
      },
      { stripeAccount: user.membershipBilling.stripeAccountId }
    )

    res.status(200).json({
      success: true,
      invoices: (invoices?.data || []).map((invoice) => ({
        id: invoice.id,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdf: invoice.invoice_pdf || null,
        paidAt: invoice.status_transitions?.paid_at
          ? toDateFromUnix(invoice.status_transitions.paid_at)
          : null,
        createdAt: invoice.created ? toDateFromUnix(invoice.created) : null,
        billingReason: invoice.billing_reason || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching membership invoices:', error)
    next(error)
  }
}

export const createMembershipBillingPortalSession = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    const locationId = getMembershipLocationIdFromRequest(req)
    const billingLocationMatches =
      locationId &&
      user.membershipBilling?.locationId &&
      `${user.membershipBilling.locationId}`.trim() === `${locationId}`.trim()

    if (
      !user.membershipBilling?.stripeCustomerId ||
      !user.membershipBilling?.stripeAccountId ||
      !billingLocationMatches
    ) {
      return next(createError(400, 'No membership billing profile found for this location'))
    }

    const returnUrl =
      req.body?.returnUrl || `${process.env.CLIENT_URL || ''}/membership`

    const session = await stripe.billingPortal.sessions.create(
      {
        customer: user.membershipBilling.stripeCustomerId,
        return_url: returnUrl,
      },
      {
        stripeAccount: user.membershipBilling.stripeAccountId,
      }
    )

    res.status(201).json({
      success: true,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating membership billing portal session:', error)
    next(error)
  }
}

/**
 * Create a Stripe Checkout session for service booking (with redirect)
 * Handles both single service and multiple services (cart checkout)
 */
export const createCheckoutSession = async (req, res, next) => {
  try {
    const customerId = req.user.id
    const {
      items,
      locationId: cartLocationId,
      userRewardId: cartUserRewardId,
      checkoutUiMode,
    } = req.body
    const useEmbeddedCheckout = `${checkoutUiMode || ''}`.trim().toLowerCase() === 'embedded'
    console.log(customerId)
    // Check if this is a cart checkout (multiple items) or single service
    const isCartCheckout = Array.isArray(items) && items.length > 0

    if (isCartCheckout) {
      // === CART CHECKOUT - MULTIPLE SERVICES ===
      if (!cartLocationId) {
        return next(createError(400, 'Location ID is required'))
      }

      const bookings = []
      const lineItems = []
      let totalAmount = 0
      let spaOwnerId = null
      const spaOwnerCacheByLocation = new Map()

      // Apply Reward if provided (Cart Checkout)
      let cartDiscountAmount = 0
      let appliedReward = null

      if (cartUserRewardId) {
        appliedReward = await UserReward.findOne({
          _id: cartUserRewardId,
          userId: customerId,
          status: 'active',
        })

        if (!appliedReward) {
          return next(createError(404, 'Selected reward not found or not active'))
        }

        if (appliedReward.isExpired) {
          appliedReward.status = 'expired'
          await appliedReward.save()
          return next(createError(400, 'Selected reward has expired'))
        }

        // Calculate total cart value to check minPurchase if applicable
        const cartSubtotal = items.reduce((sum, item) => sum + item.price, 0)
        if (
          appliedReward.rewardSnapshot.minPurchase &&
          cartSubtotal < appliedReward.rewardSnapshot.minPurchase
        ) {
          return next(
            createError(
              400,
              `Minimum purchase of $${appliedReward.rewardSnapshot.minPurchase} required for this reward`
            )
          )
        }

        // Calculate discount for the entire cart or applicable items
        // For 'credit', it's absolute. For 'discount', it's percentage of sum.
        const rewardType = appliedReward.rewardSnapshot.type
        const rewardValue = appliedReward.rewardSnapshot.value

        if (rewardType === 'credit' || rewardType === 'referral') {
          cartDiscountAmount = Math.min(rewardValue, cartSubtotal)
        } else if (
          ['discount', 'service_discount', 'combo'].includes(rewardType)
        ) {
          // Check if reward is service-specific
          const serviceId = appliedReward.rewardSnapshot.serviceId
          const serviceIds = appliedReward.rewardSnapshot.serviceIds || []

          if (serviceId || serviceIds.length > 0) {
            // Apply only to specific services in cart
            const applicableTotal = items
              .filter(
                (item) =>
                  item.serviceId === serviceId?.toString() ||
                  serviceIds.some((id) => id.toString() === item.serviceId)
              )
              .reduce((sum, item) => sum + item.price, 0)

            cartDiscountAmount = (applicableTotal * rewardValue) / 100
          } else {
            // Apply to all items
            cartDiscountAmount = (cartSubtotal * rewardValue) / 100
          }

          if (
            appliedReward.rewardSnapshot.maxValue &&
            cartDiscountAmount > appliedReward.rewardSnapshot.maxValue
          ) {
            cartDiscountAmount = appliedReward.rewardSnapshot.maxValue
          }
        } else if (rewardType === 'service' || rewardType === 'free_service') {
          // Find the most expensive applicable service and make it free
          const serviceId = appliedReward.rewardSnapshot.serviceId
          const serviceIds = appliedReward.rewardSnapshot.serviceIds || []

          const applicableItems = items.filter(
            (item) =>
              item.serviceId === serviceId?.toString() ||
              serviceIds.some((id) => id.toString() === item.serviceId)
          )

          if (applicableItems.length > 0) {
            const freeItem = applicableItems.reduce((prev, curr) =>
              prev.price > curr.price ? prev : curr
            )
            cartDiscountAmount = freeItem.price
          }
        }
      }

      const totalCartDiscount = cartDiscountAmount

      // Process each cart item and distribute discount
      // For simplicity in cart checkout, we can apply the total discount as a negative line item 
      // OR reduce unit prices. Stripe doesn't support negative line items easily in checkout sessions.
      // Better: redistribute totalCartDiscount across items proportionally or apply to subtotal.
      
      const cartSubtotal = items.reduce((sum, item) => sum + item.price, 0)
      
      for (const item of items) {
        const service = await Service.findById(item.serviceId).populate(
          'createdBy'
        )

        if (!service || service.status !== 'active' || service.isDeleted) {
          return next(
            createError(
              404,
              `Service ${item.serviceName} not found or inactive`
            )
          )
        }

        const checkoutLocationId = item.locationId || cartLocationId
        let spaOwner = spaOwnerCacheByLocation.get(checkoutLocationId)
        if (!spaOwner) {
          spaOwner = await findStripeReadySpaOwnerByLocation(checkoutLocationId)
          if (spaOwner) {
            spaOwnerCacheByLocation.set(checkoutLocationId, spaOwner)
          }
        }

        if (!spaOwner) {
          return next(
            createError(
              400,
              `No Stripe-ready spa account found for location ${checkoutLocationId}`
            )
          )
        }

        // For simplicity, all services should be from same spa owner
        if (!spaOwnerId) {
          spaOwnerId = spaOwner._id.toString()
        } else if (spaOwnerId !== spaOwner._id.toString()) {
          return next(
            createError(400, 'All services must be from the same spa location')
          )
        }

        // Distribute discount proportionally to each item for booking records
        const itemProportion = cartSubtotal > 0 ? item.price / cartSubtotal : 0
        const itemDiscount = totalCartDiscount * itemProportion
        const itemFinalPrice = Math.max(0, item.price - itemDiscount)
        const itemDuration = Number.parseInt(item.duration, 10) || service.duration

        await assertSlotAvailable({
          locationId: checkoutLocationId,
          date: item.date,
          time: item.time,
          duration: itemDuration,
          service,
        })

        const ghlCalendar = getServiceCalendarSelection(service)

        const amount = Math.round(itemFinalPrice * 100) // Convert to cents

        totalAmount += amount

        // Create temporary booking
        const booking = await Booking.create({
          userId: customerId,
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          servicePrice: item.price,
          finalPrice: itemFinalPrice,
          discountApplied: itemDiscount,
          rewardUsed: cartUserRewardId || null,
          pointsUsed: 0,
          date: new Date(item.date),
          time: item.time,
          duration: itemDuration,
          locationId: checkoutLocationId,
          notes: item.notes || '',
          status: 'scheduled',
          paymentStatus: 'pending',
          ghl: {
            calendarId: ghlCalendar.calendarId,
            calendarName: ghlCalendar.name,
            timeZone: ghlCalendar.timeZone,
            userId: ghlCalendar.userId,
            teamId: ghlCalendar.teamId,
          },
        })

        bookings.push(booking)

        // Add line item for Stripe
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${item.serviceName}`,
              description: `Booking on ${new Date(
                item.date
              ).toLocaleDateString()} at ${item.time}${itemDiscount > 0 ? ' (Discount Applied)' : ''}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        })
      }

      // Get spa owner for payment
      const checkoutSpaOwner = await User.findById(spaOwnerId)

      // Create Stripe Checkout Session
      const successUrl = `${process.env.CLIENT_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${process.env.CLIENT_URL}/cart`

      const checkoutSessionPayload = {
        payment_method_types: ['card', 'afterpay_clearpay'],
        line_items: lineItems,
        mode: 'payment',
        customer_email: req.user.email,
        payment_intent_data: {
          transfer_data: {
            destination: checkoutSpaOwner.stripe.accountId,
          },
          metadata: {
            customerId: customerId.toString(),
            spaOwnerId: checkoutSpaOwner._id.toString(),
            bookingIds: bookings.map((b) => b._id.toString()).join(','),
            userRewardId: cartUserRewardId || '',
            isCartCheckout: 'true',
          },
        },
        metadata: {
          customerId: customerId.toString(),
          bookingIds: bookings.map((b) => b._id.toString()).join(','),
          userRewardId: cartUserRewardId || '',
          isCartCheckout: 'true',
        },
      }

      if (useEmbeddedCheckout) {
        checkoutSessionPayload.ui_mode = 'embedded'
        checkoutSessionPayload.return_url = successUrl
        checkoutSessionPayload.redirect_on_completion = 'always'
      } else {
        checkoutSessionPayload.success_url = successUrl
        checkoutSessionPayload.cancel_url = cancelUrl
      }

      const session = await stripe.checkout.sessions.create(checkoutSessionPayload)

      // Update bookings with session ID
      await Promise.all(
        bookings.map((booking) => {
          booking.stripeSessionId = session.id
          return booking.save()
        })
      )

      return res.status(201).json({
        success: true,
        checkoutMode: useEmbeddedCheckout ? 'embedded' : 'hosted',
        sessionId: session.id,
        sessionUrl: session.url || null,
        clientSecret: session.client_secret || null,
        bookingIds: bookings.map((b) => b._id),
      })
    }

    // === SINGLE SERVICE CHECKOUT ===
    const {
      serviceId,
      date,
      time,
      duration,
      locationId,
      notes,
      addOns,
      totalPrice,
      userRewardId,
      rewardUsed,
      pointsUsed,
      useSavedCardDirectCharge,
    } = req.body

    // Validate required fields
    if (!serviceId || !date || !time || !locationId) {
      return next(createError(400, 'Missing required booking fields'))
    }

    // Fetch service details
    const service = await Service.findById(serviceId).populate('createdBy')
    const customer = await User.findById(customerId)

    if (!service || service.status !== 'active' || service.isDeleted) {
      return next(createError(404, 'Service not found or inactive'))
    }

    const effectiveDuration = Number.parseInt(duration, 10) || service.duration

    await assertSlotAvailable({
      locationId,
      date,
      time,
      duration: effectiveDuration,
      service,
    })

    // Get spa owner (owner of the location)
    const spaOwner = await findStripeReadySpaOwnerByLocation(locationId)

    if (!spaOwner) {
      return next(createError(400, 'No Stripe-ready spa account found for this location'))
    }

    const normalizedAddOns = Array.isArray(addOns)
      ? addOns
          .map((addOn) => {
            const parsedPrice = Number(addOn?.price)
            const parsedDuration = Number.parseInt(addOn?.duration, 10)
            return {
              serviceId: addOn?.serviceId || null,
              name: `${addOn?.name || 'Add-on'}`.trim(),
              price: Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : 0,
              duration: Number.isFinite(parsedDuration) ? Math.max(0, parsedDuration) : 0,
            }
          })
          .filter((addOn) => addOn.price > 0)
      : []

    const addOnsTotal = normalizedAddOns.reduce(
      (sum, addOn) => sum + addOn.price,
      0
    )

    // Calculate pricing
    let baseSubtotal = Number(service.basePrice) || 0
    const memberPrice = resolveMemberPriceForUserAndService({ user: customer, service })
    if (
      isUserEligibleForMembershipPricing(customer) &&
      Number.isFinite(memberPrice) &&
      memberPrice >= 0
    ) {
      baseSubtotal = memberPrice
    }
    let subtotal = baseSubtotal + addOnsTotal
    let discountAmount = 0
    let isFreeGift = false
    let resolvedRewardUsed = rewardUsed || null

    // Birthday Gift Redemption Logic
    if (req.body.isBirthdayGift) {
      // Fetch the location to get the specific birthday gift configuration
      const location = await Location.findOne({ 
        $or: [
          { _id: service.locationId },
          { locationId: service.locationId }
        ]
      });

      if (location?.birthdayGift?.isActive) {
        const gift = location.birthdayGift;
        if (gift.giftType === 'free') {
          isFreeGift = true;
          discountAmount = subtotal;
        } else if (gift.giftType === 'percentage') {
          discountAmount = (subtotal * (gift.value || 0)) / 100;
        } else if (gift.giftType === 'fixed') {
          discountAmount = Math.min(gift.value || 0, subtotal);
        }
      }
    } else {
      // Apply service discount if active (base service only, add-ons excluded)
      if (service.discount?.active && service.discount.percentage > 0) {
        const now = new Date()
        const startDate = service.discount.startDate
          ? new Date(service.discount.startDate)
          : new Date()
        const endDate = service.discount.endDate
          ? new Date(service.discount.endDate)
          : new Date()

        if (now >= startDate && now <= endDate) {
          discountAmount = (baseSubtotal * service.discount.percentage) / 100
        }
      }

      // Apply points discount
      if (pointsUsed && pointsUsed > 0) {
        if (customer && customer.points >= pointsUsed) {
          discountAmount += pointsUsed // $1 per point
        }
      }

      // Apply claimed user reward discount if provided
      if (userRewardId) {
        const appliedReward = await UserReward.findOne({
          _id: userRewardId,
          userId: customerId,
          status: 'active',
        })

        if (!appliedReward) {
          return next(createError(404, 'Selected reward not found or not active'))
        }

        if (appliedReward.isExpired) {
          appliedReward.status = 'expired'
          await appliedReward.save()
          return next(createError(400, 'Selected reward has expired'))
        }

        const { rewardDiscountAmount, resolvedRewardUsed: nextResolvedRewardUsed } =
          resolveSingleBookingRewardUsage({
          rewardSnapshot: appliedReward.rewardSnapshot,
          subtotal,
          serviceId,
          userRewardId,
        })

        discountAmount += rewardDiscountAmount
        resolvedRewardUsed = nextResolvedRewardUsed
      }
    }

    if (Number.isFinite(Number(totalPrice))) {
      const requestedTotal = Number(totalPrice)
      const roundedRequestedTotal = Math.round(requestedTotal * 100) / 100
      const roundedComputedSubtotal = Math.round(subtotal * 100) / 100
      const roundedComputedFinalPrice =
        Math.round(Math.max(subtotal - discountAmount, 0) * 100) / 100
      if (Math.abs(roundedRequestedTotal - roundedComputedFinalPrice) >= 0.01) {
        console.warn('[Stripe Checkout] Total mismatch detected', {
          serviceId: `${serviceId || ''}`,
          locationId: `${locationId || ''}`,
          requestedTotal: roundedRequestedTotal,
          computedSubtotal: roundedComputedSubtotal,
          computedFinalPrice: roundedComputedFinalPrice,
          discountAmount: Math.round(discountAmount * 100) / 100,
          addOnsTotal: Math.round(addOnsTotal * 100) / 100,
          addOnsCount: normalizedAddOns.length,
        })
      }
    }

    // Calculate final amount
    const finalPrice = Math.max(subtotal - discountAmount, 0)
    const amount = Math.round(finalPrice * 100) // Convert to cents
    const ghlCalendar = getServiceCalendarSelection(service)
    const addOnsNote = normalizedAddOns.length
      ? `[Add-ons] ${normalizedAddOns
          .map((addOn) => `${addOn.name} ($${addOn.price.toFixed(2)})`)
          .join(', ')}`
      : ''
    const bookingNotes = [notes || '', addOnsNote].filter(Boolean).join('\n')

    // Create temporary booking record
    const booking = await Booking.create({
      userId: customerId,
      serviceId,
      serviceName: service.name,
      servicePrice: subtotal,
      finalPrice,
      discountApplied: discountAmount,
      rewardUsed: resolvedRewardUsed || (isFreeGift ? 'BIRTHDAY_GIFT' : null),
      pointsUsed: pointsUsed || 0,
      date: new Date(date),
      time,
      duration: effectiveDuration,
      locationId,
      notes: bookingNotes,
      status: 'scheduled',
      paymentStatus: 'pending',
      ghl: {
        calendarId: ghlCalendar.calendarId,
        calendarName: ghlCalendar.name,
        timeZone: ghlCalendar.timeZone,
        userId: ghlCalendar.userId,
        teamId: ghlCalendar.teamId,
      },
    })

    const shouldAttemptDirectCharge = Boolean(useSavedCardDirectCharge)
    if (shouldAttemptDirectCharge) {
      try {
        let paymentMethodForReceipt = {
          type: amount === 0 ? 'free' : 'card',
          brand: null,
          last4: null,
          expMonth: null,
          expYear: null,
        }
        let stripePaymentIntentId = `free_booking_${booking._id}_${Date.now()}`
        let livemode = false
        let hasConfirmedPayment = amount === 0

        if (amount > 0) {
          const user = await User.findById(customerId)
          if (user) {
            const customerStripeId = await ensureMembershipCustomer({
              user,
              stripeAccountId: spaOwner.stripe.accountId,
              locationId,
            })
            const paymentMethodState = await listMembershipPaymentMethods({
              customerId: customerStripeId,
              stripeAccountId: spaOwner.stripe.accountId,
            })
            const defaultPaymentMethodId =
              paymentMethodState.defaultPaymentMethodId ||
              paymentMethodState.paymentMethods[0]?.id ||
              null

            if (defaultPaymentMethodId) {
              const paymentIntent = await stripe.paymentIntents.create(
                {
                  amount,
                  currency: 'usd',
                  customer: customerStripeId,
                  payment_method: defaultPaymentMethodId,
                  confirm: true,
                  off_session: true,
                  metadata: {
                    customerId: customerId.toString(),
                    spaOwnerId: spaOwner._id.toString(),
                    serviceId: serviceId.toString(),
                    serviceName: service.name,
                    bookingId: booking._id.toString(),
                    userRewardId: resolvedRewardUsed || '',
                    directSavedCardCharge: 'true',
                  },
                  description: `Direct booking charge for ${service.name}`,
                },
                { stripeAccount: spaOwner.stripe.accountId }
              )

              stripePaymentIntentId = paymentIntent.id
              livemode = Boolean(paymentIntent.livemode)
              hasConfirmedPayment = true

              const defaultPaymentMethod = await stripe.paymentMethods.retrieve(
                defaultPaymentMethodId,
                {},
                { stripeAccount: spaOwner.stripe.accountId }
              )

              paymentMethodForReceipt = {
                type: 'card',
                brand: defaultPaymentMethod?.card?.brand || null,
                last4: defaultPaymentMethod?.card?.last4 || null,
                expMonth: defaultPaymentMethod?.card?.exp_month || null,
                expYear: defaultPaymentMethod?.card?.exp_year || null,
              }
            }
          }
        }

        if (!hasConfirmedPayment) {
          throw new Error('No saved payment method available for direct charge')
        }

        const pointsEarned = await resolvePurchasePoints(locationId, finalPrice)
        const payment = await Payment.create({
          stripePaymentIntentId,
          customer: customerId,
          spaOwner: spaOwner._id,
          stripeAccountId: spaOwner.stripe.accountId,
          service: serviceId,
          booking: booking._id,
          amount,
          currency: 'usd',
          subtotal: subtotal * 100,
          discount: {
            amount: discountAmount * 100,
            type: discountAmount > 0 ? 'fixed' : null,
            code: null,
            description: discountAmount > 0 ? 'Service discount applied' : null,
          },
          tax: { amount: 0, rate: 0 },
          platformFee: { amount: 0, percentage: 0 },
          status: 'succeeded',
          livemode,
          processedAt: new Date(),
          pointsEarned,
          pointsUsed: pointsUsed || 0,
          paymentMethod: paymentMethodForReceipt,
        })

        booking.paymentStatus = 'paid'
        booking.paymentId = payment._id
        booking.pointsEarned = pointsEarned
        await booking.save()

        const syncResult = await syncBookingToGhlWithRetry(booking, customerId)
        if (!syncResult.ok) {
          const syncReason = `${booking?.ghl?.syncError || 'Failed to sync booking to GHL'}`
          const paymentAmount = Number(payment.amount || 0)
          const shouldRefund =
            paymentAmount > 0 &&
            stripePaymentIntentId &&
            !`${stripePaymentIntentId}`.startsWith('free_booking_')

          if (shouldRefund) {
            try {
              const refund = await stripe.refunds.create(
                {
                  payment_intent: stripePaymentIntentId,
                  amount: paymentAmount,
                  reason: 'requested_by_customer',
                  metadata: {
                    bookingId: booking._id.toString(),
                    customerId: customerId.toString(),
                    syncFailure: 'true',
                  },
                },
                { stripeAccount: spaOwner.stripe.accountId }
              )

              payment.status = 'refunded'
              payment.refund = {
                amount: paymentAmount,
                reason: syncReason,
                stripeRefundId: refund?.id || null,
                refundedAt: new Date(),
                refundedBy: null,
              }
              await payment.save()
            } catch (refundError) {
              console.error('[Stripe->GHL] Auto-refund failed after sync failure', {
                bookingId: `${booking?._id || ''}`,
                paymentIntentId: stripePaymentIntentId,
                error: refundError?.response?.data || refundError?.message || refundError,
              })
              return next(
                createError(
                  502,
                  'Booking could not be confirmed in GoHighLevel and auto-refund failed. Please contact support immediately.'
                )
              )
            }
          } else {
            payment.status = 'refunded'
            payment.refund = {
              amount: 0,
              reason: syncReason,
              stripeRefundId: null,
              refundedAt: new Date(),
              refundedBy: null,
            }
            await payment.save()
          }

          booking.paymentStatus = 'refunded'
          booking.status = 'cancelled'
          booking.cancelledAt = new Date()
          booking.cancelReason = `GHL sync failed: ${syncReason}`
          booking.pointsEarned = 0
          await booking.save()

          const syncReasonLower = syncReason.toLowerCase()
          if (syncReasonLower.includes('calendar is inactive')) {
            return next(
              createError(
                409,
                'Linked GHL calendar is inactive. Booking was not confirmed and payment was refunded.'
              )
            )
          }
          if (syncReasonLower.includes('no longer available')) {
            return next(
              createError(
                409,
                'That slot was just taken in GoHighLevel. Booking was not confirmed and payment was refunded.'
              )
            )
          }

          return next(
            createError(
              409,
              'Unable to confirm booking in GoHighLevel. Payment was refunded. Please try again.'
            )
          )
        }

        const bookingService = await Service.findById(booking.serviceId)
        await activateMembershipForCustomer({
          customerId,
          booking,
          service: bookingService,
        })

        const customer = await User.findById(customerId)
        if (customer) {
          customer.points += pointsEarned
          if (booking.pointsUsed > 0) {
            customer.points = Math.max(0, customer.points - booking.pointsUsed)
          }
          await customer.save()
        }

        if (resolvedRewardUsed) {
          await UserReward.findByIdAndUpdate(resolvedRewardUsed, {
            status: 'used',
            usedAt: new Date(),
            usedBy: customerId,
            actualValue: Number(booking.discountApplied) || 0,
          })
        }

        return res.status(201).json({
          success: true,
          bookingConfirmed: true,
          bookingId: booking._id,
          message: 'Booking confirmed using your saved card.',
        })
      } catch (directChargeError) {
        const directChargeMessage = `${directChargeError?.message || ''}`.toLowerCase()
        const shouldFallbackToCheckout =
          directChargeError?.code === 'authentication_required' ||
          directChargeMessage.includes('no saved payment method') ||
          directChargeMessage.includes('requires_action') ||
          directChargeMessage.includes('authentication')

        if (!shouldFallbackToCheckout) {
          throw directChargeError
        }
      }
    }

    // Create Stripe Checkout Session
    const successUrl = `${process.env.CLIENT_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.CLIENT_URL}/services/${serviceId}`

    const checkoutSessionPayload = {
      payment_method_types: ['card', 'afterpay_clearpay'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: service.name,
              description: `Booking on ${new Date(
                date
              ).toLocaleDateString()} at ${time}${
                normalizedAddOns.length > 0
                  ? ` | Add-ons: ${normalizedAddOns
                      .map((addOn) => addOn.name)
                      .join(', ')}`
                  : ''
              }`,
              images: service.images?.length > 0 ? [service.images[0]] : [],
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: req.user.email,
      payment_intent_data: {
        transfer_data: {
          destination: spaOwner.stripe.accountId,
        },
        metadata: {
          customerId: customerId.toString(),
          spaOwnerId: spaOwner._id.toString(),
          serviceId: serviceId.toString(),
          serviceName: service.name,
          bookingId: booking._id.toString(),
          userRewardId: resolvedRewardUsed || '',
        },
      },
      metadata: {
        customerId: customerId.toString(),
        bookingId: booking._id.toString(),
        serviceId: serviceId.toString(),
        userRewardId: resolvedRewardUsed || '',
      },
    }

    if (useEmbeddedCheckout) {
      checkoutSessionPayload.ui_mode = 'embedded'
      checkoutSessionPayload.return_url = successUrl
      checkoutSessionPayload.redirect_on_completion = 'always'
    } else {
      checkoutSessionPayload.success_url = successUrl
      checkoutSessionPayload.cancel_url = cancelUrl
    }

    const session = await stripe.checkout.sessions.create(checkoutSessionPayload)

    // Update booking with session ID
    booking.stripeSessionId = session.id
    await booking.save()

    res.status(201).json({
      success: true,
      checkoutMode: useEmbeddedCheckout ? 'embedded' : 'hosted',
      sessionId: session.id,
      sessionUrl: session.url || null,
      clientSecret: session.client_secret || null,
      bookingId: booking._id,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    next(error)
  }
}

/**
 * Create a Stripe Checkout session for direct membership purchase
 */
export const createMembershipCheckoutSession = async (req, res, next) => {
  try {
    const customerId = req.user.id
    const { serviceId, locationId, planId, planName, checkoutUiMode } = req.body
    const useEmbeddedCheckout = `${checkoutUiMode || ''}`.trim().toLowerCase() === 'embedded'
    const user = await User.findById(customerId)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    if (!serviceId || !locationId) {
      return next(createError(400, 'serviceId and locationId are required'))
    }

    const service = await Service.findById(serviceId)
    if (!service || service.status !== 'active' || service.isDeleted) {
      return next(createError(404, 'Membership service not found or inactive'))
    }
    if (!isMembershipServicePurchase(service)) {
      return next(createError(400, 'Selected service is not a membership offering'))
    }
    if (!service.locationId || `${service.locationId}`.trim() !== `${locationId}`.trim()) {
      return next(
        createError(400, 'Selected membership service is not available for this location')
      )
    }

    const location = await Location.findOne({ locationId })
    if (!location) {
      return next(createError(404, 'Location not found'))
    }

    if (!location?.membership?.isActive) {
      return next(
        createError(
          400,
          'Membership is not active for this location yet.'
        )
      )
    }

    const spaOwner = await findStripeReadySpaOwnerByLocation(locationId)
    if (!spaOwner) {
      return next(createError(400, 'No Stripe-ready spa account found for this location'))
    }

    const customerStripeId = await ensureMembershipCustomer({
      user,
      stripeAccountId: spaOwner.stripe.accountId,
      locationId,
    })
    const paymentMethodState = await listMembershipPaymentMethods({
      customerId: customerStripeId,
      stripeAccountId: spaOwner.stripe.accountId,
    })

    if (paymentMethodState.paymentMethods.length === 0) {
      return next(createError(400, 'Add a card before buying a membership plan.'))
    }

    const activeEntries = getActiveMembershipPricingEntries(service)
    let selectedEntry = null
    if (activeEntries.length > 0) {
      selectedEntry =
        activeEntries.find((entry) => {
          const entryPlanId = `${entry?.membershipPlanId || ''}`.trim()
          const requestedPlanId = `${planId || ''}`.trim()
          if (requestedPlanId && entryPlanId && entryPlanId === requestedPlanId) {
            return true
          }
          return (
            planName &&
            `${entry?.membershipPlanName || ''}`.trim().toLowerCase() ===
              `${planName}`.trim().toLowerCase()
          )
        }) || activeEntries[0]
    }

    const amountDollars = Number(selectedEntry?.price ?? service.basePrice ?? 0)
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      return next(createError(400, 'Invalid membership price configured'))
    }

    const resolvedPlanName =
      selectedEntry?.membershipPlanName ||
      planName ||
      service.name ||
      'Membership Plan'
    const resolvedPlanId = selectedEntry?.membershipPlanId || planId || null

    const locationPlans =
      Array.isArray(location?.membership?.plans) && location.membership.plans.length > 0
        ? location.membership.plans
        : [location.membership]
    const requestedPlanId = `${planId || ''}`.trim()
    const requestedPlanName = `${planName || ''}`.trim().toLowerCase()

    const matchedLocationPlan = locationPlans.find((plan) => {
      const locationPlanId = `${plan?._id || plan?.planId || plan?.id || ''}`.trim()
      if (requestedPlanId && locationPlanId && locationPlanId === requestedPlanId) {
        return true
      }

      if (requestedPlanName) {
        return `${plan?.name || ''}`.trim().toLowerCase() === requestedPlanName
      }

      return false
    })

    const amountFromLocationPlan = Number(matchedLocationPlan?.price)
    const resolvedAmountDollars =
      Number.isFinite(amountFromLocationPlan) && amountFromLocationPlan > 0
        ? amountFromLocationPlan
        : amountDollars
    const finalPlanName = matchedLocationPlan?.name || resolvedPlanName
    const finalPlanId =
      `${matchedLocationPlan?._id || matchedLocationPlan?.planId || ''}`.trim() ||
      resolvedPlanId

    const amount = Math.round(resolvedAmountDollars * 100)

    const successUrl = `${process.env.CLIENT_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.CLIENT_URL}/membership`

    const checkoutSessionPayload = {
      payment_method_types: ['card', 'afterpay_clearpay'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: finalPlanName,
              description: `Membership plan for location ${locationId}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: req.user.email,
      payment_intent_data: {
        transfer_data: {
          destination: spaOwner.stripe.accountId,
        },
        metadata: {
          customerId: customerId.toString(),
          spaOwnerId: spaOwner._id.toString(),
          serviceId: service._id.toString(),
          locationId: `${locationId}`,
          planId: finalPlanId ? `${finalPlanId}` : '',
          planName: `${finalPlanName}`,
          planPrice: `${resolvedAmountDollars}`,
          isMembershipCheckout: 'true',
        },
      },
      metadata: {
        customerId: customerId.toString(),
        spaOwnerId: spaOwner._id.toString(),
        serviceId: service._id.toString(),
        locationId: `${locationId}`,
        planId: finalPlanId ? `${finalPlanId}` : '',
        planName: `${finalPlanName}`,
        planPrice: `${resolvedAmountDollars}`,
        isMembershipCheckout: 'true',
      },
    }

    if (useEmbeddedCheckout) {
      checkoutSessionPayload.ui_mode = 'embedded'
      checkoutSessionPayload.return_url = successUrl
      checkoutSessionPayload.redirect_on_completion = 'always'
    } else {
      checkoutSessionPayload.success_url = successUrl
      checkoutSessionPayload.cancel_url = cancelUrl
    }

    const session = await stripe.checkout.sessions.create(checkoutSessionPayload)

    res.status(201).json({
      success: true,
      checkoutMode: useEmbeddedCheckout ? 'embedded' : 'hosted',
      sessionId: session.id,
      sessionUrl: session.url || null,
      clientSecret: session.client_secret || null,
    })
  } catch (error) {
    console.error('Error creating membership checkout session:', error)
    next(error)
  }
}

/**
 * Create a payment intent for a service booking
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    const customerId = req.user.id
    const { serviceId, bookingId, discountCode } = req.body

    // Fetch service details
    const service = await Service.findById(serviceId).populate('createdBy')
    const customer = await User.findById(customerId)

    if (!service || service.status !== 'active' || service.isDeleted) {
      return next(createError(404, 'Service not found or inactive'))
    }

    // Resolve payout owner by location so any Stripe-ready assigned spa can receive payments.
    const payoutLocationId =
      service.locationId || req.user.selectedLocation?.locationId || null
    const spaOwner = await findStripeReadySpaOwnerByLocation(payoutLocationId)

    if (!spaOwner) {
      return next(
        createError(400, 'No Stripe-ready spa account found for this location')
      )
    }

    // Calculate pricing
    let subtotal = Number(service.basePrice) || 0
    const memberPrice = resolveMemberPriceForUserAndService({ user: customer, service })
    if (
      isUserEligibleForMembershipPricing(customer) &&
      Number.isFinite(memberPrice) &&
      memberPrice >= 0
    ) {
      subtotal = memberPrice
    }
    let discount = { amount: 0, type: null, code: null, description: null }

    // Apply service discount if active
    if (service.discount?.active && service.discount.percentage > 0) {
      const now = new Date()
      const startDate = service.discount.startDate
        ? new Date(service.discount.startDate)
        : new Date()
      const endDate = service.discount.endDate
        ? new Date(service.discount.endDate)
        : new Date()

      if (now >= startDate && now <= endDate) {
        const discountAmount = (subtotal * service.discount.percentage) / 100
        discount = {
          amount: Math.round(discountAmount * 100), // Convert to cents
          type: 'percentage',
          code: null,
          description: `${service.discount.percentage}% off`,
        }
      }
    }

    // TODO: Apply custom discount code if provided
    if (discountCode) {
      // This can be extended to support custom coupon codes
    }

    // Calculate final amount
    const discountedAmount = subtotal - discount.amount / 100
    const tax = 0 // TODO: Calculate tax based on location
    const amount = Math.round(discountedAmount * 100) // Convert to cents

    // Create payment intent with Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      transfer_data: {
        destination: spaOwner.stripe.accountId,
      },
      metadata: {
        customerId: customerId.toString(),
        spaOwnerId: spaOwner._id.toString(),
        serviceId: serviceId.toString(),
        serviceName: service.name,
        bookingId: bookingId || 'new',
      },
      description: `Payment for ${service.name}`,
    })

    const locationId = service.locationId || req.user.selectedLocation?.locationId
    const pointsEarned = await resolvePurchasePoints(locationId, discountedAmount)

    // Create payment record
    const payment = await Payment.create({
      stripePaymentIntentId: paymentIntent.id,
      customer: customerId,
      spaOwner: spaOwner._id,
      stripeAccountId: spaOwner.stripe.accountId,
      service: serviceId,
      booking: bookingId || null,
      amount,
      currency: 'usd',

      subtotal: Math.round(subtotal * 100),
      discount,
      tax: { amount: tax, rate: 0 },
      platformFee: { amount: 0, percentage: 0 },
      status: 'pending',
      livemode: paymentIntent.livemode,
      pointsEarned,
    })

    res.status(201).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment._id,
      amount: (amount / 100).toFixed(2),
      pointsEarned: payment.pointsEarned,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    next(error)
  }
}

/**
 * Confirm payment and update booking
 */
export const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body

    // Fetch payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Find payment record
    const payments = await Payment.find({
      stripePaymentIntentId: paymentIntentId,
    })

    if (payments.length === 0) {
      return next(createError(404, 'Payment records not found'))
    }

    const results = []

    for (const payment of payments) {
      // Update payment status
      payment.status =
        paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed'
      payment.stripeChargeId = paymentIntent.charges?.data[0]?.id || null
      payment.livemode = paymentIntent.livemode

      if (paymentIntent.status === 'succeeded') {
        payment.processedAt = new Date()
        payment.paymentMethod = {
          type: paymentIntent.payment_method_types[0] || 'card',
          brand:
            paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand ||
            null,
          last4:
            paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4 ||
            null,
          expMonth:
            paymentIntent.charges?.data[0]?.payment_method_details?.card
              ?.exp_month || null,
          expYear:
            paymentIntent.charges?.data[0]?.payment_method_details?.card
              ?.exp_year || null,
        }

        // Update customer points
        const customer = await User.findById(payment.customer)
        if (customer) {
          customer.points += payment.pointsEarned
          await customer.save()
        }

        // Update booking if exists
        if (payment.booking) {
          await Booking.findByIdAndUpdate(payment.booking, {
            paymentStatus: 'paid',
            paymentId: payment._id,
            finalPrice: payment.amount / 100,
            pointsEarned: payment.pointsEarned,
          })

          const paidBooking = await Booking.findById(payment.booking)
          const paidService = paidBooking
            ? await Service.findById(paidBooking.serviceId)
            : null
          if (paidBooking && paidService) {
            await activateMembershipForCustomer({
              customerId: payment.customer,
              booking: paidBooking,
              service: paidService,
            })
          }
        }
      } else {
        payment.failedAt = new Date()
        payment.errorMessage =
          paymentIntent.last_payment_error?.message || 'Payment failed'
        payment.errorCode = paymentIntent.last_payment_error?.code || null
      }

      await payment.save()
      results.push(payment)
    }

    res.status(200).json({
      success: true,
      status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed',
      payments: results,
    })
  } catch (error) {
    console.error('Error confirming payment:', error)
    next(error)
  }
}

/**
 * Get payment history for a user
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10, role } = req.query

    const user = await User.findById(userId)

    let query = {}
    if (user.role === 'spa') {
      // Spa owner - get payments they received
      query.spaOwner = userId
    } else {
      // Customer - get payments they made
      query.customer = userId
    }

    const result = await Payment.getCustomerHistory(
      userId,
      parseInt(page),
      parseInt(limit)
    )

    res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error fetching payment history:', error)
    next(error)
  }
}

/**
 * Get revenue analytics for spa owner
 */
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { startDate, endDate } = req.query

    const user = await User.findById(userId)

    if (user.role !== 'spa') {
      return next(
        createError(403, 'Only spa owners can access revenue analytics')
      )
    }

    const revenue = await Payment.getSpaRevenue(userId, startDate, endDate)

    res.status(200).json({
      success: true,
      ...revenue,
    })
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    next(error)
  }
}

/**
 * Process refund
 */
export const processRefund = async (req, res, next) => {
  try {
    const { paymentId } = req.params
    const { amount, reason } = req.body
    const userId = req.user.id

    const payment = await Payment.findById(paymentId)

    if (!payment) {
      return next(createError(404, 'Payment not found'))
    }

    // Check if user is the spa owner
    if (payment.spaOwner.toString() !== userId) {
      return next(createError(403, 'You can only refund your own payments'))
    }

    // Check if payment can be refunded
    if (!payment.canBeRefunded()) {
      return next(createError(400, 'This payment cannot be refunded'))
    }

    // Calculate refund amount (in cents)
    const refundAmount = amount ? Math.round(amount * 100) : payment.amount

    if (refundAmount > payment.amount) {
      return next(
        createError(400, 'Refund amount cannot exceed payment amount')
      )
    }

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: refundAmount,
      reason: reason || 'requested_by_customer',
      metadata: {
        paymentId: payment._id.toString(),
        refundedBy: userId,
      },
    })

    // Update payment record
    const isPartialRefund = refundAmount < payment.amount
    payment.status = isPartialRefund ? 'partially_refunded' : 'refunded'
    payment.refund = {
      amount: refundAmount,
      reason,
      stripeRefundId: refund.id,
      refundedAt: new Date(),
      refundedBy: userId,
    }

    await payment.save()

    // Deduct points from customer if applicable
    const pointsToDeduct = Math.floor(refundAmount / 100)
    if (pointsToDeduct > 0) {
      const customer = await User.findById(payment.customer)
      if (customer) {
        customer.points = Math.max(0, customer.points - pointsToDeduct)
        await customer.save()
      }
    }

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refund: payment.refund,
    })
  } catch (error) {
    console.error('Error processing refund:', error)
    next(error)
  }
}

// ==================== WEBHOOK HANDLER ====================

/**
 * Handle Stripe webhooks
 */
export const handleWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle different event types
  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object)
        break

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object, event.account || null)
        break

      case 'invoice.paid':
        await handleMembershipInvoicePaid(event.data.object, event.account || null)
        break

      case 'invoice.payment_failed':
        await handleMembershipInvoicePaymentFailed(
          event.data.object,
          event.account || null
        )
        break

      case 'customer.subscription.updated':
        await handleMembershipSubscriptionUpdated(
          event.data.object,
          event.account || null
        )
        break

      case 'customer.subscription.deleted':
        await handleMembershipSubscriptionDeleted(
          event.data.object,
          event.account || null
        )
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error handling webhook:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}

// Webhook helper functions
async function handleAccountUpdated(account) {
  const user = await User.findOne({ 'stripe.accountId': account.id })

  if (user) {
    user.stripe.chargesEnabled = account.charges_enabled
    user.stripe.payoutsEnabled = account.payouts_enabled
    user.stripe.detailsSubmitted = account.details_submitted
    user.stripe.onboardingCompleted =
      account.details_submitted && account.charges_enabled
    user.stripe.accountStatus = account.charges_enabled ? 'active' : 'pending'
    user.stripe.lastUpdated = new Date()

    await user.save()
    try {
      await autoActivatePendingMembershipForSpa(user)
    } catch (membershipSyncError) {
      console.error(
        'Auto-activation failed on account.updated webhook:',
        membershipSyncError
      )
    }
  }
}

async function syncBookingToGhl(booking, customerId) {
  try {
    if (!booking.ghl) booking.ghl = {}
    console.log('[Stripe->GHL] Sync start', {
      bookingId: `${booking?._id || ''}`,
      customerId: `${customerId || ''}`,
      paymentStatus: booking?.paymentStatus || '',
      locationId: booking?.locationId || '',
      calendarId: booking?.ghl?.calendarId || '',
    })

    const [service, customer] = await Promise.all([
      Service.findById(booking.serviceId),
      User.findById(customerId).select('name email'),
    ])

    if (!service || service.isDeleted) {
      booking.ghl.syncError = 'Service not found for GHL sync'
      await booking.save()
      console.warn('[Stripe->GHL] Sync skipped - service missing', {
        bookingId: `${booking?._id || ''}`,
        serviceId: `${booking?.serviceId || ''}`,
      })
      return { ok: false, retryable: false }
    }

    const result = await createGhlAppointmentForBooking({
      booking,
      service,
      customer,
    })

    if (result.skipped) {
      booking.ghl.syncError = result.reason || ''
      await booking.save()
      const reason = `${result.reason || ''}`.toLowerCase()
      const retryable = !reason.includes('no ghl calendar linked')
      console.warn('[Stripe->GHL] Sync skipped', {
        bookingId: `${booking?._id || ''}`,
        reason: result.reason || '',
        retryable,
      })
      return { ok: false, retryable }
    }

    booking.ghl.appointmentId = result.appointmentId || ''
    booking.ghl.appointmentStatus = 'confirmed'
    booking.ghl.syncedAt = new Date()
    booking.ghl.syncError = ''
    await booking.save()
    console.log('[Stripe->GHL] Sync success', {
      bookingId: `${booking?._id || ''}`,
      appointmentId: booking?.ghl?.appointmentId || '',
    })
    return { ok: true, retryable: false }
  } catch (error) {
    if (!booking.ghl) booking.ghl = {}
    booking.ghl.syncError =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      error.message ||
      'Failed to sync booking to GHL'
    await booking.save()
    console.error(
      `Failed syncing booking ${booking._id} to GHL:`,
      error.response?.data || error.message
    )
    const errMessage = `${error.response?.data?.message || error.response?.data?.msg || error.message || ''}`.toLowerCase()
    const retryable = !(
      errMessage.includes('api key is invalid') ||
      errMessage.includes('invalid jwt') ||
      errMessage.includes('calendar is inactive') ||
      errMessage.includes('slot you have selected is no longer available')
    )
    return { ok: false, retryable }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function syncBookingToGhlWithRetry(booking, customerId, maxAttempts = 3) {
  let attempt = 0
  let lastResult = { ok: false, retryable: true }

  while (attempt < maxAttempts) {
    attempt += 1
    console.log('[Stripe->GHL] Sync attempt', {
      bookingId: `${booking?._id || ''}`,
      attempt,
      maxAttempts,
    })
    lastResult = await syncBookingToGhl(booking, customerId)
    if (lastResult.ok || !lastResult.retryable) {
      console.log('[Stripe->GHL] Sync finished', {
        bookingId: `${booking?._id || ''}`,
        attempt,
        ok: lastResult.ok,
        retryable: lastResult.retryable,
      })
      return lastResult
    }
    if (attempt < maxAttempts) {
      await sleep(1200 * attempt)
    }
  }

  return lastResult
}

async function handleCheckoutSessionCompleted(session) {
  const metadata = session?.metadata || {}
  const bookingId = metadata.bookingId
  const bookingIds = metadata.bookingIds
  const customerId = metadata.customerId
  const userRewardId = metadata.userRewardId
  const isCartCheckout = metadata.isCartCheckout === 'true'
  const isMembershipCheckout = metadata.isMembershipCheckout === 'true'
  const paymentIntentId =
    typeof session?.payment_intent === 'string' && session.payment_intent.trim()
      ? session.payment_intent.trim()
      : null
  const fallbackPaymentIntentId = paymentIntentId || `checkout_session_${session.id}`
  const amountTotalCents = Number(session?.amount_total || 0)
  console.log('[Stripe webhook] checkout.session.completed', {
    sessionId: session?.id || '',
    bookingId: bookingId || '',
    bookingIds: bookingIds || '',
    customerId: customerId || '',
    isCartCheckout,
    isMembershipCheckout,
    amountTotalCents,
  })

  let paymentIntent = null
  if (paymentIntentId) {
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (error) {
      console.error(
        `Unable to retrieve payment intent ${paymentIntentId} for checkout session ${session.id}:`,
        error?.message || error
      )
    }
  }

  const resolveSpaDestinationForLocation = async (locationId) => {
    const spaOwner = await findStripeReadySpaOwnerByLocation(locationId)
    if (!spaOwner?.stripe?.accountId) {
      return { spaOwnerId: null, stripeAccountId: null }
    }
    return {
      spaOwnerId: spaOwner._id,
      stripeAccountId: spaOwner.stripe.accountId,
    }
  }

  const paymentMethodType =
    paymentIntent?.payment_method_types?.[0] || (amountTotalCents === 0 ? 'free' : 'card')
  const paymentMethodBrand =
    paymentIntent?.charges?.data[0]?.payment_method_details?.card?.brand || null
  const paymentMethodLast4 =
    paymentIntent?.charges?.data[0]?.payment_method_details?.card?.last4 || null
  const livemode = paymentIntent?.livemode ?? Boolean(session?.livemode)
  const purchaseMethodCache = new Map()

  if (isMembershipCheckout) {
    const serviceId = metadata.serviceId
    const locationId = metadata.locationId
    const service = await Service.findById(serviceId)

    if (!service) {
      console.error('Membership service not found for checkout session:', serviceId)
      return
    }

    const amount = Number(session.amount_total || 0)
    const amountDollars = amount / 100
    const pointsEarned = await resolvePurchasePoints(
      locationId || service.locationId,
      amountDollars,
      purchaseMethodCache
    )

    let spaOwnerId = paymentIntent?.metadata?.spaOwnerId || null
    let stripeAccountId = paymentIntent?.transfer_data?.destination || null

    if (!spaOwnerId || !stripeAccountId) {
      const spaDestination = await resolveSpaDestinationForLocation(
        locationId || service.locationId
      )
      spaOwnerId = spaOwnerId || spaDestination.spaOwnerId
      stripeAccountId = stripeAccountId || spaDestination.stripeAccountId
    }

    if (!spaOwnerId || !stripeAccountId) {
      console.error(
        `Unable to resolve spa destination for membership checkout session ${session.id}`
      )
      return
    }

    const existingMembershipPayment = await Payment.findOne({
      stripePaymentIntentId: fallbackPaymentIntentId,
      customer: customerId,
      service: service._id,
      amount,
    })
    if (existingMembershipPayment) {
      console.log(
        `Membership checkout session ${session.id} already processed (payment ${existingMembershipPayment._id})`
      )
      return
    }

    await Payment.create({
      stripePaymentIntentId: fallbackPaymentIntentId,
      customer: customerId,
      spaOwner: spaOwnerId,
      stripeAccountId,
      service: service._id,
      booking: null,
      amount,
      currency: session.currency || 'usd',
      subtotal: amount,
      discount: { amount: 0, type: null, code: null, description: null },
      tax: { amount: 0, rate: 0 },
      platformFee: { amount: 0, percentage: 0 },
      status: 'succeeded',
      livemode,
      processedAt: new Date(),
      pointsEarned,
      paymentMethod: {
        type: paymentMethodType,
        brand: paymentMethodBrand,
        last4: paymentMethodLast4,
      },
    })

    await activateMembershipForCustomer({
      customerId,
      booking: {
        finalPrice: amountDollars,
        locationId: locationId || service.locationId,
      },
      service,
    })

    const customer = await User.findById(customerId)
    if (customer) {
      customer.points += pointsEarned
      await customer.save()
    }

    console.log(`Membership checkout completed for customer ${customerId}`)
    return
  }

  if (isCartCheckout && bookingIds) {
    // === HANDLE MULTIPLE BOOKINGS (CART CHECKOUT) ===
    const bookingIdArray = bookingIds.split(',')

    if (bookingIdArray.length === 0) {
      console.error('No booking IDs in cart checkout session')
      return
    }

    // Find all bookings
    const bookings = await Booking.find({ _id: { $in: bookingIdArray } })
    console.log('[Stripe webhook] Cart checkout booking resolution', {
      sessionId: session?.id || '',
      requestedBookingIds: bookingIdArray,
      foundCount: bookings.length,
    })

    if (bookings.length === 0) {
      console.error('No bookings found for IDs:', bookingIdArray)
      return
    }

    let totalPointsEarned = 0

    // Create payment records and update each booking
    for (const booking of bookings) {
      if (booking.paymentStatus === 'paid' && booking.paymentId) {
        continue
      }

      const pointsEarned = await resolvePurchasePoints(
        booking.locationId,
        booking.finalPrice,
        purchaseMethodCache
      )
      totalPointsEarned += pointsEarned

      let spaOwnerId = paymentIntent?.metadata?.spaOwnerId || null
      let stripeAccountId = paymentIntent?.transfer_data?.destination || null

      if (!spaOwnerId || !stripeAccountId) {
        const spaDestination = await resolveSpaDestinationForLocation(
          booking.locationId
        )
        spaOwnerId = spaOwnerId || spaDestination.spaOwnerId
        stripeAccountId = stripeAccountId || spaDestination.stripeAccountId
      }

      if (!spaOwnerId || !stripeAccountId) {
        throw new Error(
          `Unable to resolve spa destination for booking ${booking._id} in checkout session ${session.id}`
        )
      }

      // Create payment record for this booking
      const payment = await Payment.create({
        stripePaymentIntentId: fallbackPaymentIntentId,
        customer: customerId,
        spaOwner: spaOwnerId,
        stripeAccountId,
        service: booking.serviceId,
        booking: booking._id,
        amount: Math.round(booking.finalPrice * 100),
        currency: session.currency || 'usd',
        subtotal: booking.servicePrice * 100,
        discount: {
          amount: booking.discountApplied * 100,
          type: booking.discountApplied > 0 ? 'fixed' : null,
          code: null,
          description:
            booking.discountApplied > 0 ? 'Service discount applied' : null,
        },
        tax: { amount: 0, rate: 0 },
        platformFee: {
          amount: 0,
          percentage: 0,
        },
        status: 'succeeded',
        livemode,
        processedAt: new Date(),
        pointsEarned: pointsEarned,
        paymentMethod: {
          type: paymentMethodType,
          brand: paymentMethodBrand,
          last4: paymentMethodLast4,
        },
      })

      // Update booking status
      booking.paymentStatus = 'paid'
      booking.paymentId = payment._id
      booking.pointsEarned = pointsEarned
      await booking.save()

      // Activate membership on customer profile when a membership product is purchased.
      const service = await Service.findById(booking.serviceId)
      await activateMembershipForCustomer({
        customerId,
        booking,
        service,
      })
      await syncBookingToGhlWithRetry(booking, customerId)
    }

    // Award points to customer and handle deductions
    const customer = await User.findById(customerId)
    if (customer && totalPointsEarned > 0) {
      customer.points += totalPointsEarned
      await customer.save()
    }

    // Mark reward as used if provided
    if (userRewardId && bookings.some((booking) => booking.paymentStatus === 'paid')) {
      const totalRewardValue = bookings.reduce(
        (sum, booking) => sum + (Number(booking.discountApplied) || 0),
        0
      )
      await UserReward.findByIdAndUpdate(userRewardId, {
        status: 'used',
        usedAt: new Date(),
        usedBy: customerId,
        actualValue: totalRewardValue,
      })
    }

    console.log(
      `Cart checkout completed: ${bookings.length} bookings, ${totalPointsEarned} points earned`
    )
    return
  }

  // === HANDLE SINGLE BOOKING ===
  if (!bookingId) {
    console.error('No booking ID in checkout session metadata')
    return
  }

  // Find the booking
  const booking = await Booking.findById(bookingId)

  if (!booking) {
    console.error('Booking not found:', bookingId)
    return
  }
  console.log('[Stripe webhook] Single booking resolved', {
    sessionId: session?.id || '',
    bookingId: `${booking?._id || ''}`,
    paymentStatus: booking?.paymentStatus || '',
    locationId: booking?.locationId || '',
    calendarId: booking?.ghl?.calendarId || '',
  })

  if (booking.paymentStatus === 'paid' && booking.paymentId) {
    console.log(`Booking ${bookingId} already marked as paid; skipping duplicate webhook`)
    return
  }

  let spaOwnerId = paymentIntent?.metadata?.spaOwnerId || null
  let stripeAccountId = paymentIntent?.transfer_data?.destination || null
  if (!spaOwnerId || !stripeAccountId) {
    const spaDestination = await resolveSpaDestinationForLocation(booking.locationId)
    spaOwnerId = spaOwnerId || spaDestination.spaOwnerId
    stripeAccountId = stripeAccountId || spaDestination.stripeAccountId
  }

  if (!spaOwnerId || !stripeAccountId) {
    throw new Error(
      `Unable to resolve spa destination for booking ${booking._id} in checkout session ${session.id}`
    )
  }

  // Create payment record
  const singleBookingPoints = await resolvePurchasePoints(
    booking.locationId,
    booking.finalPrice,
    purchaseMethodCache
  )
  const payment = await Payment.create({
    stripePaymentIntentId: fallbackPaymentIntentId,
    customer: customerId,
    spaOwner: spaOwnerId,
    stripeAccountId,
    service: booking.serviceId,
    booking: booking._id,
    amount: amountTotalCents,
    currency: session.currency || 'usd',
    subtotal: booking.servicePrice * 100,
    discount: {
      amount: booking.discountApplied * 100,
      type: booking.discountApplied > 0 ? 'fixed' : null,
      code: null,
      description:
        booking.discountApplied > 0 ? 'Service discount applied' : null,
    },
    tax: { amount: 0, rate: 0 },
    platformFee: {
      amount: 0,
      percentage: 0,
    },
    status: 'succeeded',
    livemode,
    processedAt: new Date(),
    pointsEarned: singleBookingPoints,
    paymentMethod: {
      type: paymentMethodType,
      brand: paymentMethodBrand,
      last4: paymentMethodLast4,
    },
  })

  // Update booking status
  booking.paymentStatus = 'paid'
  booking.paymentId = payment._id
  booking.pointsEarned = payment.pointsEarned
  await booking.save()

  const syncResult = await syncBookingToGhlWithRetry(booking, customerId)
  if (!syncResult.ok) {
    const syncReason = `${booking?.ghl?.syncError || 'Failed to sync booking to GHL'}`
    const refundAmount = Number(amountTotalCents || 0)

    if (refundAmount > 0 && fallbackPaymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: fallbackPaymentIntentId,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            bookingId: booking._id.toString(),
            customerId: `${customerId || ''}`,
            syncFailure: 'true',
          },
        })

        payment.status = 'refunded'
        payment.refund = {
          amount: refundAmount,
          reason: syncReason,
          stripeRefundId: refund?.id || null,
          refundedAt: new Date(),
          refundedBy: null,
        }
        await payment.save()
      } catch (refundError) {
        console.error('[Stripe webhook] Auto-refund failed after GHL sync failure', {
          bookingId: `${booking?._id || ''}`,
          paymentIntentId: fallbackPaymentIntentId,
          error: refundError?.response?.data || refundError?.message || refundError,
        })
      }
    } else {
      payment.status = 'refunded'
      payment.refund = {
        amount: 0,
        reason: syncReason,
        stripeRefundId: null,
        refundedAt: new Date(),
        refundedBy: null,
      }
      await payment.save()
    }

    booking.paymentStatus = 'refunded'
    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    booking.cancelReason = `GHL sync failed: ${syncReason}`
    booking.pointsEarned = 0
    await booking.save()

    console.warn('[Stripe webhook] Booking refunded due to GHL sync failure', {
      bookingId: `${booking?._id || ''}`,
      reason: syncReason,
    })
    return
  }

  const bookingService = await Service.findById(booking.serviceId)
  await activateMembershipForCustomer({
    customerId,
    booking,
    service: bookingService,
  })

  // Award points to customer
  const customer = await User.findById(customerId)
  if (customer) {
    customer.points += payment.pointsEarned

    // Deduct points if they were used for discount
    if (booking.pointsUsed > 0) {
      customer.points = Math.max(0, customer.points - booking.pointsUsed)
    }

    await customer.save()
  }

  if (userRewardId) {
    await UserReward.findByIdAndUpdate(userRewardId, {
      status: 'used',
      usedAt: new Date(),
      usedBy: customerId,
      actualValue: Number(booking.discountApplied) || 0,
    })
  }

  console.log(`Booking ${bookingId} payment completed successfully`)
}

async function handleSetupIntentSucceeded(setupIntent, stripeAccountId) {
  if (!stripeAccountId || !setupIntent?.customer) return

  const user =
    (setupIntent.metadata?.userId
      ? await User.findById(setupIntent.metadata.userId)
      : null) ||
    (await findMembershipUserByCustomer({
      customerId: setupIntent.customer,
      stripeAccountId,
    }))

  if (!user) return

  const paymentMethodState = await listMembershipPaymentMethods({
    customerId: setupIntent.customer,
    stripeAccountId,
  })
  const nextDefaultPaymentMethodId =
    paymentMethodState.defaultPaymentMethodId ||
    paymentMethodState.paymentMethods[0]?.id ||
    null

  if (!nextDefaultPaymentMethodId) {
    return
  }

  if (!paymentMethodState.defaultPaymentMethodId) {
    await stripe.customers.update(
      setupIntent.customer,
      {
        invoice_settings: {
          default_payment_method: nextDefaultPaymentMethodId,
        },
      },
      { stripeAccount: stripeAccountId }
    )
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(
    nextDefaultPaymentMethodId,
    {},
    {
      stripeAccount: stripeAccountId,
    }
  )

  if (user.membershipBilling?.subscriptionId) {
    await stripe.subscriptions.update(
      user.membershipBilling.subscriptionId,
      {
        default_payment_method: nextDefaultPaymentMethodId,
      },
      { stripeAccount: stripeAccountId }
    )
  }

  await syncMembershipDefaultPaymentMethodOnUser({
    user,
    stripeAccountId,
    paymentMethod,
    locationId:
      setupIntent.metadata?.locationId || user.membershipBilling?.locationId || null,
  })
}

async function resolveMembershipWebhookContext({
  stripeAccountId,
  customerId,
  subscriptionId = null,
}) {
  if (!stripeAccountId) return {}

  const user =
    (subscriptionId
      ? await findMembershipUserBySubscription({ subscriptionId, stripeAccountId })
      : null) ||
    (customerId
      ? await findMembershipUserByCustomer({ customerId, stripeAccountId })
      : null)

  if (!user) return {}

  const locationId = user.membershipBilling?.locationId || user.membership?.locationId || null
  const [location, spaOwner, service] = await Promise.all([
    locationId ? Location.findOne({ locationId }) : null,
    User.findOne({ 'stripe.accountId': stripeAccountId }),
    user.membershipBilling?.serviceId
      ? Service.findById(user.membershipBilling.serviceId)
      : findMembershipServiceForLocation({
          locationId,
          serviceId: null,
          planName: user.membership?.planName || null,
        }),
  ])

  return { user, location, spaOwner, service, locationId }
}

async function upsertMembershipInvoicePayment({
  invoice,
  subscription,
  user,
  locationId,
  spaOwner,
  service,
  plan,
  status,
  errorMessage = null,
}) {
  if (!invoice || !user || !spaOwner || !service) return null

  const existingPayment = await Payment.findOne({ stripeInvoiceId: invoice.id })
    .select('status')
    .lean()

  const paidAmount = Number(invoice.amount_paid)
  const dueAmount = Number(invoice.amount_due)
  const amount =
    status === 'failed'
      ? Number.isFinite(dueAmount)
        ? dueAmount
        : Number.isFinite(paidAmount)
          ? paidAmount
          : 0
      : Number.isFinite(paidAmount)
        ? paidAmount
        : Number.isFinite(dueAmount)
          ? dueAmount
          : 0
  const amountDollars = amount / 100
  const pointsEarned =
    status === 'succeeded'
      ? await resolvePurchasePoints(locationId, amountDollars)
      : 0
  const paymentIntentId =
    typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : invoice.payment_intent?.id || `invoice_${invoice.id}`

  const payment = await Payment.findOneAndUpdate(
    { stripeInvoiceId: invoice.id },
    {
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId:
        typeof invoice.charge === 'string' ? invoice.charge : invoice.charge?.id || null,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId:
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id || subscription?.id || null,
      customer: user._id,
      spaOwner: spaOwner._id,
      stripeAccountId: user.membershipBilling?.stripeAccountId || spaOwner.stripe.accountId,
      service: service._id,
      booking: null,
      paymentCategory: 'membership',
      amount,
      currency: invoice.currency || 'usd',
      subtotal: amount,
      discount: { amount: 0, type: null, code: null, description: null },
      tax: { amount: 0, rate: 0 },
      platformFee: { amount: 0, percentage: 0 },
      status,
      livemode: invoice.livemode,
      processedAt:
        status === 'succeeded' && invoice.status_transitions?.paid_at
          ? toDateFromUnix(invoice.status_transitions.paid_at)
          : null,
      failedAt: status === 'failed' ? new Date() : null,
      pointsEarned,
      paymentMethod: {
        type: 'card',
        brand: user.membershipBilling?.defaultPaymentMethod?.brand || null,
        last4: user.membershipBilling?.defaultPaymentMethod?.last4 || null,
        expMonth: user.membershipBilling?.defaultPaymentMethod?.expMonth || null,
        expYear: user.membershipBilling?.defaultPaymentMethod?.expYear || null,
      },
      membershipDetails: {
        locationId,
        planId: plan?.resolvedPlanId || user.membership?.planId || null,
        planName: plan?.name || user.membership?.planName || null,
        invoiceUrl: invoice.hosted_invoice_url || null,
        billingReason: invoice.billing_reason || null,
        invoiceStatus: invoice.status || status,
      },
      errorMessage,
      errorCode: status === 'failed' ? invoice.last_finalization_error?.code || null : null,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  )

  const shouldAwardPoints =
    status === 'succeeded' &&
    pointsEarned > 0 &&
    (!existingPayment || existingPayment.status !== 'succeeded')

  if (shouldAwardPoints) {
    user.points += pointsEarned
    await user.save()
  }

  return payment
}

async function handleMembershipInvoicePaid(invoice, stripeAccountId) {
  if (!stripeAccountId || !invoice?.customer || !invoice?.subscription) return

  const { user, location, spaOwner, service, locationId } =
    await resolveMembershipWebhookContext({
      stripeAccountId,
      customerId: invoice.customer,
      subscriptionId:
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id || null,
    })

  if (!user || !spaOwner || !service) return

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription,
    {
      expand: ['default_payment_method', 'items.data.price'],
    },
    {
      stripeAccount: stripeAccountId,
    }
  )
  const priceId = subscription?.items?.data?.[0]?.price?.id || null
  const plan =
    resolveMembershipPlanFromPriceId({ location, priceId }) ||
    resolveMembershipPlanForLocation({
      location,
      planId: user.membershipBilling?.pendingPlan?.planId || user.membership?.planId,
      planName: user.membershipBilling?.pendingPlan?.planName || user.membership?.planName,
    })

  await upsertMembershipInvoicePayment({
    invoice,
    subscription,
    user,
    locationId,
    spaOwner,
    service,
    plan,
    status: 'succeeded',
  })

  await applyMembershipStateToUser({
    user,
    locationId,
    serviceId: service._id,
    subscription,
    plan,
    invoice,
    stripeAccountId,
    defaultPaymentMethod:
      subscription.default_payment_method &&
      typeof subscription.default_payment_method !== 'string'
        ? subscription.default_payment_method
        : null,
    clearPendingPlan: true,
  })

  user.set('membershipBilling.autoDowngradedAt', null)
  clearMembershipDelinquencyState(user)
  await user.save()
}

async function handleMembershipInvoicePaymentFailed(invoice, stripeAccountId) {
  if (!stripeAccountId || !invoice?.customer || !invoice?.subscription) return

  const { user, location, spaOwner, service, locationId } =
    await resolveMembershipWebhookContext({
      stripeAccountId,
      customerId: invoice.customer,
      subscriptionId:
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id || null,
    })

  if (!user || !spaOwner || !service) return

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription,
    {
      expand: ['default_payment_method', 'items.data.price'],
    },
    {
      stripeAccount: stripeAccountId,
    }
  )
  const plan = resolveMembershipPlanFromPriceId({
    location,
    priceId: subscription?.items?.data?.[0]?.price?.id || null,
  })

  await upsertMembershipInvoicePayment({
    invoice,
    subscription,
    user,
    locationId,
    spaOwner,
    service,
    plan,
    status: 'failed',
    errorMessage: 'Membership renewal payment failed',
  })

  await applyMembershipStateToUser({
    user,
    locationId,
    serviceId: service._id,
    subscription: {
      ...subscription,
      status: invoice.attempt_count > 0 ? 'past_due' : subscription.status,
    },
    plan,
    invoice,
    stripeAccountId,
    defaultPaymentMethod:
      subscription.default_payment_method &&
      typeof subscription.default_payment_method !== 'string'
        ? subscription.default_payment_method
        : null,
    preserveCurrentPlan: true,
  })

  const failureAnchor =
    toDateFromUnix(invoice?.status_transitions?.finalized_at) ||
    toDateFromUnix(invoice?.created) ||
    new Date()
  const { gracePeriodEndsAt } = markMembershipPaymentFailureState({
    user,
    failureStartedAt: failureAnchor,
  })

  const now = new Date()
  if (now.getTime() < gracePeriodEndsAt.getTime()) {
    await user.save()
    return
  }

  const subscriptionId = subscription?.id || user.membershipBilling?.subscriptionId || null
  if (subscriptionId) {
    try {
      await stripe.subscriptions.cancel(
        subscriptionId,
        {
          prorate: false,
        },
        { stripeAccount: stripeAccountId }
      )
    } catch (stripeCancelError) {
      const isAlreadyGone =
        stripeCancelError?.type === 'StripeInvalidRequestError' &&
        stripeCancelError?.code === 'resource_missing'
      if (!isAlreadyGone) {
        throw stripeCancelError
      }
    }
  }

  await downgradeUserToFreeMembership({
    user,
    downgradedAt: now,
  })
}

async function handleMembershipSubscriptionUpdated(subscription, stripeAccountId) {
  if (!stripeAccountId || !subscription?.customer) return

  const { user, location, service, locationId } =
    await resolveMembershipWebhookContext({
      stripeAccountId,
      customerId: subscription.customer,
      subscriptionId: subscription.id,
    })

  if (!user) return

  const expandedSubscription = await stripe.subscriptions.retrieve(
    subscription.id,
    {
      expand: ['default_payment_method', 'items.data.price'],
    },
    {
      stripeAccount: stripeAccountId,
    }
  )
  const plan = resolveMembershipPlanFromPriceId({
    location,
    priceId: expandedSubscription?.items?.data?.[0]?.price?.id || null,
  })
  const pendingPlanId = user.membershipBilling?.pendingPlan?.planId || null
  const preserveCurrentPlan = Boolean(
    pendingPlanId &&
      pendingPlanId !== buildMembershipPlanId(plan, plan?.name) &&
      MEMBERSHIP_VISIBLE_STATUSES.has(`${expandedSubscription.status || ''}`.toLowerCase())
  )

  await applyMembershipStateToUser({
    user,
    locationId,
    serviceId: service?._id || user.membershipBilling?.serviceId || null,
    subscription: expandedSubscription,
    plan,
    stripeAccountId,
    defaultPaymentMethod:
      expandedSubscription.default_payment_method &&
      typeof expandedSubscription.default_payment_method !== 'string'
        ? expandedSubscription.default_payment_method
        : null,
    preserveCurrentPlan,
  })

  const subscriptionStatus = `${expandedSubscription?.status || ''}`.trim().toLowerCase()
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    user.set('membershipBilling.autoDowngradedAt', null)
    clearMembershipDelinquencyState(user)
    await user.save()
    return
  }

  if (!['past_due', 'unpaid'].includes(subscriptionStatus)) {
    return
  }

  const failureAnchor =
    user.membershipBilling?.paymentFailureStartedAt ||
    toDateFromUnix(expandedSubscription?.current_period_end) ||
    new Date()
  const { gracePeriodEndsAt } = markMembershipPaymentFailureState({
    user,
    failureStartedAt: failureAnchor,
  })

  const now = new Date()
  if (now.getTime() < gracePeriodEndsAt.getTime()) {
    await user.save()
    return
  }

  try {
    await stripe.subscriptions.cancel(
      expandedSubscription.id,
      {
        prorate: false,
      },
      { stripeAccount: stripeAccountId }
    )
  } catch (stripeCancelError) {
    const isAlreadyGone =
      stripeCancelError?.type === 'StripeInvalidRequestError' &&
      stripeCancelError?.code === 'resource_missing'
    if (!isAlreadyGone) {
      throw stripeCancelError
    }
  }

  await downgradeUserToFreeMembership({
    user,
    downgradedAt: now,
  })
}

async function handleMembershipSubscriptionDeleted(subscription, stripeAccountId) {
  if (!stripeAccountId || !subscription?.customer) return

  const { user, locationId, service } = await resolveMembershipWebhookContext({
    stripeAccountId,
    customerId: subscription.customer,
    subscriptionId: subscription.id,
  })

  if (!user) return

  await applyMembershipStateToUser({
    user,
    locationId,
    serviceId: service?._id || user.membershipBilling?.serviceId || null,
    subscription: {
      ...subscription,
      status: 'canceled',
    },
    plan: null,
    stripeAccountId,
    preserveCurrentPlan: true,
    clearPendingPlan: true,
  })

  user.membership.isActive = false
  user.membership.status = 'canceled'
  user.activeMembership.isActive = false
  user.activeMembership.status = 'canceled'
  user.membershipStatus = 'canceled'
  user.membershipBilling.subscriptionId = null
  user.membershipBilling.subscriptionItemId = null
  await user.save()
}

async function handlePaymentSucceeded(paymentIntent) {
  const payments = await Payment.find({
    stripePaymentIntentId: paymentIntent.id,
  })

  if (payments.length > 0) {
    for (const payment of payments) {
      if (payment.status !== 'succeeded') {
        payment.status = 'succeeded'
        payment.processedAt = new Date()
        await payment.save()

        // Update customer points
        const customer = await User.findById(payment.customer)
        if (customer) {
          customer.points += payment.pointsEarned
          await customer.save()
        }
      }
    }
  }
}

async function handlePaymentFailed(paymentIntent) {
  const payments = await Payment.find({
    stripePaymentIntentId: paymentIntent.id,
  })

  if (payments.length > 0) {
    for (const payment of payments) {
      payment.status = 'failed'
      payment.failedAt = new Date()
      payment.errorMessage =
        paymentIntent.last_payment_error?.message || 'Payment failed'
      payment.errorCode = paymentIntent.last_payment_error?.code || null
      await payment.save()
    }
  }
}

async function handleChargeRefunded(charge) {
  const payment = await Payment.findOne({ stripeChargeId: charge.id })

  if (payment) {
    const refundAmount = charge.amount_refunded
    const isPartialRefund = refundAmount < charge.amount

    payment.status = isPartialRefund ? 'partially_refunded' : 'refunded'
    payment.refund.amount = refundAmount
    await payment.save()
  }
}

/**
 * Get revenue tracking per client for spa owner
 */
export const getClientRevenueAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (user.role !== 'spa' && user.role !== 'admin' && user.role !== 'super-admin') {
      return next(
        createError(403, 'Only spa owners and admins can access client revenue tracking')
      )
    }

    // Aggregate payments by customer
    const clientRevenue = await Payment.aggregate([
      {
        $match: {
          spaOwner: user._id,
          status: 'succeeded'
        }
      },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          lastPaymentDate: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      {
        $unwind: '$customerDetails'
      },
      {
        $project: {
          _id: 1,
          totalSpent: { $divide: ['$totalSpent', 100] }, // Convert to dollars
          transactionCount: 1,
          lastPaymentDate: 1,
          customerName: '$customerDetails.name',
          customerEmail: '$customerDetails.email',
          customerAvatar: '$customerDetails.avatar'
        }
      },
      {
        $sort: { totalSpent: -1 }
      }
    ])

    const totalEarnings = clientRevenue.reduce((sum, client) => sum + client.totalSpent, 0)

    res.status(200).json({
      success: true,
      totalEarnings,
      clients: clientRevenue
    })
  } catch (error) {
    console.error('Error fetching client revenue analytics:', error)
    next(error)
  }
}
