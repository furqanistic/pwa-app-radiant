import test from 'node:test'
import assert from 'node:assert/strict'

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy'
process.env.CLIENT_URL = process.env.CLIENT_URL || 'https://client.example.com'

const [
  { createCheckoutSession, handleWebhook },
  { default: stripe },
  { default: Booking },
  { default: Payment },
  { default: Service },
  { default: User },
  { default: UserReward },
  { default: Location },
] = await Promise.all([
  import('../controller/stripeController.js'),
  import('../config/stripe.js'),
  import('../models/Booking.js'),
  import('../models/Payment.js'),
  import('../models/Service.js'),
  import('../models/User.js'),
  import('../models/UserReward.js'),
  import('../models/Location.js'),
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

const makeServiceQuery = (service) => ({
  populate: async () => service,
})

const makeBookingFindNoConflicts = () => ({
  select: () => ({
    populate: async () => [],
  }),
})

test('createCheckoutSession creates single paid booking checkout session', async () => {
  const createdBookings = []
  const createdSessions = []

  const service = {
    _id: 'svc_paid_1',
    name: 'Paid Service',
    basePrice: 150,
    duration: 60,
    status: 'active',
    isDeleted: false,
    locationId: 'loc_1',
    images: [],
    discount: { active: false, percentage: 0 },
    ghlCalendar: {
      calendarId: '',
      name: '',
      timeZone: '',
      userId: '',
      teamId: '',
    },
  }

  const bookingDoc = {
    _id: 'book_single_1',
    stripeSessionId: null,
    async save() {
      return this
    },
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [Service, 'findById', () => makeServiceQuery(service)],
      [Booking, 'find', () => makeBookingFindNoConflicts()],
      [
        User,
        'findOne',
        () => ({
          sort: async () => ({
            _id: 'spa_1',
            stripe: { accountId: 'acct_test_1', chargesEnabled: true },
          }),
        }),
      ],
      [Booking, 'create', async (payload) => {
        createdBookings.push(payload)
        return bookingDoc
      }],
      [stripe.checkout.sessions, 'create', async (payload) => {
        createdSessions.push(payload)
        return {
          id: 'cs_single_paid_1',
          url: null,
          client_secret: 'cs_secret_single_1',
        }
      }],
    ],
    async () => {
      await createCheckoutSession(
        {
          user: { id: 'user_1', email: 'user@example.com' },
          body: {
            serviceId: 'svc_paid_1',
            date: '2026-04-05',
            time: '10:00 AM',
            duration: 60,
            locationId: 'loc_1',
            notes: 'Paid booking test',
            checkoutUiMode: 'embedded',
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
  assert.equal(state.statusCode, 201)
  assert.equal(state.jsonBody?.success, true)
  assert.equal(state.jsonBody?.sessionId, 'cs_single_paid_1')
  assert.equal(state.jsonBody?.bookingId, 'book_single_1')

  assert.equal(createdBookings.length, 1)
  assert.equal(createdBookings[0].finalPrice, 150)
  assert.equal(createdBookings[0].paymentStatus, 'pending')
  assert.equal(createdBookings[0].status, 'scheduled')

  assert.equal(createdSessions.length, 1)
  assert.equal(createdSessions[0].line_items[0].price_data.unit_amount, 15000)
  assert.equal(createdSessions[0].metadata.customerId, 'user_1')
  assert.equal(createdSessions[0].metadata.bookingId, 'book_single_1')
  assert.equal(createdSessions[0].ui_mode, 'embedded')
  assert.equal(createdSessions[0].mode, 'payment')
})

test('createCheckoutSession creates cart paid checkout session for multiple services', async () => {
  const createdBookings = []
  const createdSessions = []

  const serviceMap = {
    svc_cart_1: {
      _id: 'svc_cart_1',
      name: 'Paid Cart Service 1',
      basePrice: 100,
      duration: 60,
      status: 'active',
      isDeleted: false,
      locationId: 'loc_1',
      ghlCalendar: { calendarId: '', name: '', timeZone: '', userId: '', teamId: '' },
    },
    svc_cart_2: {
      _id: 'svc_cart_2',
      name: 'Paid Cart Service 2',
      basePrice: 80,
      duration: 45,
      status: 'active',
      isDeleted: false,
      locationId: 'loc_1',
      ghlCalendar: { calendarId: '', name: '', timeZone: '', userId: '', teamId: '' },
    },
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [
        Service,
        'findById',
        (id) => makeServiceQuery(serviceMap[id]),
      ],
      [Booking, 'find', () => makeBookingFindNoConflicts()],
      [
        User,
        'findOne',
        () => ({
          sort: async () => ({
            _id: 'spa_1',
            stripe: { accountId: 'acct_test_1', chargesEnabled: true },
          }),
        }),
      ],
      [
        User,
        'findById',
        async (id) => ({ _id: id, stripe: { accountId: 'acct_test_1' } }),
      ],
      [Booking, 'create', async (payload) => {
        const booking = {
          _id: `book_cart_${createdBookings.length + 1}`,
          ...payload,
          stripeSessionId: null,
          async save() {
            return this
          },
        }
        createdBookings.push(booking)
        return booking
      }],
      [stripe.checkout.sessions, 'create', async (payload) => {
        createdSessions.push(payload)
        return {
          id: 'cs_cart_paid_1',
          url: null,
          client_secret: 'cs_secret_cart_1',
        }
      }],
      [UserReward, 'findOne', async () => null],
    ],
    async () => {
      await createCheckoutSession(
        {
          user: { id: 'user_1', email: 'user@example.com' },
          body: {
            locationId: 'loc_1',
            checkoutUiMode: 'embedded',
            items: [
              {
                serviceId: 'svc_cart_1',
                serviceName: 'Paid Cart Service 1',
                date: '2026-04-05',
                time: '10:00 AM',
                duration: 60,
                price: 100,
                notes: 'item1',
              },
              {
                serviceId: 'svc_cart_2',
                serviceName: 'Paid Cart Service 2',
                date: '2026-04-05',
                time: '11:30 AM',
                duration: 45,
                price: 80,
                notes: 'item2',
              },
            ],
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
  assert.equal(state.statusCode, 201)
  assert.equal(state.jsonBody?.success, true)
  assert.equal(state.jsonBody?.sessionId, 'cs_cart_paid_1')
  assert.equal(Array.isArray(state.jsonBody?.bookingIds), true)
  assert.equal(state.jsonBody.bookingIds.length, 2)

  assert.equal(createdBookings.length, 2)
  assert.equal(createdBookings[0].finalPrice, 100)
  assert.equal(createdBookings[1].finalPrice, 80)
  assert.equal(createdBookings[0].paymentStatus, 'pending')
  assert.equal(createdBookings[1].paymentStatus, 'pending')
  assert.equal(createdBookings[0].stripeSessionId, 'cs_cart_paid_1')
  assert.equal(createdBookings[1].stripeSessionId, 'cs_cart_paid_1')

  assert.equal(createdSessions.length, 1)
  assert.equal(createdSessions[0].line_items.length, 2)
  assert.equal(createdSessions[0].line_items[0].price_data.unit_amount, 10000)
  assert.equal(createdSessions[0].line_items[1].price_data.unit_amount, 8000)
  assert.equal(createdSessions[0].metadata.isCartCheckout, 'true')
  assert.equal(createdSessions[0].mode, 'payment')
})

test('handleWebhook marks paid single booking for paid checkout session', async () => {
  const paymentCreates = []
  const customerDoc = {
    _id: 'user_1',
    points: 0,
    async save() {
      return this
    },
  }

  const booking = {
    _id: 'book_paid_single_1',
    locationId: 'loc_1',
    serviceId: 'svc_paid_1',
    servicePrice: 150,
    finalPrice: 150,
    discountApplied: 0,
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
    id: 'cs_paid_webhook_single_1',
    payment_intent: 'pi_paid_single_1',
    amount_total: 15000,
    currency: 'usd',
    livemode: false,
    metadata: {
      customerId: 'user_1',
      bookingId: 'book_paid_single_1',
    },
  }

  const { res, state } = createMockRes()

  await withPatched(
    [
      [
        stripe.webhooks,
        'constructEvent',
        () => ({ type: 'checkout.session.completed', data: { object: session } }),
      ],
      [
        stripe.paymentIntents,
        'retrieve',
        async () => ({
          metadata: { spaOwnerId: 'spa_1' },
          transfer_data: { destination: 'acct_test_1' },
          payment_method_types: ['card'],
          charges: {
            data: [
              { payment_method_details: { card: { brand: 'visa', last4: '4242' } } },
            ],
          },
          livemode: false,
        }),
      ],
      [Booking, 'findById', async () => booking],
      [Service, 'findById', async (id) => ({ _id: id, name: 'Paid Service', description: '', isDeleted: false })],
      [
        User,
        'findById',
        () =>
          asQueryLike(customerDoc, {
            name: 'Paid User',
            email: 'paid@example.com',
          }),
      ],
      [Location, 'findOne', async () => ({ locationId: 'loc_1', pointsSettings: { methods: [] } })],
      [
        Payment,
        'create',
        async (payload) => {
          paymentCreates.push(payload)
          return { _id: `pay_${paymentCreates.length}`, pointsEarned: payload.pointsEarned || 0 }
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
  assert.equal(paymentCreates[0].amount, 15000)
  assert.equal(paymentCreates[0].paymentMethod.type, 'card')

  assert.equal(booking.paymentStatus, 'paid')
  assert.equal(Boolean(booking.paymentId), true)
  assert.equal(customerDoc.points, 150)
})

test('handleWebhook marks all cart bookings paid for paid cart checkout session', async () => {
  const paymentCreates = []
  const customerDoc = {
    _id: 'user_1',
    points: 0,
    async save() {
      return this
    },
  }

  const booking1 = {
    _id: 'book_paid_cart_1',
    locationId: 'loc_1',
    serviceId: 'svc_cart_1',
    servicePrice: 100,
    finalPrice: 100,
    discountApplied: 0,
    paymentStatus: 'pending',
    paymentId: null,
    pointsEarned: 0,
    ghl: { calendarId: '' },
    async save() {
      return this
    },
  }

  const booking2 = {
    _id: 'book_paid_cart_2',
    locationId: 'loc_1',
    serviceId: 'svc_cart_2',
    servicePrice: 80,
    finalPrice: 80,
    discountApplied: 0,
    paymentStatus: 'pending',
    paymentId: null,
    pointsEarned: 0,
    ghl: { calendarId: '' },
    async save() {
      return this
    },
  }

  const session = {
    id: 'cs_paid_webhook_cart_1',
    payment_intent: 'pi_paid_cart_1',
    amount_total: 18000,
    currency: 'usd',
    livemode: false,
    metadata: {
      customerId: 'user_1',
      bookingIds: 'book_paid_cart_1,book_paid_cart_2',
      isCartCheckout: 'true',
    },
  }

  const { res, state } = createMockRes()

  await withPatched(
    [
      [
        stripe.webhooks,
        'constructEvent',
        () => ({ type: 'checkout.session.completed', data: { object: session } }),
      ],
      [
        stripe.paymentIntents,
        'retrieve',
        async () => ({
          metadata: { spaOwnerId: 'spa_1' },
          transfer_data: { destination: 'acct_test_1' },
          payment_method_types: ['card'],
          charges: {
            data: [
              { payment_method_details: { card: { brand: 'visa', last4: '4242' } } },
            ],
          },
          livemode: false,
        }),
      ],
      [Booking, 'find', async () => [booking1, booking2]],
      [Service, 'findById', async (id) => ({ _id: id, name: `Service ${id}`, description: '', isDeleted: false })],
      [
        User,
        'findById',
        () =>
          asQueryLike(customerDoc, {
            name: 'Paid User',
            email: 'paid@example.com',
          }),
      ],
      [Location, 'findOne', async () => ({ locationId: 'loc_1', pointsSettings: { methods: [] } })],
      [
        Payment,
        'create',
        async (payload) => {
          paymentCreates.push(payload)
          return { _id: `pay_${paymentCreates.length}`, pointsEarned: payload.pointsEarned || 0 }
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
  assert.equal(paymentCreates[0].amount, 10000)
  assert.equal(paymentCreates[1].amount, 8000)
  assert.equal(paymentCreates[0].paymentMethod.type, 'card')
  assert.equal(paymentCreates[1].paymentMethod.type, 'card')

  assert.equal(booking1.paymentStatus, 'paid')
  assert.equal(booking2.paymentStatus, 'paid')
  assert.equal(Boolean(booking1.paymentId), true)
  assert.equal(Boolean(booking2.paymentId), true)

  assert.equal(customerDoc.points, 180)
})
