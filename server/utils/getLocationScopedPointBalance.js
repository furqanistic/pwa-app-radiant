import mongoose from 'mongoose'
import PointTransaction from '../models/PointTransaction.js'

export async function getLocationScopedPointBalance(userId, locationId) {
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

  return result?.balance || 0
}
