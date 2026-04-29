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
} from '../config/square.js'
import { createError } from '../error.js'
import Location from '../models/Location.js'
import User from '../models/User.js'

const getFrontendManagementUrl = ({ status = 'success', reason = '' } = {}) => {
  const base = process.env.CLIENT_URL || 'http://localhost:5173'
  const redirectUrl = new URL('/management', base)
  redirectUrl.searchParams.set('square', status)
  if (reason) {
    redirectUrl.searchParams.set('reason', reason)
  }
  return redirectUrl.toString()
}

const ensureSquareConfig = () => {
  if (!squareApplicationId || !squareApplicationSecret) {
    throw createError(
      500,
      'Square is not configured. Missing SQUARE_APPLICATION_ID or SQUARE_APPLICATION_SECRET.'
    )
  }
}

const buildOAuthStateToken = (userId) =>
  jwt.sign(
    {
      userId,
      nonce: randomBytes(12).toString('hex'),
      provider: 'square',
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )

const readSquareErrorMessage = (error) => {
  const details = error?.response?.data?.errors
  if (Array.isArray(details) && details.length > 0) {
    return details.map((item) => item?.detail).filter(Boolean).join(' ')
  }
  return error?.response?.data?.message || error?.message || 'Square request failed.'
}

const getSquareDashboardUrl = () =>
  squareEnvironment === 'production'
    ? 'https://app.squareup.com/dashboard'
    : 'https://squareupsandbox.com/dashboard'

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

const hasAnyStripeLinkedForLocation = async (locationId) => {
  if (!locationId) return false
  return Boolean(
    await User.exists({
      role: 'spa',
      'spaLocation.locationId': locationId,
      'stripe.accountId': { $nin: [null, ''] },
      'stripe.chargesEnabled': true,
    })
  )
}

const normalizePlanCurrency = (value) => `${value || 'usd'}`.trim().toUpperCase()

const syncPendingMembershipPlansToSquare = async (user) => {
  if (!user?.spaLocation?.locationId || !user?.square?.accessToken) return

  const location = await Location.findOne({ locationId: user.spaLocation.locationId })
  if (!location?.membership) return
  if (!location.membership.pendingSquareActivation && !location.membership.isActive) return

  const plans = Array.isArray(location.membership.plans) ? location.membership.plans : []
  if (!plans.length) return

  const syncedPlans = []
  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index]
    const objectId =
      plan.squareSubscriptionPlanId || `#membership_plan_${index}_${randomBytes(8).toString('hex')}`
    const variationId =
      plan.squareSubscriptionPlanVariationId ||
      `#membership_plan_variation_${index}_${randomBytes(8).toString('hex')}`

    const response = await axios.post(
      `${squareApiBaseUrl}/v2/catalog/object`,
      {
        idempotency_key: `membership-${location.locationId}-${index}-${Date.now()}`,
        object: {
          id: objectId,
          type: 'SUBSCRIPTION_PLAN',
          subscription_plan_data: {
            name: plan.name,
            phases: [
              {
                cadence: 'MONTHLY',
                recurring_price_money: {
                  amount: Math.round(Number(plan.price || 0) * 100),
                  currency: normalizePlanCurrency(plan.currency),
                },
              },
            ],
            subscription_plan_variations: [
              {
                id: variationId,
                type: 'SUBSCRIPTION_PLAN_VARIATION',
                subscription_plan_variation_data: {
                  name: `${plan.name} - Monthly`,
                  phases: [
                    {
                      cadence: 'MONTHLY',
                      recurring_price_money: {
                        amount: Math.round(Number(plan.price || 0) * 100),
                        currency: normalizePlanCurrency(plan.currency),
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${user.square.accessToken}`,
          'Square-Version': squareApiVersion,
          'Content-Type': 'application/json',
        },
      }
    )

    const syncedObject = response?.data?.catalog_object || {}
    const syncedVariationId =
      syncedObject?.subscription_plan_data?.subscription_plan_variations?.[0]?.id ||
      plan.squareSubscriptionPlanVariationId ||
      null

    syncedPlans.push({
      ...(typeof plan?.toObject === 'function' ? plan.toObject() : plan),
      squareSubscriptionPlanId: syncedObject?.id || plan.squareSubscriptionPlanId || null,
      squareSubscriptionPlanVariationId: syncedVariationId,
      syncedAt: new Date(),
    })
  }

  const firstPlan = syncedPlans[0] || null
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
    syncedAt: firstPlan?.syncedAt || location.membership.syncedAt || new Date(),
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
    if (user.role !== 'spa') {
      return next(
        createError(
          403,
          'Only spa owners (spa role) can connect Square accounts'
        )
      )
    }
    if (!user.spaLocation?.locationId) {
      return next(createError(400, 'Please configure your spa location first'))
    }

    // Enforce single payout provider per location (Stripe XOR Square)
    const locationHasStripe = await hasAnyStripeLinkedForLocation(
      user.spaLocation.locationId
    )
    if (locationHasStripe) {
      return next(
        createError(
          409,
          'Stripe is already connected for this location. Disconnect Stripe before connecting Square.'
        )
      )
    }

    const state = buildOAuthStateToken(user._id.toString())
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
  const failRedirect = ({ reason = 'unknown_error' } = {}) =>
    res.redirect(getFrontendManagementUrl({ status: 'error', reason }))

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

    const user = await User.findById(statePayload.userId)
    if (!user) {
      return failRedirect({ reason: 'user_not_found' })
    }
    if (user.role !== 'spa') {
      return failRedirect({ reason: 'invalid_role' })
    }
    if (!user.spaLocation?.locationId) {
      return failRedirect({ reason: 'missing_spa_location' })
    }

    const locationHasStripe = await hasAnyStripeLinkedForLocation(
      user.spaLocation.locationId
    )
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
      merchantId: tokenData.merchant_id || merchantDetails?.id || null,
      merchantStatus: merchantDetails?.status || 'ACTIVE',
      businessName: merchantDetails?.business_name || null,
      mainLocationId: merchantDetails?.main_location_id || null,
      country: merchantDetails?.country || null,
      currency: merchantDetails?.currency || null,
      accessToken: tokenData.access_token || null,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiresAt: toIsoDateOrNull(tokenData.expires_at),
      scopes: Array.isArray(tokenData.scopes) ? tokenData.scopes : [],
      connectedAt: new Date(),
      lastUpdated: new Date(),
    }

    await user.save()
    await syncPendingMembershipPlansToSquare(user)
    return res.redirect(getFrontendManagementUrl({ status: 'success' }))
  } catch (error) {
    console.error('Error handling Square callback:', readSquareErrorMessage(error))
    return failRedirect({ reason: 'callback_failed' })
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
    if (!user.square?.merchantId || !user.square?.accessToken) {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'No Square account connected',
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

    const hasPayoutReadyAccount = Boolean(
      tokenStatus.isConnected && user.square?.merchantId && user.square?.mainLocationId
    )

    return res.status(200).json({
      success: true,
      connected: hasPayoutReadyAccount,
      account: {
        merchantId: user.square.merchantId || null,
        businessName: user.square.businessName || null,
        mainLocationId: user.square.mainLocationId || null,
        status: user.square.merchantStatus || 'ACTIVE',
        country: user.square.country || null,
        currency: user.square.currency || null,
        tokenExpiresAt: user.square.tokenExpiresAt || null,
        scopes: Array.isArray(user.square.scopes) ? user.square.scopes : [],
      },
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

    const accessToken = user.square.accessToken
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
      } catch (revokeError) {
        console.error(
          'Square revoke failed, continuing with local disconnect:',
          readSquareErrorMessage(revokeError)
        )
      }
    }

    user.square = {
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

    res.status(200).json({
      success: true,
      url: getSquareDashboardUrl(),
    })
  } catch (error) {
    console.error('Error building Square dashboard URL:', error)
    next(error)
  }
}
