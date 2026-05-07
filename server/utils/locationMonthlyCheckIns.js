// File: server/utils/locationMonthlyCheckIns.js
import Location from '../models/Location.js'

/** Canonical UTC year-month label (e.g. 2026-01). */
export const getUtcYmKey = (date = new Date()) => {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

/** Atomically increments this location's persisted monthly check-in tally (verified visits). Survives "clear recent check-ins". */
export async function recordVerifiedMonthlyCheckIn(locationId) {
  if (!`${locationId || ''}`.trim()) return
  const ym = getUtcYmKey()

  await Location.collection.updateOne({ locationId }, [
    {
      $set: {
        dashboardCheckInStats: {
          monthYm: ym,
          monthCheckInCount: {
            $cond: [
              {
                $eq: [
                  { $toString: { $ifNull: ['$dashboardCheckInStats.monthYm', ''] } },
                  ym,
                ],
              },
              {
                $add: [
                  { $toLong: { $ifNull: ['$dashboardCheckInStats.monthCheckInCount', 0] } },
                  1,
                ],
              },
              1,
            ],
          },
          prevMonthYm: {
            $cond: [
              {
                $eq: [
                  { $toString: { $ifNull: ['$dashboardCheckInStats.monthYm', ''] } },
                  ym,
                ],
              },
              {
                $toString: {
                  $ifNull: ['$dashboardCheckInStats.prevMonthYm', ''],
                },
              },
              {
                $toString: {
                  $ifNull: ['$dashboardCheckInStats.monthYm', ''],
                },
              },
            ],
          },
          prevMonthCheckInCount: {
            $cond: [
              {
                $eq: [
                  { $toString: { $ifNull: ['$dashboardCheckInStats.monthYm', ''] } },
                  ym,
                ],
              },
              {
                $toLong: {
                  $ifNull: ['$dashboardCheckInStats.prevMonthCheckInCount', 0],
                },
              },
              {
                $toLong: { $ifNull: ['$dashboardCheckInStats.monthCheckInCount', 0] },
              },
            ],
          },
        },
      },
    },
  ])
}
