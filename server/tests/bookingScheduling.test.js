import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getServiceCalendarSelection,
  shouldConsiderBookingConflict,
} from '../utils/bookingScheduling.js'

test('getServiceCalendarSelection keeps calendarId even when serviceId matches', () => {
  const service = {
    ghlCalendar: {
      calendarId: 'cal_123',
      name: 'Test Calendar',
      timeZone: 'America/New_York',
    },
    ghlService: {
      serviceId: 'cal_123',
      serviceLocationId: 'sl_456',
      name: 'Test Service',
    },
  }

  const selection = getServiceCalendarSelection(service)

  assert.equal(selection.calendarId, 'cal_123')
  assert.equal(selection.serviceId, 'cal_123')
  assert.equal(selection.serviceLocationId, 'sl_456')
})

test('availability can ignore the current user pending Stripe checkout hold', () => {
  const pendingHold = {
    userId: 'user_1',
    paymentStatus: 'pending',
    stripeSessionId: 'cs_test_1',
    createdAt: new Date(),
  }

  assert.equal(
    shouldConsiderBookingConflict(pendingHold, {
      ignorePendingHoldsForUserId: 'user_1',
    }),
    false
  )

  assert.equal(
    shouldConsiderBookingConflict(pendingHold, {
      ignorePendingHoldsForUserId: 'user_2',
    }),
    true
  )
})
