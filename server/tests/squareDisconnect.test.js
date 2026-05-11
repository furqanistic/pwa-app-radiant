import test from 'node:test'
import assert from 'node:assert/strict'

process.env.SQUARE_APPLICATION_ID = process.env.SQUARE_APPLICATION_ID || 'sq_app_test'
process.env.SQUARE_APPLICATION_SECRET =
  process.env.SQUARE_APPLICATION_SECRET || 'sq_secret_test'

const [
  { disconnectSquareAccount },
  { default: axios },
  { default: Location },
  { default: User },
] = await Promise.all([
  import('../controller/squareController.js'),
  import('axios'),
  import('../models/Location.js'),
  import('../models/User.js'),
])

const withPatched = async (patches, run) => {
  const originals = patches.map(([obj, key]) => [obj, key, obj[key]])
  for (const [obj, key, value] of patches) {
    obj[key] = value
  }

  try {
    await run()
  } finally {
    for (const [obj, key, value] of originals) {
      obj[key] = value
    }
  }
}

const createMockRes = () => {
  const state = {
    statusCode: 200,
    jsonBody: null,
  }

  const res = {
    status(code) {
      state.statusCode = code
      return this
    },
    json(body) {
      state.jsonBody = body
      return this
    },
  }

  return { res, state }
}

test('disconnectSquareAccount clears connected location Square membership catalog data', async () => {
  const revokes = []
  const saved = { user: false, location: false, markedPath: null }
  const userDoc = {
    _id: 'spa_square_disconnect_1',
    spaLocation: { locationId: 'loc_square_disconnect_1' },
    square: {
      locationId: 'loc_square_disconnect_1',
      merchantId: 'merchant_square_disconnect_1',
      accessToken: 'sq_access_disconnect_1',
      refreshToken: 'sq_refresh_disconnect_1',
      currency: 'CAD',
    },
    async save() {
      saved.user = true
      return this
    },
  }
  const locationDoc = {
    locationId: 'loc_square_disconnect_1',
    membership: {
      isActive: true,
      pendingSquareActivation: true,
      squareSyncError: 'old sync error',
      syncedAt: new Date('2026-01-01T00:00:00.000Z'),
      plans: [
        {
          name: 'Glow',
          squareSubscriptionPlanId: 'sq_plan_old_1',
          squareSubscriptionPlanVariationId: 'sq_variation_old_1',
          syncedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    },
    markModified(path) {
      saved.markedPath = path
    },
    async save() {
      saved.location = true
      return this
    },
  }
  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [
        User,
        'findById',
        () => ({
          select: async () => userDoc,
        }),
      ],
      [Location, 'findOne', async () => locationDoc],
      [
        axios,
        'post',
        async (url, payload) => {
          revokes.push({ url, payload })
          return { data: {} }
        },
      ],
    ],
    async () => {
      await disconnectSquareAccount(
        {
          user: { id: 'spa_square_disconnect_1' },
          query: { locationId: 'loc_square_disconnect_1' },
          body: {},
        },
        res,
        (error) => {
          if (error) nextErrors.push(error)
        }
      )
    }
  )

  assert.equal(nextErrors.length, 0)
  assert.equal(state.statusCode, 200)
  assert.equal(state.jsonBody.success, true)
  assert.equal(revokes.length, 2)
  assert.equal(saved.location, true)
  assert.equal(saved.user, true)
  assert.equal(saved.markedPath, 'membership')
  assert.equal(userDoc.square.merchantId, null)
  assert.equal(userDoc.square.locationId, null)
  assert.equal(locationDoc.membership.isActive, false)
  assert.equal(locationDoc.membership.pendingSquareActivation, false)
  assert.equal(locationDoc.membership.squareSyncError, null)
  assert.equal(locationDoc.membership.syncedAt, null)
  assert.equal(locationDoc.membership.plans[0].squareSubscriptionPlanId, null)
  assert.equal(
    locationDoc.membership.plans[0].squareSubscriptionPlanVariationId,
    null
  )
  assert.equal(locationDoc.membership.plans[0].syncedAt, null)
})

test('disconnectSquareAccount lets super admin clear a location-level Square owner', async () => {
  const revokes = []
  const saved = { owner: false, location: false }
  const superAdminDoc = {
    _id: 'super_square_disconnect_1',
    role: 'super-admin',
    square: {},
    spaLocation: {},
  }
  const squareOwnerDoc = {
    _id: 'spa_square_owner_disconnect_1',
    role: 'spa',
    spaLocation: { locationId: 'loc_square_owner_disconnect_1' },
    square: {
      locationId: 'loc_square_owner_disconnect_1',
      merchantId: 'merchant_square_owner_disconnect_1',
      accessToken: 'sq_access_owner_disconnect_1',
      refreshToken: 'sq_refresh_owner_disconnect_1',
      mainLocationId: 'sq_location_owner_disconnect_1',
    },
    async save() {
      saved.owner = true
      return this
    },
  }
  const locationDoc = {
    locationId: 'loc_square_owner_disconnect_1',
    membership: {
      isActive: true,
      pendingSquareActivation: true,
      squareSyncError: 'old owner sync error',
      plans: [
        {
          name: 'Owner Glow',
          squareSubscriptionPlanId: 'sq_owner_plan_old_1',
          squareSubscriptionPlanVariationId: 'sq_owner_variation_old_1',
        },
      ],
    },
    markModified() {},
    async save() {
      saved.location = true
      return this
    },
  }
  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [
        User,
        'findById',
        () => ({
          select: async () => superAdminDoc,
        }),
      ],
      [
        User,
        'findOne',
        () => ({
          select() {
            return {
              sort: async () => squareOwnerDoc,
            }
          },
        }),
      ],
      [Location, 'findOne', async () => locationDoc],
      [
        axios,
        'post',
        async (url, payload) => {
          revokes.push({ url, payload })
          return { data: {} }
        },
      ],
    ],
    async () => {
      await disconnectSquareAccount(
        {
          user: { id: 'super_square_disconnect_1' },
          query: { locationId: 'loc_square_owner_disconnect_1' },
          body: {},
        },
        res,
        (error) => {
          if (error) nextErrors.push(error)
        }
      )
    }
  )

  assert.equal(nextErrors.length, 0)
  assert.equal(state.statusCode, 200)
  assert.equal(state.jsonBody.success, true)
  assert.equal(revokes.length, 2)
  assert.equal(saved.owner, true)
  assert.equal(saved.location, true)
  assert.equal(squareOwnerDoc.square.merchantId, null)
  assert.equal(squareOwnerDoc.square.locationId, null)
  assert.equal(locationDoc.membership.isActive, false)
  assert.equal(locationDoc.membership.pendingSquareActivation, false)
  assert.equal(locationDoc.membership.squareSyncError, null)
  assert.equal(locationDoc.membership.plans[0].squareSubscriptionPlanId, null)
  assert.equal(
    locationDoc.membership.plans[0].squareSubscriptionPlanVariationId,
    null
  )
})
