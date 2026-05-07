import test from 'node:test'
import assert from 'node:assert/strict'

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy'
process.env.CLIENT_URL = process.env.CLIENT_URL || 'https://client.example.com'

const [
  {
    createCheckoutSession,
    createCreditsCheckoutSession,
    handleWebhook,
    purchaseCredits,
    createMembershipSubscription,
    changeMembershipSubscriptionPlan,
    removeMembershipPaymentMethod,
    cancelMembershipSubscription,
    getMembershipBillingSummary,
    processOverdueMembershipPaymentFailures,
  },
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

test('createCheckoutSession rejects paid booking when service has no GHL calendar', async () => {
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
          select() {
            return {
              sort: async () => null,
            }
          },
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

  assert.equal(nextErrors.length, 1)
  assert.equal(nextErrors[0].status, 400)
  assert.equal(nextErrors[0].message, 'No GoHighLevel calendar linked to this service')
  assert.equal(createdBookings.length, 0)
  assert.equal(createdSessions.length, 0)
})

test('createCheckoutSession rejects cart checkout when a service has no GHL calendar', async () => {
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
          select() {
            return {
              sort: async () => null,
            }
          },
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

  assert.equal(nextErrors.length, 1)
  assert.equal(nextErrors[0].status, 400)
  assert.equal(nextErrors[0].message, 'No GoHighLevel calendar linked to this service')
  assert.equal(createdBookings.length, 0)
  assert.equal(createdSessions.length, 0)
})

test('purchaseCredits charges saved default card and updates customer credits', async () => {
  const createdPayments = []
  const location = {
    locationId: 'loc_credit_1',
    name: 'CxR Spa',
    membership: {
      isActive: true,
      creditSystem: {
        isEnabled: true,
        pricePerCredit: 4,
      },
      plans: [
        {
          name: 'Glow',
          price: 99,
          currency: 'usd',
          benefits: ['Priority booking'],
        },
      ],
    },
  }
  const userDoc = {
    _id: 'user_credit_1',
    email: 'client@example.com',
    name: 'Client',
    credits: 12,
    membership: {
      currency: 'usd',
      locationId: 'loc_credit_1',
      status: 'inactive',
    },
    membershipBilling: {
      stripeCustomerId: 'cus_credit_1',
      stripeAccountId: 'acct_credit_1',
      locationId: 'loc_credit_1',
      defaultPaymentMethod: {},
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index]
        cursor[key] = cursor[key] || {}
        cursor = cursor[key]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [
        User,
        'findOne',
        () => ({
          sort: async () => ({
            _id: 'spa_credit_1',
            stripe: { accountId: 'acct_credit_1', chargesEnabled: true },
          }),
        }),
      ],
      [Location, 'findOne', () => asQueryLike(location)],
      [stripe.customers, 'retrieve', async () => ({ id: 'cus_credit_1', invoice_settings: { default_payment_method: 'pm_default_1' } })],
      [
        stripe.paymentMethods,
        'list',
        async () => ({
          data: [
            {
              id: 'pm_default_1',
              card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
            },
          ],
        }),
      ],
      [
        stripe.paymentIntents,
        'create',
        async (payload) => {
          assert.equal(payload.amount, 3200)
          assert.equal(payload.customer, 'cus_credit_1')
          assert.equal(payload.payment_method, 'pm_default_1')
          assert.deepEqual(payload.payment_method_types, ['card'])
          return {
            id: 'pi_credit_1',
            latest_charge: 'ch_credit_1',
            livemode: false,
          }
        },
      ],
      [
        stripe.paymentMethods,
        'retrieve',
        async () => ({
          id: 'pm_default_1',
          type: 'card',
          card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
        }),
      ],
      [
        Payment,
        'create',
        async (payload) => {
          createdPayments.push(payload)
          return { _id: 'payment_credit_1', ...payload }
        },
      ],
    ],
    async () => {
      await purchaseCredits(
        {
          user: { id: 'user_credit_1' },
          body: {
            locationId: 'loc_credit_1',
            quantity: 8,
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
  assert.equal(state.jsonBody?.creditsBalance, 20)
  assert.equal(createdPayments.length, 1)
  assert.equal(createdPayments[0].paymentCategory, 'credits')
  assert.equal(createdPayments[0].amount, 3200)
  assert.equal(createdPayments[0].creditDetails.quantity, 8)
  assert.equal(createdPayments[0].creditDetails.totalCreditsAfterPurchase, 20)
  assert.equal(userDoc.credits, 20)
})

test('createCreditsCheckoutSession creates hosted checkout when no saved card exists', async () => {
  const createdSessions = []
  const location = {
    locationId: 'loc_credit_checkout_1',
    name: 'CxR Spa',
    membership: {
      isActive: true,
      creditSystem: {
        isEnabled: true,
        pricePerCredit: 4,
      },
      plans: [{ name: 'Glow', price: 99, currency: 'usd' }],
    },
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [
        User,
        'findById',
        async () => ({
          _id: 'user_credit_checkout_1',
          email: 'credits@example.com',
        }),
      ],
      [
        User,
        'findOne',
        () => ({
          sort: async () => ({
            _id: 'spa_credit_checkout_1',
            stripe: { accountId: 'acct_credit_checkout_1', chargesEnabled: true },
          }),
        }),
      ],
      [Location, 'findOne', () => asQueryLike(location)],
      [
        stripe.checkout.sessions,
        'create',
        async (payload) => {
          createdSessions.push(payload)
          return {
            id: 'cs_credit_checkout_1',
            url: 'https://checkout.stripe.com/pay/cs_credit_checkout_1',
          }
        },
      ],
    ],
    async () => {
      await createCreditsCheckoutSession(
        {
          user: { id: 'user_credit_checkout_1' },
          body: {
            locationId: 'loc_credit_checkout_1',
            quantity: 8,
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
  assert.equal(state.jsonBody?.sessionId, 'cs_credit_checkout_1')
  assert.equal(
    state.jsonBody?.sessionUrl,
    'https://checkout.stripe.com/pay/cs_credit_checkout_1'
  )
  assert.equal(createdSessions.length, 1)
  assert.equal(createdSessions[0].line_items[0].price_data.unit_amount, 3200)
  assert.equal(createdSessions[0].metadata.customerId, 'user_credit_checkout_1')
  assert.equal(createdSessions[0].metadata.locationId, 'loc_credit_checkout_1')
  assert.equal(createdSessions[0].metadata.creditsQuantity, '8')
  assert.equal(createdSessions[0].metadata.isCreditsCheckout, 'true')
  assert.equal(createdSessions[0].mode, 'payment')
})

test('createMembershipSubscription uses monthly Stripe subscription billing', async () => {
  const subscriptionCreates = []
  const userDoc = {
    _id: 'user_membership_create_1',
    email: 'member@example.com',
    name: 'Member',
    credits: 0,
    membership: { status: 'inactive', currency: 'usd' },
    activeMembership: {},
    membershipBilling: {
      stripeCustomerId: 'cus_membership_create_1',
      stripeAccountId: 'acct_membership_create_1',
      locationId: 'loc_membership_create_1',
      defaultPaymentMethod: {},
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }
  const location = {
    locationId: 'loc_membership_create_1',
    membership: {
      isActive: true,
      plans: [
        {
          _id: 'plan_create_glow',
          name: 'Glow',
          price: 79,
          currency: 'usd',
          stripePriceId: 'price_create_glow',
          benefits: ['Priority booking'],
        },
      ],
    },
  }
  const service = {
    _id: 'svc_membership_create_1',
    name: 'Glow Membership',
    status: 'active',
    isDeleted: false,
    locationId: 'loc_membership_create_1',
    membershipPricing: [
      {
        membershipPlanName: 'Glow',
        membershipPlanId: 'plan_create_glow',
        isActive: true,
      },
    ],
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [
        User,
        'findOne',
        () => ({
          sort: async () => ({
            _id: 'spa_membership_create_1',
            stripe: { accountId: 'acct_membership_create_1', chargesEnabled: true },
          }),
        }),
      ],
      [Location, 'findOne', async () => location],
      [Service, 'findById', async () => service],
      [
        stripe.prices,
        'retrieve',
        async () => ({ id: 'price_create_glow', recurring: { interval: 'month' } }),
      ],
      [
        stripe.customers,
        'retrieve',
        async () => ({
          id: 'cus_membership_create_1',
          invoice_settings: { default_payment_method: 'pm_create_1' },
        }),
      ],
      [
        stripe.paymentMethods,
        'list',
        async () => ({
          data: [
            {
              id: 'pm_create_1',
              card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
            },
          ],
        }),
      ],
      [
        stripe.paymentMethods,
        'retrieve',
        async () => ({
          id: 'pm_create_1',
          card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
        }),
      ],
      [
        stripe.subscriptions,
        'create',
        async (payload, options) => {
          subscriptionCreates.push({ payload, options })
          return {
            id: 'sub_membership_create_1',
            status: 'active',
            current_period_start: 1778112000,
            current_period_end: 1780704000,
            cancel_at_period_end: false,
            default_payment_method: {
              id: 'pm_create_1',
              card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
            },
            items: {
              data: [
                {
                  id: 'si_membership_create_1',
                  price: { id: 'price_create_glow' },
                },
              ],
            },
          }
        },
      ],
    ],
    async () => {
      await createMembershipSubscription(
        {
          user: { id: 'user_membership_create_1' },
          body: {
            locationId: 'loc_membership_create_1',
            serviceId: 'svc_membership_create_1',
            planName: 'Glow',
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
  assert.equal(subscriptionCreates.length, 1)
  assert.equal(subscriptionCreates[0].payload.items[0].price, 'price_create_glow')
  assert.equal(subscriptionCreates[0].payload.collection_method, 'charge_automatically')
  assert.equal(subscriptionCreates[0].payload.payment_behavior, 'error_if_incomplete')
  assert.deepEqual(subscriptionCreates[0].options, {
    stripeAccount: 'acct_membership_create_1',
  })
})

test('changeMembershipSubscriptionPlan upgrades immediately with prorated billing and clears schedule', async () => {
  const releases = []
  const subscriptionUpdates = []
  const userDoc = {
    _id: 'user_upgrade_membership_1',
    membership: {
      isActive: true,
      status: 'active',
      planName: 'Basic',
      planId: 'plan_basic',
      price: 50,
      currency: 'usd',
      serviceId: 'svc_upgrade_membership_1',
      locationId: 'loc_upgrade_membership_1',
    },
    activeMembership: {},
    membershipBilling: {
      stripeCustomerId: 'cus_upgrade_membership_1',
      stripeAccountId: 'acct_upgrade_membership_1',
      locationId: 'loc_upgrade_membership_1',
      serviceId: 'svc_upgrade_membership_1',
      subscriptionId: 'sub_upgrade_membership_1',
      subscriptionItemId: 'si_upgrade_membership_1',
      subscriptionStatus: 'active',
      pendingPlan: {
        planId: 'plan_downgrade',
        planName: 'Downgrade',
        price: 25,
        currency: 'usd',
        effectiveAt: new Date('2026-06-07T00:00:00.000Z'),
      },
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }
  const location = {
    locationId: 'loc_upgrade_membership_1',
    membership: {
      isActive: true,
      plans: [
        {
          _id: 'plan_basic',
          name: 'Basic',
          price: 50,
          currency: 'usd',
          stripePriceId: 'price_basic',
          benefits: ['Basic'],
        },
        {
          _id: 'plan_premium',
          name: 'Premium',
          price: 100,
          currency: 'usd',
          stripePriceId: 'price_premium',
          benefits: ['Premium'],
        },
      ],
    },
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [
        User,
        'findOne',
        () => ({
          sort: async () => ({
            _id: 'spa_upgrade_membership_1',
            stripe: { accountId: 'acct_upgrade_membership_1', chargesEnabled: true },
          }),
        }),
      ],
      [Location, 'findOne', async () => location],
      [
        stripe.prices,
        'retrieve',
        async () => ({ id: 'price_premium', recurring: { interval: 'month' } }),
      ],
      [
        stripe.subscriptions,
        'retrieve',
        async () => ({
          id: 'sub_upgrade_membership_1',
          status: 'active',
          schedule: 'sched_upgrade_membership_1',
          cancel_at_period_end: true,
          current_period_start: 1778112000,
          current_period_end: 1780704000,
          items: {
            data: [
              {
                id: 'si_upgrade_membership_1',
                quantity: 1,
                price: { id: 'price_basic', unit_amount: 5000 },
              },
            ],
          },
        }),
      ],
      [
        stripe.subscriptionSchedules,
        'release',
        async (scheduleId, params, options) => {
          releases.push({ scheduleId, params, options })
          return { id: scheduleId, released_subscription: 'sub_upgrade_membership_1' }
        },
      ],
      [
        stripe.subscriptions,
        'update',
        async (subscriptionId, payload, options) => {
          subscriptionUpdates.push({ subscriptionId, payload, options })
          return {
            id: subscriptionId,
            status: 'active',
            cancel_at_period_end: false,
            current_period_start: 1778112000,
            current_period_end: 1780704000,
            latest_invoice: { status: 'paid' },
            items: {
              data: [
                {
                  id: 'si_upgrade_membership_1',
                  price: { id: 'price_premium' },
                },
              ],
            },
          }
        },
      ],
    ],
    async () => {
      await changeMembershipSubscriptionPlan(
        {
          user: { id: 'user_upgrade_membership_1' },
          body: {
            locationId: 'loc_upgrade_membership_1',
            planName: 'Premium',
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
  assert.equal(state.jsonBody?.success, true)
  assert.equal(state.jsonBody?.changeType, 'upgrade')
  assert.equal(releases.length, 1)
  assert.equal(releases[0].scheduleId, 'sched_upgrade_membership_1')
  assert.equal(subscriptionUpdates.length, 1)
  assert.equal(subscriptionUpdates[0].payload.items[0].price, 'price_premium')
  assert.equal(subscriptionUpdates[0].payload.proration_behavior, 'always_invoice')
  assert.equal(subscriptionUpdates[0].payload.payment_behavior, 'allow_incomplete')
  assert.equal(subscriptionUpdates[0].payload.cancel_at_period_end, false)
  assert.equal(userDoc.membership.planName, 'Premium')
  assert.equal(userDoc.membershipBilling.pendingPlan.planId, null)
})

test('changeMembershipSubscriptionPlan schedules downgrade at period end', async () => {
  const scheduleUpdates = []
  const periodStart = 1778112000
  const periodEnd = 1780704000
  const userDoc = {
    _id: 'user_downgrade_membership_1',
    membership: {
      isActive: true,
      status: 'active',
      planName: 'Premium',
      planId: 'plan_premium',
      price: 100,
      currency: 'usd',
      serviceId: 'svc_downgrade_membership_1',
      locationId: 'loc_downgrade_membership_1',
    },
    activeMembership: {},
    membershipBilling: {
      stripeCustomerId: 'cus_downgrade_membership_1',
      stripeAccountId: 'acct_downgrade_membership_1',
      locationId: 'loc_downgrade_membership_1',
      serviceId: 'svc_downgrade_membership_1',
      subscriptionId: 'sub_downgrade_membership_1',
      subscriptionItemId: 'si_downgrade_membership_1',
      subscriptionStatus: 'active',
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }
  const location = {
    locationId: 'loc_downgrade_membership_1',
    membership: {
      isActive: true,
      plans: [
        {
          _id: 'plan_basic',
          name: 'Basic',
          price: 50,
          currency: 'usd',
          stripePriceId: 'price_basic',
          benefits: ['Basic'],
        },
        {
          _id: 'plan_premium',
          name: 'Premium',
          price: 100,
          currency: 'usd',
          stripePriceId: 'price_premium',
          benefits: ['Premium'],
        },
      ],
    },
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [
        User,
        'findOne',
        () => ({
          sort: async () => ({
            _id: 'spa_downgrade_membership_1',
            stripe: { accountId: 'acct_downgrade_membership_1', chargesEnabled: true },
          }),
        }),
      ],
      [Location, 'findOne', async () => location],
      [
        stripe.prices,
        'retrieve',
        async () => ({ id: 'price_basic', recurring: { interval: 'month' } }),
      ],
      [
        stripe.subscriptions,
        'retrieve',
        async () => ({
          id: 'sub_downgrade_membership_1',
          status: 'active',
          current_period_start: periodStart,
          current_period_end: periodEnd,
          items: {
            data: [
              {
                id: 'si_downgrade_membership_1',
                quantity: 1,
                price: { id: 'price_premium', unit_amount: 10000 },
              },
            ],
          },
        }),
      ],
      [
        stripe.subscriptionSchedules,
        'create',
        async (payload, options) => ({
          id: 'sched_downgrade_membership_1',
          payload,
          options,
        }),
      ],
      [
        stripe.subscriptionSchedules,
        'retrieve',
        async () => ({
          id: 'sched_downgrade_membership_1',
          current_phase: { start_date: periodStart, end_date: periodEnd },
        }),
      ],
      [
        stripe.subscriptionSchedules,
        'update',
        async (scheduleId, payload, options) => {
          scheduleUpdates.push({ scheduleId, payload, options })
          return { id: scheduleId, ...payload }
        },
      ],
    ],
    async () => {
      await changeMembershipSubscriptionPlan(
        {
          user: { id: 'user_downgrade_membership_1' },
          body: {
            locationId: 'loc_downgrade_membership_1',
            planName: 'Basic',
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
  assert.equal(state.jsonBody?.changeType, 'downgrade')
  assert.equal(scheduleUpdates.length, 1)
  assert.equal(scheduleUpdates[0].payload.phases.length, 2)
  assert.equal(scheduleUpdates[0].payload.phases[0].end_date, periodEnd)
  assert.equal(scheduleUpdates[0].payload.phases[1].start_date, periodEnd)
  assert.equal(scheduleUpdates[0].payload.phases[1].items[0].price, 'price_basic')
  assert.equal(userDoc.membership.planName, 'Premium')
  assert.equal(userDoc.membershipBilling.pendingPlan.planName, 'Basic')
})

test('removeMembershipPaymentMethod detaches card on connected Stripe account', async () => {
  const detachCalls = []
  let listCallCount = 0
  const userDoc = {
    _id: 'user_remove_card_1',
    membershipBilling: {
      stripeCustomerId: 'cus_remove_card_1',
      stripeAccountId: 'acct_remove_card_1',
      locationId: 'loc_remove_card_1',
      defaultPaymentMethod: {
        paymentMethodId: 'pm_default_1',
        brand: 'visa',
        last4: '4242',
      },
    },
    async save() {
      return this
    },
  }

  const paymentMethods = [
    {
      id: 'pm_default_1',
      card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
    },
    {
      id: 'pm_remove_1',
      card: { brand: 'mastercard', last4: '5555', exp_month: 2, exp_year: 2031 },
    },
  ]

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [
        stripe.customers,
        'retrieve',
        async () => ({
          id: 'cus_remove_card_1',
          invoice_settings: { default_payment_method: 'pm_default_1' },
        }),
      ],
      [
        stripe.paymentMethods,
        'list',
        async () => {
          listCallCount += 1
          return {
            data:
              listCallCount === 1
                ? paymentMethods
                : paymentMethods.filter((method) => method.id !== 'pm_remove_1'),
          }
        },
      ],
      [
        stripe.paymentMethods,
        'detach',
        async (paymentMethodId, params, options) => {
          detachCalls.push({ paymentMethodId, params, options })
          return { id: paymentMethodId }
        },
      ],
    ],
    async () => {
      await removeMembershipPaymentMethod(
        {
          user: { id: 'user_remove_card_1' },
          body: {
            locationId: 'loc_remove_card_1',
            paymentMethodId: 'pm_remove_1',
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
  assert.equal(state.jsonBody?.success, true)
  assert.equal(detachCalls.length, 1)
  assert.equal(detachCalls[0].paymentMethodId, 'pm_remove_1')
  assert.deepEqual(detachCalls[0].params, {})
  assert.deepEqual(detachCalls[0].options, { stripeAccount: 'acct_remove_card_1' })
})

test('removeMembershipPaymentMethod allows only card after membership cancellation is scheduled', async () => {
  const detachCalls = []
  const userDoc = {
    _id: 'user_remove_cancelled_card_1',
    membershipBilling: {
      stripeCustomerId: 'cus_cancelled_card_1',
      stripeAccountId: 'acct_cancelled_card_1',
      locationId: 'loc_cancelled_card_1',
      subscriptionId: 'sub_cancelled_card_1',
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: true,
      defaultPaymentMethod: {
        paymentMethodId: 'pm_cancelled_card_1',
        brand: 'visa',
        last4: '4242',
      },
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [
        stripe.customers,
        'retrieve',
        async () => ({
          id: 'cus_cancelled_card_1',
          invoice_settings: { default_payment_method: 'pm_cancelled_card_1' },
        }),
      ],
      [
        stripe.customers,
        'update',
        async () => ({ id: 'cus_cancelled_card_1' }),
      ],
      [
        stripe.subscriptions,
        'update',
        async () => ({ id: 'sub_cancelled_card_1' }),
      ],
      [
        stripe.paymentMethods,
        'list',
        async ({ customer }) => ({
          data:
            customer === 'cus_cancelled_card_1'
              ? [
                  {
                    id: 'pm_cancelled_card_1',
                    card: {
                      brand: 'visa',
                      last4: '4242',
                      exp_month: 1,
                      exp_year: 2030,
                    },
                  },
                ]
              : [],
        }),
      ],
      [
        stripe.paymentMethods,
        'detach',
        async (paymentMethodId, params, options) => {
          detachCalls.push({ paymentMethodId, params, options })
          return { id: paymentMethodId }
        },
      ],
    ],
    async () => {
      await removeMembershipPaymentMethod(
        {
          user: { id: 'user_remove_cancelled_card_1' },
          body: {
            locationId: 'loc_cancelled_card_1',
            paymentMethodId: 'pm_cancelled_card_1',
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
  assert.equal(state.jsonBody?.success, true)
  assert.equal(detachCalls.length, 1)
  assert.deepEqual(detachCalls[0].options, { stripeAccount: 'acct_cancelled_card_1' })
})

test('cancelMembershipSubscription schedules cancellation at period end', async () => {
  const subscriptionUpdates = []
  const periodStart = Math.floor(Date.now() / 1000) - 86400
  const periodEnd = Math.floor(Date.now() / 1000) + 86400 * 14
  const userDoc = {
    _id: 'user_cancel_membership_1',
    membership: {
      status: 'active',
      planName: 'Glow',
      planId: 'plan_glow',
      price: 99,
      currency: 'usd',
    },
    membershipBilling: {
      stripeCustomerId: 'cus_cancel_membership_1',
      stripeAccountId: 'acct_cancel_membership_1',
      locationId: 'loc_cancel_membership_1',
      serviceId: 'svc_membership_1',
      subscriptionId: 'sub_cancel_membership_1',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: false,
      defaultPaymentMethod: {
        paymentMethodId: 'pm_cancel_membership_1',
        brand: 'visa',
        last4: '4242',
      },
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }

  const buildSubscription = (cancelAtPeriodEnd = false) => ({
    id: 'sub_cancel_membership_1',
    status: 'active',
    cancel_at_period_end: cancelAtPeriodEnd,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    default_payment_method: {
      id: 'pm_cancel_membership_1',
      card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
    },
    items: { data: [{ id: 'si_cancel_membership_1' }] },
  })

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [
        stripe.subscriptions,
        'retrieve',
        async () =>
          subscriptionUpdates.length > 0
            ? buildSubscription(true)
            : buildSubscription(false),
      ],
      [
        stripe.subscriptions,
        'update',
        async (subscriptionId, payload, options) => {
          subscriptionUpdates.push({ subscriptionId, payload, options })
          return buildSubscription(Boolean(payload.cancel_at_period_end))
        },
      ],
    ],
    async () => {
      await cancelMembershipSubscription(
        {
          user: { id: 'user_cancel_membership_1' },
          body: { locationId: 'loc_cancel_membership_1' },
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
  assert.equal(state.jsonBody?.success, true)
  assert.equal(state.jsonBody?.cancelAtPeriodEnd, true)
  assert.equal(subscriptionUpdates.length, 1)
  assert.equal(subscriptionUpdates[0].subscriptionId, 'sub_cancel_membership_1')
  assert.deepEqual(subscriptionUpdates[0].payload, { cancel_at_period_end: true })
  assert.deepEqual(subscriptionUpdates[0].options, { stripeAccount: 'acct_cancel_membership_1' })
  assert.equal(userDoc.membershipBilling.cancelAtPeriodEnd, true)
})

test('cancelMembershipSubscription updates subscription schedule when present', async () => {
  const scheduleUpdates = []
  const periodStart = Math.floor(Date.now() / 1000) - 86400
  const periodEnd = Math.floor(Date.now() / 1000) + 86400 * 14
  const userDoc = {
    _id: 'user_cancel_scheduled_membership_1',
    membership: {
      status: 'active',
      planName: 'Glow',
      planId: 'plan_glow',
      price: 99,
      currency: 'usd',
    },
    membershipBilling: {
      stripeCustomerId: 'cus_cancel_scheduled_membership_1',
      stripeAccountId: 'acct_cancel_scheduled_membership_1',
      locationId: 'loc_cancel_scheduled_membership_1',
      serviceId: 'svc_membership_1',
      subscriptionId: 'sub_cancel_scheduled_membership_1',
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
      defaultPaymentMethod: {
        paymentMethodId: 'pm_cancel_scheduled_membership_1',
        brand: 'visa',
        last4: '4242',
      },
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }

  const buildSubscription = () => ({
    id: 'sub_cancel_scheduled_membership_1',
    status: 'active',
    cancel_at_period_end: false,
    schedule: 'sub_sched_cancel_1',
    current_period_start: periodStart,
    current_period_end: periodEnd,
    default_payment_method: {
      id: 'pm_cancel_scheduled_membership_1',
      card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
    },
    items: {
      data: [
        {
          id: 'si_cancel_scheduled_membership_1',
          quantity: 1,
          price: { id: 'price_cancel_scheduled_membership_1' },
        },
      ],
    },
  })

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [stripe.subscriptions, 'retrieve', async () => buildSubscription()],
      [
        stripe.subscriptionSchedules,
        'retrieve',
        async () => ({
          id: 'sub_sched_cancel_1',
          current_phase: { start_date: periodStart, end_date: periodEnd },
        }),
      ],
      [
        stripe.subscriptionSchedules,
        'update',
        async (scheduleId, payload, options) => {
          scheduleUpdates.push({ scheduleId, payload, options })
          return { id: scheduleId, ...payload }
        },
      ],
    ],
    async () => {
      await cancelMembershipSubscription(
        {
          user: { id: 'user_cancel_scheduled_membership_1' },
          body: { locationId: 'loc_cancel_scheduled_membership_1' },
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
  assert.equal(state.jsonBody?.success, true)
  assert.equal(scheduleUpdates.length, 1)
  assert.equal(scheduleUpdates[0].scheduleId, 'sub_sched_cancel_1')
  assert.equal(scheduleUpdates[0].payload.end_behavior, 'cancel')
  assert.equal(scheduleUpdates[0].payload.phases.length, 1)
  assert.equal(scheduleUpdates[0].payload.phases[0].end_date, periodEnd)
  assert.equal(
    scheduleUpdates[0].payload.phases[0].items[0].price,
    'price_cancel_scheduled_membership_1'
  )
  assert.deepEqual(scheduleUpdates[0].options, {
    stripeAccount: 'acct_cancel_scheduled_membership_1',
  })
  assert.equal(userDoc.membershipBilling.cancelAtPeriodEnd, true)
})

test('getMembershipBillingSummary refreshes stale membership period from Stripe', async () => {
  const staleEnd = new Date('2026-05-02T00:00:00.000Z')
  const freshPeriodStart = Math.floor(Date.parse('2026-05-07T00:00:00.000Z') / 1000)
  const freshPeriodEnd = Math.floor(Date.parse('2026-06-07T00:00:00.000Z') / 1000)
  const userDoc = {
    _id: 'user_summary_refresh_1',
    credits: 0,
    membership: {
      isActive: true,
      status: 'active',
      planName: 'Most Wanted Membership',
      planId: 'plan_most_wanted',
      price: 35,
      currency: 'usd',
      expiresAt: staleEnd,
    },
    activeMembership: {},
    membershipBilling: {
      stripeCustomerId: 'cus_summary_refresh_1',
      stripeAccountId: 'acct_summary_refresh_1',
      locationId: 'loc_summary_refresh_1',
      serviceId: 'svc_summary_refresh_1',
      subscriptionId: 'sub_summary_refresh_1',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-04-02T00:00:00.000Z'),
      currentPeriodEnd: staleEnd,
      cancelAtPeriodEnd: false,
      defaultPaymentMethod: {
        paymentMethodId: 'pm_summary_refresh_1',
        brand: 'visa',
        last4: '4242',
      },
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }

  const { res, state } = createMockRes()
  const nextErrors = []

  await withPatched(
    [
      [User, 'findById', async () => userDoc],
      [
        Location,
        'findOne',
        () => ({
          select: async () => ({
            locationId: 'loc_summary_refresh_1',
            membership: {
              currency: 'usd',
              creditSystem: { isEnabled: false, pricePerCredit: 0 },
              plans: [{ name: 'Most Wanted Membership', price: 35, currency: 'usd' }],
            },
          }),
        }),
      ],
      [
        stripe.subscriptions,
        'retrieve',
        async () => ({
          id: 'sub_summary_refresh_1',
          status: 'active',
          cancel_at_period_end: false,
          current_period_start: freshPeriodStart,
          items: {
            data: [
              {
                id: 'si_summary_refresh_1',
                current_period_end: freshPeriodEnd,
              },
            ],
          },
          default_payment_method: {
            id: 'pm_summary_refresh_1',
            card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
          },
        }),
      ],
      [
        stripe.customers,
        'retrieve',
        async () => ({
          id: 'cus_summary_refresh_1',
          invoice_settings: { default_payment_method: 'pm_summary_refresh_1' },
        }),
      ],
      [
        stripe.paymentMethods,
        'list',
        async () => ({
          data: [
            {
              id: 'pm_summary_refresh_1',
              card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
            },
          ],
        }),
      ],
    ],
    async () => {
      await getMembershipBillingSummary(
        {
          user: { id: 'user_summary_refresh_1' },
          query: { locationId: 'loc_summary_refresh_1' },
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
  assert.equal(state.jsonBody?.success, true)
  assert.equal(
    new Date(state.jsonBody.summary.subscription.currentPeriodEnd).toISOString(),
    '2026-06-07T00:00:00.000Z'
  )
  assert.equal(
    new Date(userDoc.membershipBilling.currentPeriodEnd).toISOString(),
    '2026-06-07T00:00:00.000Z'
  )
})

test('invoice.payment_failed puts membership into grace period before downgrade', async () => {
  const createdAt = Math.floor(Date.parse('2026-05-07T00:00:00.000Z') / 1000)
  const userDoc = {
    _id: 'user_failed_membership_1',
    points: 0,
    membership: {
      isActive: true,
      status: 'active',
      planName: 'Glow',
      planId: 'plan_glow_failed',
      price: 79,
      currency: 'usd',
      serviceId: 'svc_failed_membership_1',
      locationId: 'loc_failed_membership_1',
    },
    activeMembership: {},
    membershipBilling: {
      stripeCustomerId: 'cus_failed_membership_1',
      stripeAccountId: 'acct_failed_membership_1',
      locationId: 'loc_failed_membership_1',
      serviceId: 'svc_failed_membership_1',
      subscriptionId: 'sub_failed_membership_1',
      subscriptionItemId: 'si_failed_membership_1',
      subscriptionStatus: 'active',
      defaultPaymentMethod: {
        paymentMethodId: 'pm_failed_membership_1',
        brand: 'visa',
        last4: '4242',
      },
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }
  const invoice = {
    id: 'in_failed_membership_1',
    customer: 'cus_failed_membership_1',
    subscription: 'sub_failed_membership_1',
    amount_due: 7900,
    amount_paid: 0,
    currency: 'usd',
    livemode: false,
    status: 'open',
    attempt_count: 1,
    created: createdAt,
    hosted_invoice_url: 'https://invoice.example/in_failed_membership_1',
    billing_reason: 'subscription_cycle',
  }

  const { res, state } = createMockRes()

  await withPatched(
    [
      [
        stripe.webhooks,
        'constructEvent',
        () => ({
          type: 'invoice.payment_failed',
          account: 'acct_failed_membership_1',
          data: { object: invoice },
        }),
      ],
      [
        User,
        'findOne',
        async (query) => {
          if (query?.['membershipBilling.subscriptionId']) return userDoc
          if (query?.['stripe.accountId']) {
            return {
              _id: 'spa_failed_membership_1',
              stripe: { accountId: 'acct_failed_membership_1' },
            }
          }
          return null
        },
      ],
      [
        Location,
        'findOne',
        async () => ({
          locationId: 'loc_failed_membership_1',
          membership: {
            isActive: true,
            plans: [
              {
                _id: 'plan_glow_failed',
                name: 'Glow',
                price: 79,
                currency: 'usd',
                stripePriceId: 'price_glow_failed',
                benefits: ['Glow'],
              },
            ],
          },
        }),
      ],
      [
        Service,
        'findById',
        async () => ({
          _id: 'svc_failed_membership_1',
          name: 'Glow Membership',
          status: 'active',
          isDeleted: false,
          locationId: 'loc_failed_membership_1',
        }),
      ],
      [
        stripe.subscriptions,
        'retrieve',
        async () => ({
          id: 'sub_failed_membership_1',
          status: 'past_due',
          current_period_start: createdAt - 2592000,
          current_period_end: createdAt,
          default_payment_method: {
            id: 'pm_failed_membership_1',
            card: { brand: 'visa', last4: '4242', exp_month: 1, exp_year: 2030 },
          },
          items: {
            data: [
              {
                id: 'si_failed_membership_1',
                price: { id: 'price_glow_failed' },
              },
            ],
          },
        }),
      ],
      [Payment, 'findOne', () => ({ select: () => ({ lean: async () => null }) })],
      [Payment, 'findOneAndUpdate', async () => ({ _id: 'pay_failed_membership_1' })],
    ],
    async () => {
      await handleWebhook(
        { headers: { 'stripe-signature': 'sig_test' }, body: Buffer.from('{}') },
        res,
        () => {}
      )
    }
  )

  assert.equal(state.statusCode, 200)
  assert.equal(state.jsonBody?.received, true)
  assert.equal(userDoc.membership.status, 'past_due')
  assert.equal(userDoc.membershipBilling.subscriptionStatus, 'past_due')
  assert.equal(
    new Date(userDoc.membershipBilling.gracePeriodEndsAt).toISOString(),
    '2026-05-14T00:00:00.000Z'
  )
  assert.equal(userDoc.membershipBilling.subscriptionId, 'sub_failed_membership_1')
})

test('processOverdueMembershipPaymentFailures downgrades expired unpaid memberships', async () => {
  const cancelCalls = []
  const now = new Date('2026-05-15T00:00:00.000Z')
  const userDoc = {
    _id: 'user_overdue_membership_1',
    membership: {
      isActive: false,
      status: 'past_due',
      planName: 'Glow',
      planId: 'plan_overdue_glow',
      price: 79,
      currency: 'usd',
      serviceId: 'svc_overdue_membership_1',
      locationId: 'loc_overdue_membership_1',
    },
    activeMembership: {
      isActive: false,
      status: 'past_due',
      planName: 'Glow',
      planId: 'plan_overdue_glow',
      locationId: 'loc_overdue_membership_1',
    },
    membershipBilling: {
      stripeCustomerId: 'cus_overdue_membership_1',
      stripeAccountId: 'acct_overdue_membership_1',
      locationId: 'loc_overdue_membership_1',
      serviceId: 'svc_overdue_membership_1',
      subscriptionId: 'sub_overdue_membership_1',
      subscriptionItemId: 'si_overdue_membership_1',
      subscriptionStatus: 'past_due',
      gracePeriodEndsAt: new Date('2026-05-14T00:00:00.000Z'),
      pendingPlan: {
        planId: 'plan_next',
        planName: 'Next',
        price: 50,
        currency: 'usd',
        effectiveAt: new Date('2026-06-07T00:00:00.000Z'),
      },
    },
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        cursor[keys[index]] = cursor[keys[index]] || {}
        cursor = cursor[keys[index]]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }

  await withPatched(
    [
      [
        User,
        'find',
        () => ({
          limit: async () => [userDoc],
        }),
      ],
      [
        stripe.subscriptions,
        'retrieve',
        async () => ({
          id: 'sub_overdue_membership_1',
          status: 'past_due',
          items: { data: [{ id: 'si_overdue_membership_1' }] },
        }),
      ],
      [
        stripe.subscriptions,
        'cancel',
        async (subscriptionId, payload, options) => {
          cancelCalls.push({ subscriptionId, payload, options })
          return { id: subscriptionId, status: 'canceled' }
        },
      ],
    ],
    async () => {
      const result = await processOverdueMembershipPaymentFailures({ now })
      assert.deepEqual(result, { checked: 1, downgraded: 1, failed: 0 })
    }
  )

  assert.equal(cancelCalls.length, 1)
  assert.equal(cancelCalls[0].subscriptionId, 'sub_overdue_membership_1')
  assert.equal(userDoc.membership.status, 'inactive')
  assert.equal(userDoc.membership.isActive, false)
  assert.equal(userDoc.membership.planName, null)
  assert.equal(userDoc.membershipBilling.subscriptionStatus, 'inactive')
  assert.equal(userDoc.membershipBilling.subscriptionId, null)
  assert.equal(userDoc.membershipBilling.pendingPlan.planId, null)
})

test('handleWebhook applies hosted credits checkout and updates customer credits', async () => {
  const createdPayments = []
  const customerDoc = {
    _id: 'user_credit_webhook_1',
    credits: 12,
    membershipBilling: {},
    set(path, value) {
      const keys = path.split('.')
      let cursor = this
      for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index]
        cursor[key] = cursor[key] || {}
        cursor = cursor[key]
      }
      cursor[keys[keys.length - 1]] = value
    },
    async save() {
      return this
    },
  }
  const session = {
    id: 'cs_credit_complete_1',
    payment_intent: 'pi_credit_complete_1',
    amount_total: 3200,
    currency: 'usd',
    livemode: false,
    metadata: {
      customerId: 'user_credit_webhook_1',
      spaOwnerId: 'spa_credit_webhook_1',
      locationId: 'loc_credit_webhook_1',
      creditsQuantity: '8',
      pricePerCredit: '4',
      isCreditsCheckout: 'true',
      type: 'credits_purchase',
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
          id: 'pi_credit_complete_1',
          metadata: { spaOwnerId: 'spa_credit_webhook_1' },
          transfer_data: { destination: 'acct_credit_webhook_1' },
          payment_method_types: ['card'],
          charges: {
            data: [
              {
                id: 'ch_credit_complete_1',
                payment_method_details: { card: { brand: 'visa', last4: '4242' } },
              },
            ],
          },
          livemode: false,
        }),
      ],
      [Payment, 'findOne', async () => null],
      [User, 'findById', async () => customerDoc],
      [
        Payment,
        'create',
        async (payload) => {
          createdPayments.push(payload)
          return { _id: 'payment_credit_complete_1', ...payload }
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
  assert.equal(customerDoc.credits, 20)
  assert.equal(customerDoc.membershipBilling.locationId, 'loc_credit_webhook_1')
  assert.equal(customerDoc.membershipBilling.stripeAccountId, 'acct_credit_webhook_1')
  assert.equal(createdPayments.length, 1)
  assert.equal(createdPayments[0].paymentCategory, 'credits')
  assert.equal(createdPayments[0].amount, 3200)
  assert.equal(createdPayments[0].creditDetails.quantity, 8)
  assert.equal(createdPayments[0].creditDetails.totalCreditsAfterPurchase, 20)
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

  assert.equal(booking.paymentStatus, 'refunded')
  assert.equal(booking.status, 'cancelled')
  assert.equal(Boolean(booking.paymentId), true)
  assert.equal(customerDoc.points, 0)
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

  assert.equal(booking1.paymentStatus, 'refunded')
  assert.equal(booking2.paymentStatus, 'refunded')
  assert.equal(booking1.status, 'cancelled')
  assert.equal(booking2.status, 'cancelled')
  assert.equal(Boolean(booking1.paymentId), true)
  assert.equal(Boolean(booking2.paymentId), true)

  assert.equal(customerDoc.points, 0)
})
