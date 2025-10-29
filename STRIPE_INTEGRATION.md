# Stripe Multi-Team Payment Integration

This document outlines the Stripe Connect integration for the RadiantAI PWA app, enabling multiple spa/team accounts to receive payments from their clients.

## Overview

The integration uses **Stripe Connect** with Express accounts to allow each spa (team role) to:

- Connect their own Stripe account
- Receive payments directly from clients
- Manage their revenue and payouts
- View payment history and analytics

## Architecture

### Database Models

#### 1. User Model Updates (`server/models/User.js`)

Added `stripe` field to track Stripe Connect account information:

```javascript
stripe: {
  accountId: String,          // Stripe Connect account ID
  accountStatus: String,       // 'pending', 'active', 'restricted', 'inactive'
  onboardingCompleted: Boolean,
  chargesEnabled: Boolean,
  payoutsEnabled: Boolean,
  detailsSubmitted: Boolean,
  connectedAt: Date,
  lastUpdated: Date
}
```

#### 2. Payment Model (`server/models/Payment.js`)

New model to track all payment transactions:

- Payment intent tracking
- Customer and spa owner references
- Amount breakdown (subtotal, discount, tax, platform fee)
- Payment status and refund handling
- Points integration
- Payment method details

#### 3. Service Model Updates (`server/models/Service.js`)

Added optional Stripe product integration:

```javascript
stripe: {
  productId: String,  // Stripe Product ID
  priceId: String,    // Stripe Price ID
  syncedAt: Date
}
```

## Backend Implementation

### Configuration (`server/config/stripe.js`)

Initializes Stripe SDK with the latest API version.

### Controller (`server/controller/stripeController.js`)

Handles all Stripe-related operations:

**Connect Functions:**

- `createConnectAccount` - Create Stripe Express account for team
- `createAccountLink` - Generate onboarding URL
- `getAccountStatus` - Check account connection status
- `disconnectAccount` - Remove Stripe account
- `getAccountDashboard` - Get Stripe dashboard link

**Payment Functions:**

- `createPaymentIntent` - Initiate payment with Connect charges
- `confirmPayment` - Confirm and update payment status
- `getPaymentHistory` - Retrieve payment transactions
- `getRevenueAnalytics` - Get revenue metrics for spa owners
- `processRefund` - Handle payment refunds

**Webhook Handler:**

- `handleWebhook` - Process Stripe webhook events
  - Account updates
  - Payment success/failure
  - Refunds

### Routes (`server/routes/stripe.js`)

**Connect Routes:**

```
POST   /api/stripe/connect/create         - Create Connect account
POST   /api/stripe/connect/account-link   - Get onboarding link
GET    /api/stripe/connect/status         - Check account status
DELETE /api/stripe/connect/disconnect     - Disconnect account
GET    /api/stripe/connect/dashboard      - Get dashboard URL
```

**Payment Routes:**

```
POST   /api/stripe/payment/create-intent  - Create payment intent
POST   /api/stripe/payment/confirm        - Confirm payment
GET    /api/stripe/payment/history        - Get payment history
GET    /api/stripe/payment/analytics      - Get revenue analytics (team only)
POST   /api/stripe/payment/refund/:id     - Process refund (team only)
```

**Webhook Route:**

```
POST   /api/stripe/webhook                - Stripe webhook endpoint
```

## Frontend Implementation

### Services (`client/src/services/stripeService.js`)

API client for all Stripe operations using axios.

### Components

#### 1. StripeConnect (`client/src/components/Stripe/StripeConnect.jsx`)

**Purpose:** Team users connect their Stripe account
**Features:**

- Create Stripe Connect account
- Complete onboarding flow
- View account status
- Access Stripe dashboard
- Disconnect account

**Location:** Integrated into Management page for team role users

#### 2. PaymentCheckout (`client/src/components/Stripe/PaymentCheckout.jsx`)

**Purpose:** Clients pay for services
**Features:**

- Stripe Elements payment form
- Real-time payment processing
- Points earning display
- Error handling
- Success confirmation

**Usage:**

```jsx
import PaymentCheckout from '@/components/Stripe/PaymentCheckout'

;<PaymentCheckout
  service={serviceData}
  bookingId={bookingId}
  onSuccess={(payment) => console.log('Payment successful')}
  onCancel={() => console.log('Payment cancelled')}
/>
```

#### 3. PaymentHistory (`client/src/components/Stripe/PaymentHistory.jsx`)

**Purpose:** Display payment transactions
**Features:**

- Paginated payment list
- Status badges
- Payment details (amount, date, customer/spa)
- Discount and refund information
- Card details (last 4 digits)

#### 4. StripeAccountDashboard (`client/src/components/Stripe/StripeAccountDashboard.jsx`)

**Purpose:** Spa owners view revenue analytics
**Features:**

- Revenue metrics (total, average, transaction count)
- Date range filtering
- Payment history integration
- Analytics charts (coming soon)

## Setup Instructions

### 1. Server Setup

#### Install Dependencies

```bash
cd server
npm install stripe
```

#### Environment Variables

Create or update `server/.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Other existing variables...
MONGO=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=8800
CLIENT_URL=http://localhost:5173
```

**Getting Stripe Keys:**

1. Create account at https://dashboard.stripe.com
2. Get API keys from Developers > API keys
3. Create webhook endpoint and get webhook secret

### 2. Client Setup

#### Install Dependencies

```bash
cd client
npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### Environment Variables

Create `client/.env`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
VITE_API_URL=http://localhost:8800
```

### 3. Stripe Dashboard Configuration

#### Create Webhook Endpoint

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

#### Enable Connect

1. Go to Stripe Dashboard > Connect > Settings
2. Enable Express accounts
3. Set up branding and redirects

## Usage Flow

### For Spa Owners (Team Role)

1. **Connect Stripe Account**

   - Navigate to Management page
   - Click "Connect Stripe Account"
   - Complete Stripe onboarding
   - Verify account status

2. **Receive Payments**

   - Payments automatically deposited to Stripe account
   - View in Stripe Dashboard
   - Automatic payouts to bank account

3. **View Analytics**
   - Navigate to Management page
   - View revenue metrics
   - Check payment history
   - Process refunds if needed

### For Clients (User Role)

1. **Make Payment**

   - Select a service
   - Click "Book & Pay"
   - Enter payment details
   - Confirm payment

2. **Earn Points**

   - 1 point per $1 spent
   - Points added automatically
   - View in profile

3. **View History**
   - Navigate to Profile/Payments
   - See all transactions
   - Check payment status

## Payment Flow

```
1. Client initiates payment for service
   ↓
2. Backend creates PaymentIntent with Connect charge
   - Amount goes to spa owner's Stripe account
   - Platform fee (10%) deducted automatically
   ↓
3. Client completes payment via Stripe Elements
   ↓
4. Webhook confirms payment success
   ↓
5. Backend updates:
   - Payment status
   - Booking status
   - User points
   ↓
6. Client receives confirmation + points
7. Spa owner sees payment in Stripe dashboard
```

## Platform Fee Structure

- **Platform Fee:** 10% of transaction amount
- **Stripe Fees:** Standard Stripe fees apply
- **Payout:** Automatic to spa owner's bank account

Example:

```
Service Price: $100.00
Platform Fee:  -$10.00
Stripe Fee:    ~$3.20 (2.9% + $0.30)
Spa Receives:  ~$86.80
```

## Testing

### Test Mode

Use Stripe test keys during development:

- Test cards: https://stripe.com/docs/testing#cards
- Recommended: `4242 4242 4242 4242` (any future date, any CVC)

### Test Flow

1. Create test team user
2. Connect test Stripe account
3. Create test client user
4. Make test payment
5. Verify payment in Stripe Dashboard
6. Check payment history
7. Test refund functionality

## Security Considerations

1. **API Keys:** Never commit real Stripe keys to repository
2. **Webhook Verification:** All webhooks verified with signature
3. **HTTPS Only:** Stripe requires HTTPS in production
4. **PCI Compliance:** Stripe Elements handles sensitive data
5. **Authentication:** All payment routes require JWT authentication

## Production Deployment

### Checklist

- [ ] Replace test keys with live keys
- [ ] Update webhook endpoint to production URL
- [ ] Verify HTTPS is enabled
- [ ] Test payment flow end-to-end
- [ ] Set up monitoring for webhook failures
- [ ] Configure automatic payouts in Stripe
- [ ] Set up email notifications for payments
- [ ] Test refund process
- [ ] Review platform fee structure
- [ ] Update terms of service

### Environment Variables (Production)

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=https://app.radiantmdconsulting.com
NODE_ENV=production
```

## Troubleshooting

### Common Issues

**"No Stripe account connected" error:**

- Verify team user has completed onboarding
- Check `stripe.chargesEnabled` is true
- Ensure account status is 'active'

**Payment fails:**

- Check Stripe Dashboard for error details
- Verify webhook is receiving events
- Check payment intent status
- Review server logs

**Webhook not working:**

- Verify webhook URL is correct
- Check webhook signature verification
- Ensure raw body parsing is enabled
- Review Stripe Dashboard webhook logs

### Debug Mode

Enable Stripe debug logging:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
  telemetry: true,
})
```

## Future Enhancements

- [ ] Subscription support for recurring services
- [ ] Advanced discount/coupon system
- [ ] Multi-currency support
- [ ] Invoice generation
- [ ] Payment plans (installments)
- [ ] Gift card integration
- [ ] Revenue analytics dashboard with charts
- [ ] Automated tax calculation
- [ ] Payment dispute handling
- [ ] Mobile wallet support (Apple Pay, Google Pay)

## Support

For Stripe-specific questions:

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For integration questions:

- Create an issue in the repository
- Contact the development team

## API Reference

### Create Payment Intent

```javascript
POST /api/stripe/payment/create-intent
Body: {
  serviceId: "64a1b2c3d4e5f6g7h8i9j0k1",
  bookingId: "64a1b2c3d4e5f6g7h8i9j0k2" (optional),
  discountCode: "SUMMER20" (optional)
}
Response: {
  success: true,
  clientSecret: "pi_xxx_secret_xxx",
  paymentIntentId: "pi_xxx",
  paymentId: "64a1b2c3d4e5f6g7h8i9j0k3",
  amount: "100.00",
  pointsEarned: 100
}
```

### Get Revenue Analytics

```javascript
GET /api/stripe/payment/analytics?startDate=2024-01-01&endDate=2024-01-31
Response: {
  success: true,
  totalRevenue: 5000.00,
  totalTransactions: 50,
  averageTransaction: 100.00,
  payments: [...]
}
```

## License

This integration is part of the RadiantAI PWA application.
