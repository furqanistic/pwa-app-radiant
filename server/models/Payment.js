// File: server/models/Payment.js - Payment Transaction Model
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    // Payment identification
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripeChargeId: {
      type: String,
      default: null,
    },

    // Transaction parties
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    spaOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stripeAccountId: {
      type: String,
      required: true,
      index: true,
    },

    // Booking reference
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },

    // Amount details (in cents)
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'usd',
      uppercase: true,
    },

    // Pricing breakdown
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      amount: {
        type: Number,
        default: 0,
      },
      type: {
        type: String,
        enum: ['percentage', 'fixed', 'coupon'],
        default: null,
      },
      code: {
        type: String,
        default: null,
      },
      description: {
        type: String,
        default: null,
      },
    },
    tax: {
      amount: {
        type: Number,
        default: 0,
      },
      rate: {
        type: Number,
        default: 0,
      },
    },
    platformFee: {
      amount: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
    },

    // Payment status
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'succeeded',
        'failed',
        'canceled',
        'refunded',
        'partially_refunded',
      ],
      default: 'pending',
      index: true,
    },

    // Refund details
    refund: {
      amount: {
        type: Number,
        default: 0,
      },
      reason: {
        type: String,
        default: null,
      },
      stripeRefundId: {
        type: String,
        default: null,
      },
      refundedAt: {
        type: Date,
        default: null,
      },
      refundedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },

    // Payment method
    paymentMethod: {
      type: {
        type: String,
        default: 'card',
      },
      brand: {
        type: String,
        default: null,
      },
      last4: {
        type: String,
        default: null,
      },
      expMonth: {
        type: Number,
        default: null,
      },
      expYear: {
        type: Number,
        default: null,
      },
    },

    // Points integration
    pointsEarned: {
      type: Number,
      default: 0,
    },
    pointsUsed: {
      type: Number,
      default: 0,
    },

    // Metadata
    metadata: {
      type: Map,
      of: String,
      default: {},
    },

    // Error handling
    errorMessage: {
      type: String,
      default: null,
    },
    errorCode: {
      type: String,
      default: null,
    },

    // Timestamps
    processedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
PaymentSchema.index({ customer: 1, createdAt: -1 });
PaymentSchema.index({ spaOwner: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ stripeAccountId: 1, createdAt: -1 });

// Virtual for formatted amount
PaymentSchema.virtual('formattedAmount').get(function () {
  return (this.amount / 100).toFixed(2);
});

// Static method to get spa revenue
PaymentSchema.statics.getSpaRevenue = async function (spaOwnerId, startDate, endDate) {
  const query = {
    spaOwner: spaOwnerId,
    status: 'succeeded',
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const payments = await this.find(query);

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalTransactions = payments.length;
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return {
    totalRevenue: totalRevenue / 100, // Convert to dollars
    totalTransactions,
    averageTransaction: averageTransaction / 100,
    payments,
  };
};

// Static method to get customer payment history
PaymentSchema.statics.getCustomerHistory = async function (customerId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const total = await this.countDocuments({ customer: customerId });
  const payments = await this.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('service', 'name basePrice')
    .populate('spaOwner', 'name spaLocation.locationName');

  return {
    payments,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPayments: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    },
  };
};

// Method to check if payment can be refunded
PaymentSchema.methods.canBeRefunded = function () {
  const daysSincePayment = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  return (
    this.status === 'succeeded' &&
    this.refund.amount === 0 &&
    daysSincePayment <= 90 // Stripe allows refunds within 90 days
  );
};

export default mongoose.model('Payment', PaymentSchema);
