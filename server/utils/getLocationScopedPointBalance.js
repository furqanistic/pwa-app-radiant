import mongoose from 'mongoose'
import PointTransaction from '../models/PointTransaction.js'

/**
 * Sum of PointTransaction.points for (user, locationId). Can be negative if ledger is inconsistent.
 * @param {{ clampNonNegative?: boolean }} options - If true, returns Math.max(0, sum) for customer-facing APIs / UI.
 */
export async function getLocationScopedPointBalance(
  userId,
  locationId,
  options = {}
) {
  if (!userId || !locationId) return 0

  const userObjectId =
    typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId

  const [result] = await PointTransaction.aggregate([
    {
      $match: {
        user: userObjectId,
        locationId: `${locationId}`.trim(),
      },
    },
    {
      $group: {
        _id: null,
        balance: { $sum: '$points' },
      },
    },
  ])

  const raw = Number(result?.balance ?? 0) || 0
  return options.clampNonNegative ? Math.max(0, raw) : raw
}
