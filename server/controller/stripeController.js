// File: server/controller/stripeController.js - Stripe Connect & Payment Controller
import stripe from '../config/stripe.js'
import { createError } from '../error.js'
import Booking from '../models/Booking.js'
import Payment from '../models/Payment.js'
import Service from '../models/Service.js'
import User from '../models/User.js'

// ==================== STRIPE CONNECT FUNCTIONS ====================

/**
 * Create a Stripe Connect account for a team user (spa owner)
 */
export const createConnectAccount = async (req, res, next) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Only team role can connect Stripe accounts
    if (user.role !== 'team') {
      return next(
        createError(
          403,
          'Only spa owners (team role) can connect Stripe accounts'
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

/**
 * Create a Stripe Checkout session for service booking (with redirect)
 * Handles both single service and multiple services (cart checkout)
 */
export const createCheckoutSession = async (req, res, next) => {
  try {
    const customerId = req.user.id
    const { items, locationId: cartLocationId } = req.body
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
      let totalPlatformFee = 0
      let spaOwnerId = null

      // Process each cart item
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

        // Find the spa owner for this location
        const spaOwner = await User.findOne({ 
          'spaLocation.locationId': item.locationId || cartLocationId,
          role: 'team' 
        })

        if (!spaOwner) {
          return next(
            createError(
              400,
              `Could not find a valid spa owner for location ${item.locationId || cartLocationId}`
            )
          )
        }

        if (!spaOwner.stripe?.accountId || !spaOwner.stripe?.chargesEnabled) {
          return next(
            createError(
              400,
              `${item.serviceName}'s spa has not connected payment account`
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

        const amount = Math.round(item.price * 100) // Convert to cents
        const platformFee = Math.round(item.price * 0.1 * 100)

        totalAmount += amount
        totalPlatformFee += platformFee

        // Create temporary booking
        const booking = await Booking.create({
          userId: customerId,
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          servicePrice: item.price,
          finalPrice: item.price,
          discountApplied: 0,
          date: new Date(item.date),
          time: item.time,
          duration: item.duration,
          locationId: item.locationId || cartLocationId,
          notes: item.notes || '',
          status: 'scheduled',
          paymentStatus: 'pending',
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
              ).toLocaleDateString()} at ${item.time}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        })
      }

      // Get spa owner for payment
      const spaOwner = await User.findById(spaOwnerId)

      // Create Stripe Checkout Session
      const successUrl = `${process.env.CLIENT_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${process.env.CLIENT_URL}/cart`

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: req.user.email,
        payment_intent_data: {
          application_fee_amount: totalPlatformFee,
          transfer_data: {
            destination: spaOwner.stripe.accountId,
          },
          metadata: {
            customerId: customerId.toString(),
            spaOwnerId: spaOwner._id.toString(),
            bookingIds: bookings.map((b) => b._id.toString()).join(','),
            isCartCheckout: 'true',
          },
        },
        metadata: {
          customerId: customerId.toString(),
          bookingIds: bookings.map((b) => b._id.toString()).join(','),
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

    // Get spa owner (owner of the location)
    const spaOwner = await User.findOne({
      'spaLocation.locationId': locationId,
      role: 'team'
    })

    if (!spaOwner) {
      return next(createError(400, 'Service owner is not a valid spa account for this location'))
    }

    // Check if spa owner has Stripe connected
    if (!spaOwner.stripe?.accountId || !spaOwner.stripe?.chargesEnabled) {
      return next(
        createError(400, 'This spa has not connected their payment account yet')
      )
    }

    // Calculate pricing
    let subtotal = service.basePrice
    let discountAmount = 0

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

    // Calculate final amount
    const finalPrice = Math.max(subtotal - discountAmount, 0)
    const amount = Math.round(finalPrice * 100) // Convert to cents
    const platformFee = Math.round(finalPrice * 0.1 * 100) // 10% platform fee

    // Create temporary booking record
    const booking = await Booking.create({
      userId: customerId,
      serviceId,
      serviceName: service.name,
      servicePrice: subtotal,
      finalPrice,
      discountApplied: discountAmount,
      rewardUsed: rewardUsed || null,
      pointsUsed: pointsUsed || 0,
      date: new Date(date),
      time,
      duration: duration || service.duration,
      locationId,
      notes: notes || '',
      status: 'scheduled',
      paymentStatus: 'pending',
    })

    // Create Stripe Checkout Session
    const successUrl = `${process.env.CLIENT_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.CLIENT_URL}/services/${serviceId}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
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
        application_fee_amount: platformFee,
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

    // Get spa owner (creator of the service)
    const spaOwner = service.createdBy

    if (!spaOwner || spaOwner.role !== 'team') {
      return next(createError(400, 'Service owner is not a valid spa account'))
    }

    // Check if spa owner has Stripe connected
    if (!spaOwner.stripe?.accountId || !spaOwner.stripe?.chargesEnabled) {
      return next(
        createError(400, 'This spa has not connected their payment account yet')
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
    const platformFee = Math.round(discountedAmount * 0.1 * 100) // 10% platform fee
    const amount = Math.round(discountedAmount * 100) // Convert to cents

    // Create payment intent with Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      application_fee_amount: platformFee,
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
      platformFee: { amount: platformFee, percentage: 10 },
      status: 'pending',
      pointsEarned: Math.floor(discountedAmount), // 1 point per dollar
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
    if (user.role === 'team') {
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

    if (user.role !== 'team') {
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
  }
}

async function handleCheckoutSessionCompleted(session) {
  const bookingId = session.metadata.bookingId
  const bookingIds = session.metadata.bookingIds
  const customerId = session.metadata.customerId
  const isCartCheckout = session.metadata.isCartCheckout === 'true'

  // Get payment intent details
  const paymentIntentId = session.payment_intent
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

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
      const pointsEarned = Math.floor(booking.finalPrice)
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
          amount: Math.round(booking.finalPrice * 0.1 * 100),
          percentage: 10,
        },
        status: 'succeeded',
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
    }

    // Award points to customer
    const customer = await User.findById(customerId)
    if (customer) {
      customer.points += totalPointsEarned
      await customer.save()
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
      amount: paymentIntent.application_fee_amount,
      percentage: 10,
    },
    status: 'succeeded',
    processedAt: new Date(),
    pointsEarned: Math.floor(booking.finalPrice), // 1 point per dollar
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
