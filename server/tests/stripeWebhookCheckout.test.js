import test from 'node:test'
import assert from 'node:assert/strict'

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy'

const [
  { handleWebhook },
  { default: stripe },
  { default: Booking },
  { default: Payment },
  { default: Service },
  { default: User },
  { default: UserReward },
] = await Promise.all([
  import('../controller/stripeController.js'),
  import('../config/stripe.js'),
  import('../models/Booking.js'),
  import('../models/Payment.js'),
  import('../models/Service.js'),
  import('../models/User.js'),
  import('../models/UserReward.js'),
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
    sendBody: null,
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
    send(body) {
      state.sendBody = body
      return this
    },
  }

  return { res, state }
}

const asQueryLike = (value, selectedValue = null) => ({
  select: async () => (selectedValue === null ? value : selectedValue),
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  catch: (reject) => Promise.resolve(value).catch(reject),
  finally: (handler) => Promise.resolve(value).finally(handler),
})

test('checkout.session.completed handles free cart checkout without payment_intent', async () => {
  const paymentCreates = []

  const booking1 = {
    _id: 'b1',
    locationId: 'loc_1',
    serviceId: 'svc_1',
    servicePrice: 100,
    finalPrice: 0,
    discountApplied: 100,
    paymentStatus: 'pending',
    paymentId: null,
    pointsEarned: 0,
    ghl: { calendarId: '' },
    async save() {
      return this
    },
  }

  const booking2 = {
    _id: 'b2',
    locationId: 'loc_1',
    serviceId: 'svc_2',
    servicePrice: 80,
    finalPrice: 0,
    discountApplied: 80,
    paymentStatus: 'pending',
    paymentId: null,
    pointsEarned: 0,
    ghl: { calendarId: '' },
    async save() {
      return this
    },
  }

  const session = {
    id: 'cs_free_1',
    payment_intent: null,
    amount_total: 0,
    currency: 'usd',
    livemode: false,
    metadata: {
      customerId: 'user_1',
      bookingIds: 'b1,b2',
      isCartCheckout: 'true',
    },
  }

  const { res, state } = createMockRes()

  await withPatched(
    [
      [stripe.webhooks, 'constructEvent', () => ({ type: 'checkout.session.completed', data: { object: session } })],
      [stripe.paymentIntents, 'retrieve', async () => {
        throw new Error('paymentIntents.retrieve should not be called for free checkout')
      }],
      [Booking, 'find', async () => [booking1, booking2]],
      [Service, 'findById', async (id) => ({ _id: id, name: `Service ${id}`, description: '', isDeleted: false })],
      [
        User,
        'findById',
        (id) =>
          asQueryLike(
            { _id: id, points: 0, async save() {} },
            { name: 'Test User', email: 'test@example.com' }
          ),
      ],
      [
        User,
        'findOne',
        () => ({
          sort: async () => ({ _id: 'spa_1', stripe: { accountId: 'acct_test_1' } }),
        }),
      ],
      [
        Payment,
        'create',
        async (payload) => {
          paymentCreates.push(payload)
          return { _id: `pay_${paymentCreates.length}`, pointsEarned: 0 }
        },
      ],
      [UserReward, 'findByIdAndUpdate', async () => null],
    ],
    async () => {
      await handleWebhook(
        {
          headers: { 'stripe-signature': 'sig' },
          body: Buffer.from('raw-body'),
        },
        res,
        () => {}
      )
    }
  )

  assert.equal(state.statusCode, 200)
  assert.deepEqual(state.jsonBody, { received: true })

  assert.equal(paymentCreates.length, 2)
  assert.equal(paymentCreates[0].stripePaymentIntentId, 'checkout_session_cs_free_1')
  assert.equal(paymentCreates[0].paymentMethod.type, 'free')
  assert.equal(paymentCreates[0].discount.type, 'fixed')

  assert.equal(booking1.paymentStatus, 'paid')
  assert.equal(booking2.paymentStatus, 'paid')
  assert.equal(Boolean(booking1.paymentId), true)
  assert.equal(Boolean(booking2.paymentId), true)
})

test('checkout.session.completed uses valid fixed discount type for discounted single booking', async () => {
  const paymentCreates = []

  const booking = {
    _id: 'b_single_1',
    locationId: 'loc_1',
    serviceId: 'svc_single_1',
    servicePrice: 120,
    finalPrice: 0,
    discountApplied: 40,
    paymentStatus: 'pending',
    paymentId: null,
    pointsUsed: 0,
    pointsEarned: 0,
    ghl: { calendarId: '' },
    async save() {
      return this
    },
  }

  const session = {
    id: 'cs_paid_1',
    payment_intent: 'pi_123',
    amount_total: 0,
    currency: 'usd',
    livemode: false,
    metadata: {
      customerId: 'user_1',
      bookingId: 'b_single_1',
      userRewardId: 'ur_1',
    },
  }

  const { res, state } = createMockRes()

  await withPatched(
    [
      [stripe.webhooks, 'constructEvent', () => ({ type: 'checkout.session.completed', data: { object: session } })],
      [
        stripe.paymentIntents,
        'retrieve',
        async () => ({
          metadata: { spaOwnerId: 'spa_1' },
          transfer_data: { destination: 'acct_test_1' },
          payment_method_types: ['card'],
          charges: { data: [{ payment_method_details: { card: { brand: 'visa', last4: '4242' } } }] },
          livemode: false,
        }),
      ],
      [Booking, 'findById', async () => booking],
      [Service, 'findById', async (id) => ({ _id: id, name: 'Basic Service', description: '', isDeleted: false })],
      [
        User,
        'findById',
        (id) =>
          asQueryLike(
            { _id: id, points: 10, async save() {} },
            { name: 'Test User', email: 'test@example.com' }
          ),
      ],
      [
        User,
        'findOne',
        async () => ({ _id: 'spa_1', stripe: { accountId: 'acct_test_1' } }),
      ],
      [
        Payment,
        'create',
        async (payload) => {
          paymentCreates.push(payload)
          return { _id: `pay_${paymentCreates.length}`, pointsEarned: 0 }
        },
      ],
      [UserReward, 'findByIdAndUpdate', async () => null],
    ],
    async () => {
      await handleWebhook(
        {
          headers: { 'stripe-signature': 'sig' },
          body: Buffer.from('raw-body'),
        },
        res,
        () => {}
      )
    }
  )

  assert.equal(state.statusCode, 200)
  assert.deepEqual(state.jsonBody, { received: true })

  assert.equal(paymentCreates.length, 1)
  assert.equal(paymentCreates[0].discount.type, 'fixed')
  assert.equal(paymentCreates[0].stripePaymentIntentId, 'pi_123')

  assert.equal(booking.paymentStatus, 'paid')
  assert.equal(Boolean(booking.paymentId), true)
})

test('checkout.session.completed is idempotent for already-paid single booking', async () => {
  let paymentCreateCount = 0

  const booking = {
    _id: 'b_paid',
    locationId: 'loc_1',
    serviceId: 'svc_1',
    servicePrice: 100,
    finalPrice: 100,
    discountApplied: 0,
    paymentStatus: 'paid',
    paymentId: 'pay_existing',
    pointsUsed: 0,
    pointsEarned: 0,
    ghl: { calendarId: '' },
    async save() {
      return this
    },
  }

  const session = {
    id: 'cs_paid_duplicate',
    payment_intent: 'pi_dup_1',
    amount_total: 10000,
    currency: 'usd',
    livemode: false,
    metadata: {
      customerId: 'user_1',
      bookingId: 'b_paid',
    },
  }

  const { res, state } = createMockRes()

  await withPatched(
    [
      [stripe.webhooks, 'constructEvent', () => ({ type: 'checkout.session.completed', data: { object: session } })],
      [stripe.paymentIntents, 'retrieve', async () => ({ metadata: {}, transfer_data: {}, payment_method_types: ['card'], charges: { data: [] }, livemode: false })],
      [Booking, 'findById', async () => booking],
      [
        Payment,
        'create',
        async () => {
          paymentCreateCount += 1
          return { _id: 'pay_new', pointsEarned: 0 }
        },
      ],
    ],
    async () => {
      await handleWebhook(
        {
          headers: { 'stripe-signature': 'sig' },
          body: Buffer.from('raw-body'),
        },
        res,
        () => {}
      )
    }
  )

  assert.equal(state.statusCode, 200)
  assert.deepEqual(state.jsonBody, { received: true })
  assert.equal(paymentCreateCount, 0)
})
