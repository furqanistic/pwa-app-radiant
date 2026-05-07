import test from 'node:test'
import assert from 'node:assert/strict'

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'

const [
  { updateLocation },
  { default: stripe },
  { default: Location },
  { default: User },
] = await Promise.all([
  import('../controller/location.js'),
  import('../config/stripe.js'),
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

const createLocationDoc = () => ({
  _id: 'loc_doc_membership_1',
  locationId: 'loc_membership_sync_1',
  name: 'CxR Spa',
  address: '',
  phone: '',
  reviewLink: '',
  coordinates: {},
  logo: '',
  subtitle: '',
  subdomain: '',
  favicon: '',
  themeColor: '#ec4899',
  addedBy: { toString: () => 'super_admin_1' },
  pointsSettings: { methods: [] },
  membership: {
    isActive: true,
    plans: [
      {
        name: 'Glow',
        description: 'Glow benefits',
        price: 100,
        currency: 'usd',
        benefits: ['Priority booking'],
        stripeProductId: 'prod_existing_glow',
        stripePriceId: 'price_existing_glow',
      },
    ],
  },
})

test('updateLocation recreates Stripe membership price when saved Stripe price is stale', async () => {
  const createdPrices = []
  const updatedPayloads = []
  const locationDoc = createLocationDoc()

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [Location, 'findById', async () => locationDoc],
      [
        Location,
        'findByIdAndUpdate',
        (id, updateData) => ({
          populate: async () => {
            updatedPayloads.push({ id, updateData })
            return { ...locationDoc, ...updateData }
          },
        }),
      ],
      [
        User,
        'find',
        async (query) => {
          if (query?.role === 'spa') {
            return [
              {
                _id: 'spa_membership_sync_1',
                role: 'spa',
                stripe: { accountId: 'acct_membership_sync_1', chargesEnabled: true },
                spaLocation: { locationId: 'loc_membership_sync_1' },
                markModified() {},
                async save() {
                  return this
                },
              },
            ]
          }
          return []
        },
      ],
      [User, 'exists', async () => false],
      [User, 'updateMany', async () => ({ modifiedCount: 0 })],
      [
        stripe.products,
        'retrieve',
        async () => ({
          id: 'prod_existing_glow',
          name: 'Glow',
          description: 'Glow benefits',
        }),
      ],
      [stripe.products, 'update', async (id, payload) => ({ id, ...payload })],
      [
        stripe.prices,
        'retrieve',
        async () => ({
          id: 'price_existing_glow',
          unit_amount: 5000,
          currency: 'usd',
          recurring: { interval: 'month' },
        }),
      ],
      [
        stripe.prices,
        'create',
        async (payload, options) => {
          createdPrices.push({ payload, options })
          return { id: 'price_new_glow', ...payload }
        },
      ],
    ],
    async () => {
      await updateLocation(
        {
          params: { id: 'loc_doc_membership_1' },
          user: { id: 'super_admin_1', role: 'super-admin' },
          body: {
            membership: {
              isActive: true,
              plans: [
                {
                  name: 'Glow',
                  description: 'Glow benefits',
                  price: 100,
                  benefits: ['Priority booking'],
                },
              ],
            },
          },
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
  assert.equal(createdPrices.length, 1)
  assert.equal(createdPrices[0].payload.unit_amount, 10000)
  assert.equal(createdPrices[0].payload.recurring.interval, 'month')
  assert.deepEqual(createdPrices[0].options, { stripeAccount: 'acct_membership_sync_1' })
  assert.equal(
    updatedPayloads[0].updateData.membership.plans[0].stripePriceId,
    'price_new_glow'
  )
})

test('updateLocation reuses Stripe membership price only after live Stripe verification', async () => {
  const createdPrices = []
  const updatedPayloads = []
  const locationDoc = createLocationDoc()

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [Location, 'findById', async () => locationDoc],
      [
        Location,
        'findByIdAndUpdate',
        (id, updateData) => ({
          populate: async () => {
            updatedPayloads.push({ id, updateData })
            return { ...locationDoc, ...updateData }
          },
        }),
      ],
      [
        User,
        'find',
        async (query) => {
          if (query?.role === 'spa') {
            return [
              {
                _id: 'spa_membership_sync_1',
                role: 'spa',
                stripe: { accountId: 'acct_membership_sync_1', chargesEnabled: true },
                spaLocation: { locationId: 'loc_membership_sync_1' },
                markModified() {},
                async save() {
                  return this
                },
              },
            ]
          }
          return []
        },
      ],
      [User, 'exists', async () => false],
      [User, 'updateMany', async () => ({ modifiedCount: 0 })],
      [
        stripe.products,
        'retrieve',
        async () => ({
          id: 'prod_existing_glow',
          name: 'Glow',
          description: 'Glow benefits',
        }),
      ],
      [
        stripe.prices,
        'retrieve',
        async () => ({
          id: 'price_existing_glow',
          unit_amount: 10000,
          currency: 'usd',
          recurring: { interval: 'month' },
        }),
      ],
      [
        stripe.prices,
        'create',
        async (payload, options) => {
          createdPrices.push({ payload, options })
          return { id: 'price_should_not_create', ...payload }
        },
      ],
    ],
    async () => {
      await updateLocation(
        {
          params: { id: 'loc_doc_membership_1' },
          user: { id: 'super_admin_1', role: 'super-admin' },
          body: {
            membership: {
              isActive: true,
              plans: [
                {
                  name: 'Glow',
                  description: 'Glow benefits',
                  price: 100,
                  benefits: ['Priority booking'],
                },
              ],
            },
          },
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
  assert.equal(createdPrices.length, 0)
  assert.equal(
    updatedPayloads[0].updateData.membership.plans[0].stripePriceId,
    'price_existing_glow'
  )
})
