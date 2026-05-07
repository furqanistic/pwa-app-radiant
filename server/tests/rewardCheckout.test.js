import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateSingleBookingRewardDiscount,
  isRewardApplicableToService,
  resolveSingleBookingRewardUsage,
} from '../utils/rewardCheckout.js'

test('isRewardApplicableToService applies globally when no service targeting is set', () => {
  assert.equal(isRewardApplicableToService({ type: 'discount', value: 10 }, 'svc-1'), true)
})

test('isRewardApplicableToService respects serviceId targeting', () => {
  assert.equal(
    isRewardApplicableToService({ type: 'discount', value: 10, serviceId: 'svc-1' }, 'svc-2'),
    false
  )
})

test('calculateSingleBookingRewardDiscount applies capped percent discount', () => {
  const amount = calculateSingleBookingRewardDiscount({
    rewardSnapshot: { type: 'discount', value: 40, maxValue: 25 },
    subtotal: 100,
    serviceId: 'svc-1',
  })

  assert.equal(amount, 25)
})

test('calculateSingleBookingRewardDiscount applies minPurchase rule', () => {
  const amount = calculateSingleBookingRewardDiscount({
    rewardSnapshot: { type: 'discount', value: 20, minPurchase: 150 },
    subtotal: 100,
    serviceId: 'svc-1',
  })

  assert.equal(amount, 0)
})

test('calculateSingleBookingRewardDiscount applies free_service as full subtotal', () => {
  const amount = calculateSingleBookingRewardDiscount({
    rewardSnapshot: { type: 'free_service', serviceId: 'svc-1' },
    subtotal: 110,
    serviceId: 'svc-1',
  })

  assert.equal(amount, 110)
})

test('resolveSingleBookingRewardUsage keeps reward unused when discount is zero', () => {
  const result = resolveSingleBookingRewardUsage({
    rewardSnapshot: { type: 'discount', value: 20, serviceId: 'svc-1' },
    subtotal: 100,
    serviceId: 'svc-2',
    userRewardId: 'ur-123',
  })

  assert.equal(result.rewardDiscountAmount, 0)
  assert.equal(result.resolvedRewardUsed, null)
})

test('resolveSingleBookingRewardUsage marks reward used when discount applies', () => {
  const result = resolveSingleBookingRewardUsage({
    rewardSnapshot: { type: 'discount', value: 20, serviceId: 'svc-1' },
    subtotal: 100,
    serviceId: 'svc-1',
    userRewardId: 'ur-123',
  })

  assert.equal(result.rewardDiscountAmount, 20)
  assert.equal(result.resolvedRewardUsed, 'ur-123')
})
