// File: server/config/square.js

const normalizeSquareEnvironment = (value = '') => {
  const normalized = `${value}`.trim().toLowerCase()
  return normalized === 'production' ? 'production' : 'sandbox'
}

export const squareEnvironment = normalizeSquareEnvironment(
  process.env.SQUARE_ENV
)

export const squareApiVersion = process.env.SQUARE_API_VERSION || '2026-01-22'

export const squareApplicationId = process.env.SQUARE_APPLICATION_ID || ''
export const squareApplicationSecret =
  process.env.SQUARE_APPLICATION_SECRET || ''

export const squareOAuthBaseUrl =
  squareEnvironment === 'production'
    ? 'https://connect.squareup.com/oauth2'
    : 'https://connect.squareupsandbox.com/oauth2'

export const squareApiBaseUrl =
  squareEnvironment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'

const fallbackServerUrl = 'http://localhost:8800'
export const squareRedirectUrl =
  process.env.SQUARE_REDIRECT_URL ||
  `${process.env.SERVER_URL || fallbackServerUrl}/api/square/connect/callback`

export const squareRequiredMembershipScopes = [
  'MERCHANT_PROFILE_READ',
  'ITEMS_READ',
  'ITEMS_WRITE',
  'PAYMENTS_READ',
  'PAYMENTS_WRITE',
  'ORDERS_READ',
  'ORDERS_WRITE',
  'CUSTOMERS_READ',
  'CUSTOMERS_WRITE',
  'INVOICES_READ',
  'INVOICES_WRITE',
  'SUBSCRIPTIONS_READ',
  'SUBSCRIPTIONS_WRITE',
]

const normalizeScopeList = (value = '') =>
  `${value}`
    .split(/[\s,]+/)
    .map((scope) => scope.trim().toUpperCase())
    .filter(Boolean)

// Merge env scopes with required membership scopes so older .env files cannot
// accidentally omit Catalog/Subscription permissions from new OAuth links.
export const squareOAuthScopes = [
  ...new Set([
    ...normalizeScopeList(process.env.SQUARE_OAUTH_SCOPES),
    ...squareRequiredMembershipScopes,
  ]),
].join(' ')
