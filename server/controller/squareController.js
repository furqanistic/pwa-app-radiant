// File: server/controller/squareController.js
import axios from 'axios'
import { randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'
import {
  squareApiBaseUrl,
  squareApiVersion,
  squareApplicationId,
  squareApplicationSecret,
  squareEnvironment,
  squareOAuthBaseUrl,
  squareOAuthScopes,
  squareRedirectUrl,
  squareRequiredMembershipScopes,
} from '../config/square.js'
import { createError } from '../error.js'
import Location from '../models/Location.js'
import User from '../models/User.js'
import {
  isSquareUnauthorizedCatalogError,
  merchantScopesIncludeItemsWrite,
  normalizeOAuthScopesFromResponse,
  refreshSquareAccessTokenIfNeeded,
  SQUARE_ITEMS_WRITE_HINT,
} from '../utils/squareOAuthTokens.js'

const getFrontendManagementUrl = ({ status = 'success', reason = '' } = {}) => {
  const base = process.env.CLIENT_URL || 'http://localhost:5173'
  const redirectUrl = new URL('/management', base)
  redirectUrl.searchParams.set('square', status)
  if (reason) {
    redirectUrl.searchParams.set('reason', reason)
  }
  return redirectUrl.toString()
}

const getFrontendManagementUrlForLocation = ({
  status = 'success',
  reason = '',
  locationId = '',
} = {}) => {
  const url = new URL(getFrontendManagementUrl({ status, reason }))
  if (locationId) {
    url.searchParams.set('spa', locationId)
  }
  return url.toString()
}

const ensureSquareConfig = () => {
  if (!squareApplicationId || !squareApplicationSecret) {
    throw createError(
      500,
      'Square is not configured. Missing SQUARE_APPLICATION_ID or SQUARE_APPLICATION_SECRET.'
    )
  }
}

const buildOAuthStateToken = ({ userId, locationId }) =>
  jwt.sign(
    {
      userId,
      locationId,
      nonce: randomBytes(12).toString('hex'),
      provider: 'square',
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )

const readSquareErrorMessage = (error) => {
  const details = error?.response?.data?.errors
  if (Array.isArray(details) && details.length > 0) {
    return details.map((item) => item?.detail || item?.code).filter(Boolean).join(' ')
  }
  return error?.response?.data?.message || error?.message || 'Square request failed.'
}

const getSquareDashboardUrl = () =>
  squareEnvironment === 'production'
    ? 'https://app.squareup.com/dashboard'
    : 'https://squareupsandbox.com/dashboard'

const clearSquareMembershipDataForLocation = async (locationId) => {
  const cleanLocationId = `${locationId || ''}`.trim()
  if (!cleanLocationId) return

  const location = await Location.findOne({ locationId: cleanLocationId })
  if (!location?.membership) return

  const membership = location.membership
  const plans = Array.isArray(membership.plans) ? membership.plans : []
  const hasStripeCatalogData = Boolean(
    membership.stripeProductId ||
      membership.stripePriceId ||
      plans.some((plan) => plan?.stripeProductId || plan?.stripePriceId)
  )

  membership.pendingSquareActivation = false
  membership.squareSyncError = null

  if (!hasStripeCatalogData) {
    membership.isActive = false
    membership.syncedAt = null
  }

  plans.forEach((plan) => {
    plan.squareSubscriptionPlanId = null
    plan.squareSubscriptionPlanVariationId = null
    if (!plan?.stripeProductId && !plan?.stripePriceId) {
      plan.syncedAt = null
    }
  })

  location.markModified('membership')
  await location.save()
}

const getSquarePostConnectWarningReason = (error) => {
  const message = `${error?.message || readSquareErrorMessage(error) || ''}`
  if (
    error?.status === 403 ||
    message.includes('ITEMS_WRITE') ||
    message.includes('catalog sync is not authorized')
  ) {
    return 'square_missing_catalog_scope'
  }
  if (
    error?.status === 502 ||
    message.includes('Square catalog sync failed')
  ) {
    return 'square_catalog_sync_failed'
  }
  return 'callback_failed'
}

const toIsoDateOrNull = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const getSquareStatusFromToken = async (accessToken) => {
  if (!accessToken) return { isConnected: false }

  const tokenStatusResponse = await axios.post(
    `${squareOAuthBaseUrl}/token/status`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': squareApiVersion,
        'Content-Type': 'application/json',
      },
    }
  )

  const tokenStatus = tokenStatusResponse?.data || {}
  return {
    isConnected: true,
    merchantId: tokenStatus.merchant_id || null,
    expiresAt: tokenStatus.expires_at || null,
    scopes: Array.isArray(tokenStatus.scopes) ? tokenStatus.scopes : [],
  }
}

const getSquareHeaders = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
  'Square-Version': squareApiVersion,
  'Content-Type': 'application/json',
})

const buildSquareMonthlyStaticPhase = ({ amountInCents, currency }) => ({
  cadence: 'MONTHLY',
  ordinal: 0,
  pricing: {
    type: 'STATIC',
    price_money: {
      amount: amountInCents,
      currency,
    },
  },
})

const upsertSquareCatalogObject = async ({ accessToken, catalogObject }) => {
  const response = await axios.post(
    `${squareApiBaseUrl}/v2/catalog/object`,
    {
      idempotency_key: `sq_cat_${Date.now()}_${randomBytes(6).toString('hex')}`,
      object: catalogObject,
    },
    { headers: getSquareHeaders(accessToken) }
  )
  return response?.data?.catalog_object || null
}

const upsertSquareCatalogObjectForOwner = async ({ squareOwner, catalogObject }) => {
  try {
    const refreshedOwner = await refreshSquareAccessTokenIfNeeded(squareOwner)
    return await upsertSquareCatalogObject({
      accessToken: refreshedOwner.square.accessToken,
      catalogObject,
    })
  } catch (error) {
    if (!isSquareUnauthorizedCatalogError(error)) {
      throw error
    }

    try {
      const refreshedOwner = await refreshSquareAccessTokenIfNeeded(squareOwner, {
        forceRefresh: true,
      })
      return await upsertSquareCatalogObject({
        accessToken: refreshedOwner.square.accessToken,
        catalogObject,
      })
    } catch (retryError) {
      if (isSquareUnauthorizedCatalogError(retryError)) {
        throw createError(400, SQUARE_ITEMS_WRITE_HINT)
      }
      throw retryError
    }
  }
}

const hasAnyStripeLinkedForLocation = async (locationId) => {
  if (!locationId) return false
  return Boolean(
    await User.exists({
      role: 'spa',
      'stripe.accountId': { $nin: [null, ''] },
      'stripe.chargesEnabled': true,
      $or: [
        { 'stripe.locationId': locationId },
        {
          $and: [
            { 'stripe.locationId': { $in: [null, ''] } },
            { 'spaLocation.locationId': locationId },
          ],
        },
      ],
    })
  )
}

const getUserAccessibleLocationIds = (user) => {
  const ids = new Set()
  if (user?.spaLocation?.locationId) ids.add(user.spaLocation.locationId)
  if (user?.selectedLocation?.locationId) ids.add(user.selectedLocation.locationId)
  if (Array.isArray(user?.assignedLocations)) {
    user.assignedLocations.forEach((location) => {
      if (location?.locationId) ids.add(location.locationId)
    })
  }
  return [...ids].map((id) => `${id}`.trim()).filter(Boolean)
}

const getRequestedConnectionLocationId = (req, user) => {
  const requested =
    `${req.query?.locationId || req.body?.locationId || ''}`.trim()
  if (requested) return requested
  return (
    `${user?.square?.locationId || ''}`.trim() ||
    `${user?.selectedLocation?.locationId || ''}`.trim() ||
    `${user?.spaLocation?.locationId || ''}`.trim()
  )
}

const assertCanManageConnectionLocation = async (user, locationId) => {
  if (!locationId) {
    throw createError(400, 'Please select a spa location first')
  }
  if (!['spa', 'super-admin'].includes(user?.role)) {
    throw createError(403, 'Only spa owners or super-admins can connect Square accounts')
  }
  const accessibleIds = getUserAccessibleLocationIds(user)
  if (!accessibleIds.includes(`${locationId}`.trim())) {
    throw createError(403, 'You cannot connect Square for this location')
  }
  const location = await Location.findOne({ locationId })
  if (!location) {
    throw createError(404, 'Location not found')
  }
  return location
}

const syncPendingMembershipPlansToSquare = async (user, locationId = null) => {
  const targetLocationId =
    `${locationId || user?.square?.locationId || user?.spaLocation?.locationId || ''}`.trim()
  if (!targetLocationId || !user?.square?.accessToken) return
  if (merchantScopesIncludeItemsWrite(user.square.scopes) === false) {
    throw createError(400, SQUARE_ITEMS_WRITE_HINT)
  }

  const location = await Location.findOne({ locationId: targetLocationId })
  if (!location?.membership) return
  if (!location.membership.pendingSquareActivation && !location.membership.isActive) return

  const plans = Array.isArray(location.membership.plans) ? location.membership.plans : []
  if (!plans.length) return

  const plainPlans = plans.map((plan) =>
    typeof plan?.toObject === 'function' ? plan.toObject() : plan
  )
  const existingParentPlanId =
    plainPlans.find((plan) => plan?.squareSubscriptionPlanId)
      ?.squareSubscriptionPlanId || null

  let squareSubscriptionPlanId = existingParentPlanId
  const squareCurrency = `${user.square.currency || location.membership?.currency || 'usd'}`
    .trim()
    .toUpperCase()
  if (!squareSubscriptionPlanId) {
    const parentPlanSeed = plainPlans[0] || {}
    const parentAmount = Math.round(Number(parentPlanSeed?.price || 0) * 100)
    const parentPlan = await upsertSquareCatalogObjectForOwner({
      squareOwner: user,
      catalogObject: {
        type: 'SUBSCRIPTION_PLAN',
        id: `#membership-plan-${location.locationId}`,
        present_at_all_locations: true,
        subscription_plan_data: {
          name: `${location.name || location.locationId} Memberships`,
          phases: [
            buildSquareMonthlyStaticPhase({
              amountInCents: parentAmount,
              currency: squareCurrency,
            }),
          ],
          all_items: true,
        },
      },
    })
    squareSubscriptionPlanId = parentPlan?.id || null
  }

  const syncedPlans = []
  for (let index = 0; index < plainPlans.length; index += 1) {
    const plan = plainPlans[index]
    const amount = Math.round(Number(plan?.price || 0) * 100)
    const variation = plan?.squareSubscriptionPlanVariationId
      ? null
      : await upsertSquareCatalogObjectForOwner({
          squareOwner: user,
          catalogObject: {
            type: 'SUBSCRIPTION_PLAN_VARIATION',
            id: `#membership-plan-${location.locationId}-variation-${index}-${Date.now()}`,
            present_at_all_locations: true,
            subscription_plan_variation_data: {
              name: plan?.name || `Membership ${index + 1}`,
              subscription_plan_id: squareSubscriptionPlanId,
              phases: [
                buildSquareMonthlyStaticPhase({
                  amountInCents: amount,
                  currency: squareCurrency,
                }),
              ],
            },
          },
        })

    syncedPlans.push({
      ...plan,
      squareSubscriptionPlanId,
      squareSubscriptionPlanVariationId:
        plan?.squareSubscriptionPlanVariationId || variation?.id || null,
      currency: squareCurrency.toLowerCase(),
      syncedAt: plan?.syncedAt || new Date(),
    })
  }

  const firstPlan = syncedPlans[0] || plainPlans[0] || null

  location.membership = {
    ...(typeof location.membership?.toObject === 'function'
      ? location.membership.toObject()
      : location.membership),
    isActive: true,
    pendingSquareActivation: false,
    plans: syncedPlans,
    name: firstPlan?.name || location.membership.name,
    description: firstPlan?.description || location.membership.description,
    price: firstPlan?.price ?? location.membership.price,
    benefits: firstPlan?.benefits || location.membership.benefits,
    currency: firstPlan?.currency || location.membership.currency || 'usd',
    syncedAt: location.membership.syncedAt || new Date(),
  }
  await location.save()
}

export const createSquareAuthorizationUrl = async (req, res, next) => {
  try {
    ensureSquareConfig()
    const user = await User.findById(req.user.id)

    if (!user) {
      return next(createError(404, 'User not found'))
    }
    if (!['spa', 'super-admin'].includes(user.role)) {
      return next(
        createError(403, 'Only spa owners or super-admins can connect Square accounts')
      )
    }
    const locationId = getRequestedConnectionLocationId(req, user)
    await assertCanManageConnectionLocation(user, locationId)

    // Enforce single payout provider per location (Stripe XOR Square)
    const locationHasStripe = await hasAnyStripeLinkedForLocation(locationId)
    if (locationHasStripe) {
      return next(
        createError(
          409,
          'Stripe is already connected for this location. Disconnect Stripe before connecting Square.'
        )
      )
    }

    const state = buildOAuthStateToken({
      userId: user._id.toString(),
      locationId,
    })
    const params = new URLSearchParams({
      client_id: squareApplicationId,
      scope: squareOAuthScopes,
      session: 'false',
      response_type: 'code',
      state,
      redirect_uri: squareRedirectUrl,
    })

    res.status(200).json({
      success: true,
      url: `${squareOAuthBaseUrl}/authorize?${params.toString()}`,
      environment: squareEnvironment,
    })
  } catch (error) {
    console.error('Error creating Square authorization URL:', error)
    next(error)
  }
}

export const handleSquareCallback = async (req, res) => {
  let callbackLocationId = ''
  const failRedirect = ({ reason = 'unknown_error' } = {}) =>
    res.redirect(
      getFrontendManagementUrlForLocation({
        status: 'error',
        reason,
        locationId: callbackLocationId,
      })
    )

  try {
    ensureSquareConfig()
    const { code, state, error, error_description: errorDescription } = req.query

    if (error) {
      return failRedirect({
        reason: `${error}${errorDescription ? `:${errorDescription}` : ''}`,
      })
    }

    if (!code || !state) {
      return failRedirect({ reason: 'missing_code_or_state' })
    }

    let statePayload
    try {
      statePayload = jwt.verify(String(state), process.env.JWT_SECRET)
    } catch (verifyError) {
      return failRedirect({ reason: 'invalid_state' })
    }

    if (statePayload?.provider !== 'square' || !statePayload?.userId) {
      return failRedirect({ reason: 'invalid_state_payload' })
    }
    callbackLocationId = `${statePayload?.locationId || ''}`.trim()

    const user = await User.findById(statePayload.userId)
    if (!user) {
      return failRedirect({ reason: 'user_not_found' })
    }
    if (!['spa', 'super-admin'].includes(user.role)) {
      return failRedirect({ reason: 'invalid_role' })
    }
    if (!callbackLocationId) {
      return failRedirect({ reason: 'missing_spa_location' })
    }
    try {
      await assertCanManageConnectionLocation(user, callbackLocationId)
    } catch (locationError) {
      return failRedirect({ reason: locationError?.message || 'invalid_location' })
    }

    const locationHasStripe = await hasAnyStripeLinkedForLocation(callbackLocationId)
    if (locationHasStripe) {
      return failRedirect({ reason: 'stripe_connected_for_location' })
    }

    const tokenResponse = await axios.post(
      `${squareOAuthBaseUrl}/token`,
      {
        client_id: squareApplicationId,
        client_secret: squareApplicationSecret,
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: squareRedirectUrl,
      },
      {
        headers: {
          'Square-Version': squareApiVersion,
          'Content-Type': 'application/json',
        },
      }
    )

    const tokenData = tokenResponse?.data || {}
    const merchantResponse = await axios.get(`${squareApiBaseUrl}/v2/merchants`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Square-Version': squareApiVersion,
        'Content-Type': 'application/json',
      },
    })

    const merchantPayload = merchantResponse?.data?.merchant
    const merchantDetails = Array.isArray(merchantPayload)
      ? merchantPayload[0]
      : merchantPayload || null

    user.square = {
      locationId: callbackLocationId,
      merchantId: tokenData.merchant_id || merchantDetails?.id || null,
      merchantStatus: merchantDetails?.status || 'ACTIVE',
      businessName: merchantDetails?.business_name || null,
      mainLocationId: merchantDetails?.main_location_id || null,
      country: merchantDetails?.country || null,
      currency: merchantDetails?.currency || null,
      accessToken: tokenData.access_token || null,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiresAt: toIsoDateOrNull(tokenData.expires_at),
      scopes: normalizeOAuthScopesFromResponse(tokenData),
      connectedAt: new Date(),
      lastUpdated: new Date(),
    }

    await user.save()
    try {
      await syncPendingMembershipPlansToSquare(user, callbackLocationId)
    } catch (syncError) {
      const reason = getSquarePostConnectWarningReason(syncError)
      console.error(
        'Square connected, but pending membership sync failed:',
        syncError?.message || readSquareErrorMessage(syncError)
      )
      return res.redirect(
        getFrontendManagementUrlForLocation({
          status: 'success',
          reason,
          locationId: callbackLocationId,
        })
      )
    }

    return res.redirect(
      getFrontendManagementUrlForLocation({
        status: 'success',
        locationId: callbackLocationId,
      })
    )
  } catch (error) {
    console.error(
      'Error handling Square callback:',
      error?.message || readSquareErrorMessage(error)
    )
    const reason =
      error?.status === 403 ||
      `${error?.message || ''}`.includes('ITEMS_WRITE') ||
      `${error?.message || ''}`.includes('catalog sync is not authorized')
        ? 'square_missing_catalog_scope'
        : error?.status === 502 ||
            `${error?.message || ''}`.includes('Square catalog sync failed')
          ? 'square_catalog_sync_failed'
          : 'callback_failed'
    return failRedirect({ reason })
  }
}

export const getSquareAccountStatus = async (req, res, next) => {
  try {
    ensureSquareConfig()
    const user = await User.findById(req.user.id).select(
      '+square.accessToken +square.refreshToken'
    )

    if (!user) {
      return next(createError(404, 'User not found'))
    }
    const requestedLocationId = getRequestedConnectionLocationId(req, user)
    if (!user.square?.merchantId || !user.square?.accessToken) {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'No Square account connected',
      })
    }
    const connectedLocationId =
      `${user.square.locationId || user.spaLocation?.locationId || ''}`.trim()
    if (
      requestedLocationId &&
      connectedLocationId &&
      requestedLocationId !== connectedLocationId
    ) {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'No Square account connected for this location',
      })
    }

    const tokenStatus = await getSquareStatusFromToken(user.square.accessToken)
    user.square.lastUpdated = new Date()
    user.square.tokenExpiresAt = toIsoDateOrNull(tokenStatus.expiresAt)
    if (tokenStatus.merchantId) {
      user.square.merchantId = tokenStatus.merchantId
    }
    if (tokenStatus.scopes.length > 0) {
      user.square.scopes = tokenStatus.scopes
    }
    await user.save()

    const grantedScopes = Array.isArray(user.square.scopes) ? user.square.scopes : []
    const grantedScopeSet = new Set(
      grantedScopes.map((scope) => `${scope}`.trim().toUpperCase()).filter(Boolean)
    )
    const missingMembershipScopes = squareRequiredMembershipScopes.filter(
      (scope) => !grantedScopeSet.has(scope)
    )

    const hasPayoutReadyAccount = Boolean(
      tokenStatus.isConnected && user.square?.merchantId && user.square?.mainLocationId
    )

    return res.status(200).json({
      success: true,
      connected: hasPayoutReadyAccount,
      account: {
        locationId: connectedLocationId || null,
        merchantId: user.square.merchantId || null,
        businessName: user.square.businessName || null,
        mainLocationId: user.square.mainLocationId || null,
        status: user.square.merchantStatus || 'ACTIVE',
        country: user.square.country || null,
        currency: user.square.currency || null,
        tokenExpiresAt: user.square.tokenExpiresAt || null,
        scopes: grantedScopes,
        missingMembershipScopes,
      },
      requiredMembershipScopes: squareRequiredMembershipScopes,
      requiresReconnect: missingMembershipScopes.length > 0,
      dashboardUrl: getSquareDashboardUrl(),
      environment: squareEnvironment,
    })
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      try {
        await User.findByIdAndUpdate(
          req.user.id,
          {
            square: {
              locationId: null,
              merchantId: null,
              merchantStatus: null,
              businessName: null,
              mainLocationId: null,
              country: null,
              currency: null,
              accessToken: null,
              refreshToken: null,
              tokenExpiresAt: null,
              scopes: [],
              connectedAt: null,
              lastUpdated: new Date(),
            },
          },
          { new: false }
        )
      } catch (cleanupError) {
        console.error('Square token cleanup failed:', cleanupError)
      }

      return res.status(200).json({
        success: true,
        connected: false,
        message: 'Square connection expired. Please reconnect your account.',
      })
    }

    console.error('Error fetching Square account status:', readSquareErrorMessage(error))
    next(error)
  }
}

export const disconnectSquareAccount = async (req, res, next) => {
  try {
    ensureSquareConfig()
    const user = await User.findById(req.user.id).select(
      '+square.accessToken +square.refreshToken'
    )

    if (!user || !user.square?.merchantId) {
      return next(createError(400, 'No Square account connected'))
    }
    const requestedLocationId = getRequestedConnectionLocationId(req, user)
    const connectedLocationId =
      `${user.square.locationId || user.spaLocation?.locationId || ''}`.trim()
    if (
      requestedLocationId &&
      connectedLocationId &&
      requestedLocationId !== connectedLocationId
    ) {
      return next(createError(400, 'No Square account connected for this location'))
    }

    const accessToken = user.square.accessToken
    const refreshToken = user.square.refreshToken

    // Revoke both access token and refresh token to fully disconnect
    if (accessToken) {
      try {
        await axios.post(
          `${squareOAuthBaseUrl}/revoke`,
          {
            client_id: squareApplicationId,
            access_token: accessToken,
          },
          {
            headers: {
              Authorization: `Client ${squareApplicationSecret}`,
              'Square-Version': squareApiVersion,
              'Content-Type': 'application/json',
            },
          }
        )
        console.log('Square access token revoked successfully')
      } catch (revokeError) {
        console.error(
          'Square access token revoke failed, continuing with local disconnect:',
          readSquareErrorMessage(revokeError)
        )
      }
    }

    // Also revoke refresh token if available
    if (refreshToken) {
      try {
        await axios.post(
          `${squareOAuthBaseUrl}/revoke`,
          {
            client_id: squareApplicationId,
            access_token: refreshToken,
          },
          {
            headers: {
              Authorization: `Client ${squareApplicationSecret}`,
              'Square-Version': squareApiVersion,
              'Content-Type': 'application/json',
            },
          }
        )
        console.log('Square refresh token revoked successfully')
      } catch (revokeError) {
        console.error(
          'Square refresh token revoke failed (non-critical):',
          readSquareErrorMessage(revokeError)
        )
      }
    }

    user.square = {
      locationId: null,
      merchantId: null,
      merchantStatus: null,
      businessName: null,
      mainLocationId: null,
      country: null,
      currency: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      scopes: [],
      connectedAt: null,
      lastUpdated: new Date(),
    }

    await clearSquareMembershipDataForLocation(connectedLocationId)
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Square account disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting Square account:', readSquareErrorMessage(error))
    next(error)
  }
}

export const getSquareDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user || !user.square?.merchantId) {
      return next(createError(400, 'No Square account connected'))
    }
    const requestedLocationId = getRequestedConnectionLocationId(req, user)
    const connectedLocationId =
      `${user.square.locationId || user.spaLocation?.locationId || ''}`.trim()
    if (
      requestedLocationId &&
      connectedLocationId &&
      requestedLocationId !== connectedLocationId
    ) {
      return next(createError(400, 'No Square account connected for this location'))
    }

    res.status(200).json({
      success: true,
      url: getSquareDashboardUrl(),
    })
  } catch (error) {
    console.error('Error building Square dashboard URL:', error)
    next(error)
  }
}
