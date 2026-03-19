// File: server/controller/stripeController.js - Stripe Connect & Payment Controller
import stripe from '../config/stripe.js'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Location from '../models/Location.js'
import Payment from '../models/Payment.js'
import Service from '../models/Service.js'
import User from '../models/User.js'
import { createGhlAppointmentForBooking } from './ghl.js'
import { getPointsMethodForLocation } from '../utils/pointsSettings.js'
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
  const existingCustomerId = user.membershipBilling?.stripeCustomerId
  const existingStripeAccountId = user.membershipBilling?.stripeAccountId

  if (existingCustomerId && existingStripeAccountId === stripeAccountId) {
    return existingCustomerId
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

    const setupIntent = await stripe.setupIntents.create(
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

    const plan = resolveMembershipPlanForLocation({
      location,
      planId,
      planName,
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

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        default_payment_method: defaultPaymentMethodId,
        collection_method: 'charge_automatically',
        payment_behavior: 'error_if_incomplete',
        metadata: {
          userId: user._id.toString(),
          locationId: `${locationId}`,
          serviceId: service._id.toString(),
          planId: `${plan.resolvedPlanId || ''}`,
          planName: `${plan.name || ''}`,
        },
        expand: ['default_payment_method', 'items.data.price'],
      },
      { stripeAccount: stripeAccountId }
    )

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
      plan,
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
    const plan = resolveMembershipPlanForLocation({ location, planId, planName })
    const stripeAccountId = user.membershipBilling.stripeAccountId

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
                price: plan.stripePriceId,
                quantity: Number.isFinite(subscriptionQuantity) ? subscriptionQuantity : 1,
              },
            ],
            proration_behavior: 'none',
          },
        ],
      },
      { stripeAccount: stripeAccountId }
    )

    ensureMembershipBillingShape(user)
    user.set('membershipBilling.pendingPlan', {
      planId: plan.resolvedPlanId,
      planName: plan.name,
      price: plan.numericPrice,
      currency: plan.currency,
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
    const { items, locationId: cartLocationId, userRewardId } = req.body
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

      if (userRewardId) {
        appliedReward = await UserReward.findOne({
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
          rewardUsed: userRewardId || null,
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

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'afterpay_clearpay'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: req.user.email,
        payment_intent_data: {
          transfer_data: {
            destination: checkoutSpaOwner.stripe.accountId,
          },
          metadata: {
            customerId: customerId.toString(),
            spaOwnerId: checkoutSpaOwner._id.toString(),
            bookingIds: bookings.map((b) => b._id.toString()).join(','),
            userRewardId: userRewardId || '',
            isCartCheckout: 'true',
          },
        },
        metadata: {
          customerId: customerId.toString(),
          bookingIds: bookings.map((b) => b._id.toString()).join(','),
          userRewardId: userRewardId || '',
          isCartCheckout: 'true',
        },
      })

      // Update bookings with session ID
      await Promise.all(
        bookings.map((booking) => {
          booking.stripeSessionId = session.id
          return booking.save()
        })
      )

      return res.status(201).json({
        success: true,
        sessionId: session.id,
        sessionUrl: session.url,
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
      rewardUsed,
      pointsUsed,
    } = req.body

    // Validate required fields
    if (!serviceId || !date || !time || !locationId) {
      return next(createError(400, 'Missing required booking fields'))
    }

    // Fetch service details
    const service = await Service.findById(serviceId).populate('createdBy')

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

    // Calculate pricing
    let subtotal = service.basePrice
    let discountAmount = 0
    let isFreeGift = false;

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
            discountAmount = (subtotal * service.discount.percentage) / 100
        }
        }

        // Apply points discount
        if (pointsUsed && pointsUsed > 0) {
        const customer = await User.findById(customerId)
        if (customer && customer.points >= pointsUsed) {
            discountAmount += pointsUsed // $1 per point
        }
        }
    }

    // Calculate final amount
    const finalPrice = Math.max(subtotal - discountAmount, 0)
    const amount = Math.round(finalPrice * 100) // Convert to cents
    const ghlCalendar = getServiceCalendarSelection(service)

    // Create temporary booking record
    const booking = await Booking.create({
      userId: customerId,
      serviceId,
      serviceName: service.name,
      servicePrice: subtotal,
      finalPrice,
      discountApplied: discountAmount,
      rewardUsed: rewardUsed || (isFreeGift ? 'BIRTHDAY_GIFT' : null),
      pointsUsed: pointsUsed || 0,
      date: new Date(date),
      time,
      duration: effectiveDuration,
      locationId,
      notes: notes || '',
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

    // Create Stripe Checkout Session
    const successUrl = `${process.env.CLIENT_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.CLIENT_URL}/services/${serviceId}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'afterpay_clearpay'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: service.name,
              description: `Booking on ${new Date(
                date
              ).toLocaleDateString()} at ${time}`,
              images: service.images?.length > 0 ? [service.images[0]] : [],
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
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
        },
      },
      metadata: {
        customerId: customerId.toString(),
        bookingId: booking._id.toString(),
        serviceId: serviceId.toString(),
      },
    })

    // Update booking with session ID
    booking.stripeSessionId = session.id
    await booking.save()

    res.status(201).json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
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
    const { serviceId, locationId, planId, planName } = req.body

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

    const session = await stripe.checkout.sessions.create({
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
      success_url: successUrl,
      cancel_url: cancelUrl,
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
    })

    res.status(201).json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
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
    let subtotal = service.basePrice
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

    const [service, customer] = await Promise.all([
      Service.findById(booking.serviceId),
      User.findById(customerId).select('name email'),
    ])

    if (!service || service.isDeleted) {
      booking.ghl.syncError = 'Service not found for GHL sync'
      await booking.save()
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
      return { ok: false, retryable }
    }

    booking.ghl.appointmentId = result.appointmentId || ''
    booking.ghl.appointmentStatus = 'confirmed'
    booking.ghl.syncedAt = new Date()
    booking.ghl.syncError = ''
    await booking.save()
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
    return { ok: false, retryable: true }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function syncBookingToGhlWithRetry(booking, customerId, maxAttempts = 3) {
  let attempt = 0
  let lastResult = { ok: false, retryable: true }

  while (attempt < maxAttempts) {
    attempt += 1
    lastResult = await syncBookingToGhl(booking, customerId)
    if (lastResult.ok || !lastResult.retryable) {
      return lastResult
    }
    if (attempt < maxAttempts) {
      await sleep(1200 * attempt)
    }
  }

  return lastResult
}

async function handleCheckoutSessionCompleted(session) {
  const bookingId = session.metadata.bookingId
  const bookingIds = session.metadata.bookingIds
  const customerId = session.metadata.customerId
  const userRewardId = session.metadata.userRewardId
  const isCartCheckout = session.metadata.isCartCheckout === 'true'
  const isMembershipCheckout = session.metadata.isMembershipCheckout === 'true'

  // Get payment intent details
  const paymentIntentId = session.payment_intent
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  const purchaseMethodCache = new Map()

  if (isMembershipCheckout) {
    const serviceId = session.metadata.serviceId
    const locationId = session.metadata.locationId
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

    await Payment.create({
      stripePaymentIntentId: paymentIntentId,
      customer: customerId,
      spaOwner: paymentIntent.metadata.spaOwnerId,
      stripeAccountId: paymentIntent.transfer_data.destination,
      service: service._id,
      booking: null,
      amount,
      currency: session.currency,
      subtotal: amount,
      discount: { amount: 0, type: null, code: null, description: null },
      tax: { amount: 0, rate: 0 },
      platformFee: { amount: 0, percentage: 0 },
      status: 'succeeded',
      livemode: paymentIntent.livemode,
      processedAt: new Date(),
      pointsEarned,
      paymentMethod: {
        type: paymentIntent.payment_method_types[0] || 'card',
        brand:
          paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand ||
          null,
        last4:
          paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4 ||
          null,
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

    if (bookings.length === 0) {
      console.error('No bookings found for IDs:', bookingIdArray)
      return
    }

    let totalPointsEarned = 0

    // Create payment records and update each booking
    for (const booking of bookings) {
      const pointsEarned = await resolvePurchasePoints(
        booking.locationId,
        booking.finalPrice,
        purchaseMethodCache
      )
      totalPointsEarned += pointsEarned

      // Create payment record for this booking
      const payment = await Payment.create({
        stripePaymentIntentId: paymentIntentId,
        customer: customerId,
        spaOwner: paymentIntent.metadata.spaOwnerId,
        stripeAccountId: paymentIntent.transfer_data.destination,
        service: booking.serviceId,
        booking: booking._id,
        amount: Math.round(booking.finalPrice * 100),
        currency: session.currency,
        subtotal: booking.servicePrice * 100,
        discount: {
          amount: booking.discountApplied * 100,
          type: booking.discountApplied > 0 ? 'service_discount' : null,
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
        livemode: paymentIntent.livemode,
        processedAt: new Date(),
        pointsEarned: pointsEarned,
        paymentMethod: {
          type: paymentIntent.payment_method_types[0] || 'card',
          brand:
            paymentIntent.charges?.data[0]?.payment_method_details?.card
              ?.brand || null,
          last4:
            paymentIntent.charges?.data[0]?.payment_method_details?.card
              ?.last4 || null,
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
    if (customer) {
      customer.points += totalPointsEarned
      await customer.save()
    }

    // Mark reward as used if provided
    if (userRewardId) {
      await UserReward.findByIdAndUpdate(userRewardId, {
        status: 'used',
        usedAt: new Date(),
        usedBy: customerId,
        actualValue: cartDiscountAmount || 0, // Note: cartDiscountAmount isn't in scope here, need to rethink or pull from metadata
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

  // Create payment record
  const singleBookingPoints = await resolvePurchasePoints(
    booking.locationId,
    booking.finalPrice,
    purchaseMethodCache
  )
  const payment = await Payment.create({
    stripePaymentIntentId: paymentIntentId,
    customer: customerId,
    spaOwner: paymentIntent.metadata.spaOwnerId,
    stripeAccountId: paymentIntent.transfer_data.destination,
    service: booking.serviceId,
    booking: booking._id,
    amount: session.amount_total,
    currency: session.currency,
    subtotal: booking.servicePrice * 100,
    discount: {
      amount: booking.discountApplied * 100,
      type: booking.discountApplied > 0 ? 'service_discount' : null,
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
    livemode: paymentIntent.livemode,
    processedAt: new Date(),
    pointsEarned: singleBookingPoints,
    paymentMethod: {
      type: paymentIntent.payment_method_types[0] || 'card',
      brand:
        paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand ||
        null,
      last4:
        paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4 ||
        null,
    },
  })

  // Update booking status
  booking.paymentStatus = 'paid'
  booking.paymentId = payment._id
  booking.pointsEarned = payment.pointsEarned
  await booking.save()

  const bookingService = await Service.findById(booking.serviceId)
  await activateMembershipForCustomer({
    customerId,
    booking,
    service: bookingService,
  })
  await syncBookingToGhlWithRetry(booking, customerId)

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
