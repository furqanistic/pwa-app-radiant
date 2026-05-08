// Helpers for Square seller OAuth tokens (refresh + scope checks for Catalog API).
import axios from 'axios'
import {
  squareApiVersion,
  squareApplicationId,
  squareApplicationSecret,
  squareOAuthBaseUrl,
} from '../config/square.js'

const toDateOrNull = (value) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function normalizeOAuthScopesFromResponse(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.scopes)) {
    return data.scopes.map((s) => `${s}`.trim()).filter(Boolean)
  }
  if (typeof data.scope === 'string') {
    return data.scope.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

const readAxiosSquareDetail = (error) => {
  const details = error?.response?.data?.errors
  if (Array.isArray(details) && details.length > 0) {
    return details.map((item) => item?.detail || item?.code).filter(Boolean).join(' ')
  }
  return error?.response?.data?.message || error?.message || 'Square request failed.'
}

/**
 * Refresh seller access token using the long-lived refresh token.
 * @param {string} refreshToken
 * @returns {Promise<Record<string, unknown>>}
 */
export async function exchangeSquareRefreshToken(refreshToken) {
  if (!squareApplicationId || !squareApplicationSecret) {
    throw new Error('Square application credentials are not configured.')
  }
  const response = await axios.post(
    `${squareOAuthBaseUrl}/token`,
    {
      client_id: squareApplicationId,
      client_secret: squareApplicationSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
    {
      headers: {
        'Square-Version': squareApiVersion,
        'Content-Type': 'application/json',
      },
    }
  )
  return response?.data || {}
}

/**
 * Whether granted scopes include catalog write. Null = unknown (empty scopes array).
 * @param {string[]|undefined} scopes
 * @returns {boolean|null}
 */
export function merchantScopesIncludeItemsWrite(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) return null
  return scopes.some((s) => `${s}`.toUpperCase().replace(/-/g, '_').includes('ITEMS_WRITE'))
}

export const SQUARE_ITEMS_WRITE_HINT =
  'Square needs ITEMS_WRITE for membership catalog sync. In Square Developer Console > Applications > your app > OAuth, enable Items/Catalog permissions, save the app, then disconnect and reconnect Square under Management > Payouts.'

/**
 * Refreshes access token when missing/expiring soon, persists to user doc.
 * @param {import('mongoose').Document} userDoc User with square.refreshToken
 */
export async function refreshSquareAccessTokenIfNeeded(userDoc, { forceRefresh = false } = {}) {
  if (!userDoc?.square?.refreshToken) return userDoc

  const expiresAt = toDateOrNull(userDoc.square.tokenExpiresAt)
  const marginMs = 15 * 60 * 1000
  let shouldRefresh = Boolean(forceRefresh)
  if (!shouldRefresh && expiresAt && !Number.isNaN(expiresAt.getTime())) {
    shouldRefresh = expiresAt.getTime() - Date.now() < marginMs
  }

  if (!shouldRefresh) return userDoc

  const tokenData = await exchangeSquareRefreshToken(userDoc.square.refreshToken)
  userDoc.square.accessToken = tokenData.access_token || userDoc.square.accessToken
  if (tokenData.refresh_token) userDoc.square.refreshToken = tokenData.refresh_token
  userDoc.square.tokenExpiresAt = toDateOrNull(tokenData.expires_at)
  const normalizedScopes = normalizeOAuthScopesFromResponse(tokenData)
  if (normalizedScopes.length > 0) userDoc.square.scopes = normalizedScopes
  userDoc.square.lastUpdated = new Date()
  userDoc.markModified('square')
  await userDoc.save()
  return userDoc
}

export function isSquareUnauthorizedCatalogError(error) {
  const status = error?.response?.status
  const detail = `${readAxiosSquareDetail(error)}`.toLowerCase()
  return (
    status === 401 ||
    status === 403 ||
    detail.includes('authorized') ||
    detail.includes('unauthorized') ||
    detail.includes('permission_denied') ||
    detail.includes('permission denied')
  )
}

export { readAxiosSquareDetail as readSquareTokenExchangeError }
