import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAutoApplyRewardState,
  calculateCartRewardDiscount,
  calculateRewardDiscount,
  getApplicableRewardsForService,
  getRewardDisplayValue,
  getLinkedServiceId,
  mergeCatalogRewardsWithClaims,
  selectBestCartReward,
} from '../src/utils/rewardFlow.js'

test('buildAutoApplyRewardState uses claimed user reward id and snapshot', () => {
  const response = {
    data: {
      userReward: {
        _id: 'user-reward-123',
        rewardSnapshot: {
          name: '20% Off Facial',
          type: 'discount',
          value: 20,
        },
      },
    },
  }
  const fallbackReward = { _id: 'catalog-reward-1', name: 'Catalog Reward', serviceId: 'svc-9' }

  const result = buildAutoApplyRewardState({
    data: response,
    rewardId: 'catalog-reward-1',
    fallbackReward,
  })

  assert.equal(result.linkedServiceId, 'svc-9')
  assert.equal(result.autoApplyState.autoApplyRewardId, 'user-reward-123')
  assert.equal(result.autoApplyState.autoApplyRewardName, '20% Off Facial')
  assert.equal(result.autoApplyState.autoApplyRewardSnapshot.type, 'discount')
})

test('getLinkedServiceId resolves nested linked service ids', () => {
  const reward = {
    linkedServices: [{ serviceId: { _id: 'svc-101' } }],
  }
  assert.equal(getLinkedServiceId(reward), 'svc-101')
})

test('calculateRewardDiscount applies percentage cap', () => {
  const discount = calculateRewardDiscount({
    rewardSnapshot: { type: 'discount', value: 50, maxValue: 30 },
    subtotal: 100,
    serviceId: 'svc-1',
  })

  assert.equal(discount, 30)
})

test('calculateRewardDiscount does not apply service-specific reward to other service', () => {
  const discount = calculateRewardDiscount({
    rewardSnapshot: { type: 'discount', value: 20, serviceId: 'svc-1' },
    subtotal: 100,
    serviceId: 'svc-2',
  })

  assert.equal(discount, 0)
})

test('calculateRewardDiscount makes service free for free_service reward', () => {
  const discount = calculateRewardDiscount({
    rewardSnapshot: { type: 'free_service', serviceId: 'svc-1' },
    subtotal: 140,
    serviceId: 'svc-1',
  })

  assert.equal(discount, 140)
})

test('mergeCatalogRewardsWithClaims annotates rewards with active claims', () => {
  const catalogRewards = [{ _id: 'r1', name: 'Reward 1' }, { _id: 'r2', name: 'Reward 2' }]
  const userRewards = [
    {
      _id: 'ur-1',
      rewardId: { _id: 'r1' },
      claimedAt: '2026-01-01T00:00:00.000Z',
      rewardSnapshot: { name: 'Reward 1' },
    },
    {
      _id: 'ur-2',
      rewardId: { _id: 'r1' },
      claimedAt: '2026-01-10T00:00:00.000Z',
      rewardSnapshot: { name: 'Reward 1 newer' },
    },
  ]

  const merged = mergeCatalogRewardsWithClaims({ catalogRewards, userRewards })
  const reward1 = merged.find((item) => item._id === 'r1')
  const reward2 = merged.find((item) => item._id === 'r2')

  assert.equal(reward1.hasActiveClaim, true)
  assert.equal(reward1.activeClaimCount, 2)
  assert.equal(reward1.activeUserRewardId, 'ur-2')
  assert.equal(reward2.hasActiveClaim, false)
})

test('selectBestCartReward chooses highest estimated discount with tie-breaks', () => {
  const rewards = [
    {
      _id: 'ur-old',
      claimedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-05-10T00:00:00.000Z',
      rewardSnapshot: { type: 'discount', value: 20 },
    },
    {
      _id: 'ur-new-earlier-expiry',
      claimedAt: '2026-03-01T00:00:00.000Z',
      expiresAt: '2026-04-01T00:00:00.000Z',
      rewardSnapshot: { type: 'discount', value: 20 },
    },
  ]
  const items = [{ serviceId: 'svc-1', totalPrice: 100 }]

  const best = selectBestCartReward({
    rewards,
    items,
    totalAmount: 100,
  })

  assert.equal(best._id, 'ur-new-earlier-expiry')
  assert.equal(best.estimatedDiscount, 20)
})

test('calculateCartRewardDiscount handles free service for targeted item', () => {
  const discount = calculateCartRewardDiscount({
    rewardSnapshot: { type: 'free_service', serviceId: 'svc-2' },
    items: [
      { serviceId: 'svc-1', totalPrice: 80 },
      { serviceId: 'svc-2', totalPrice: 120 },
    ],
    totalAmount: 200,
  })
  assert.equal(discount, 120)
})

test('calculateCartRewardDiscount returns zero when service-specific reward has no match', () => {
  const discount = calculateCartRewardDiscount({
    rewardSnapshot: { type: 'discount', value: 30, serviceId: 'svc-9' },
    items: [{ serviceId: 'svc-1', totalPrice: 120 }],
    totalAmount: 120,
  })

  assert.equal(discount, 0)
})

test('calculateCartRewardDiscount enforces minPurchase threshold', () => {
  const discount = calculateCartRewardDiscount({
    rewardSnapshot: { type: 'discount', value: 20, minPurchase: 150 },
    items: [{ serviceId: 'svc-1', totalPrice: 120 }],
    totalAmount: 120,
  })

  assert.equal(discount, 0)
})

test('getApplicableRewardsForService returns only service-valid rewards', () => {
  const rewards = [
    {
      _id: 'ur-1',
      rewardSnapshot: { type: 'discount', value: 10, serviceId: 'svc-1' },
    },
    {
      _id: 'ur-2',
      rewardSnapshot: { type: 'discount', value: 10, serviceId: 'svc-2' },
    },
  ]
  const applicable = getApplicableRewardsForService({
    userRewards: rewards,
    serviceId: 'svc-1',
  })
  assert.equal(applicable.length, 1)
  assert.equal(applicable[0]._id, 'ur-1')
  assert.equal(applicable[0].isApplicableToCurrentService, true)
})

test('getRewardDisplayValue formats snapshot value correctly', () => {
  assert.equal(getRewardDisplayValue({ type: 'discount', value: 25 }), '25%')
  assert.equal(getRewardDisplayValue({ type: 'free_service' }), 'Free service')
  assert.equal(getRewardDisplayValue({ type: 'credit', value: 30 }), '$30')
})
