import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config({ path: './.env' })

const OLD = '6RL2MtUxqIc5fUgWRw1O'
const NEW = 'aoI0lwEHQI7DdKt1CW8X'

const run = async () => {
  if (!process.env.MONGO) {
    throw new Error('MONGO is not defined in server/.env')
  }

  await mongoose.connect(process.env.MONGO)
  const db = mongoose.connection.db

  const updates = []
  updates.push([
    'users spaLocation.locationId',
    await db
      .collection('users')
      .updateMany(
        { 'spaLocation.locationId': OLD },
        { $set: { 'spaLocation.locationId': NEW } }
      ),
  ])
  updates.push([
    'users selectedLocation.locationId',
    await db
      .collection('users')
      .updateMany(
        { 'selectedLocation.locationId': OLD },
        { $set: { 'selectedLocation.locationId': NEW } }
      ),
  ])
  updates.push([
    'users membership.locationId',
    await db
      .collection('users')
      .updateMany(
        { 'membership.locationId': OLD },
        { $set: { 'membership.locationId': NEW } }
      ),
  ])
  updates.push([
    'users activeMembership.locationId',
    await db
      .collection('users')
      .updateMany(
        { 'activeMembership.locationId': OLD },
        { $set: { 'activeMembership.locationId': NEW } }
      ),
  ])
  updates.push([
    'users membershipBilling.locationId',
    await db
      .collection('users')
      .updateMany(
        { 'membershipBilling.locationId': OLD },
        { $set: { 'membershipBilling.locationId': NEW } }
      ),
  ])
  updates.push([
    'users onboardingRewards.profileCompletion.locationId',
    await db.collection('users').updateMany(
      { 'onboardingRewards.profileCompletion.locationId': OLD },
      { $set: { 'onboardingRewards.profileCompletion.locationId': NEW } }
    ),
  ])
  updates.push([
    'users reviewRewards.googleReview.locationId',
    await db.collection('users').updateMany(
      { 'reviewRewards.googleReview.locationId': OLD },
      { $set: { 'reviewRewards.googleReview.locationId': NEW } }
    ),
  ])
  updates.push([
    'services locationId',
    await db
      .collection('services')
      .updateMany({ locationId: OLD }, { $set: { locationId: NEW } }),
  ])
  updates.push([
    'bookings locationId',
    await db
      .collection('bookings')
      .updateMany({ locationId: OLD }, { $set: { locationId: NEW } }),
  ])
  updates.push([
    'categories locationId',
    await db
      .collection('categories')
      .updateMany({ locationId: OLD }, { $set: { locationId: NEW } }),
  ])
  updates.push([
    'rewards locationId',
    await db
      .collection('rewards')
      .updateMany({ locationId: OLD }, { $set: { locationId: NEW } }),
  ])
  updates.push([
    'userrewards locationId',
    await db
      .collection('userrewards')
      .updateMany({ locationId: OLD }, { $set: { locationId: NEW } }),
  ])
  updates.push([
    'pointtransactions locationId',
    await db
      .collection('pointtransactions')
      .updateMany({ locationId: OLD }, { $set: { locationId: NEW } }),
  ])
  updates.push([
    'gamewheels locationId',
    await db
      .collection('gamewheels')
      .updateMany({ locationId: OLD }, { $set: { locationId: NEW } }),
  ])
  updates.push([
    'qrcodescans locationId',
    await db
      .collection('qrcodescans')
      .updateMany({ locationId: OLD }, { $set: { locationId: NEW } }),
  ])
  updates.push([
    'payments membershipDetails.locationId',
    await db.collection('payments').updateMany(
      { 'membershipDetails.locationId': OLD },
      { $set: { 'membershipDetails.locationId': NEW } }
    ),
  ])
  updates.push([
    'referralconfigs spaConfigs.locationId',
    await db.collection('referralconfigs').updateMany(
      { 'spaConfigs.locationId': OLD },
      { $set: { 'spaConfigs.$[elem].locationId': NEW } },
      { arrayFilters: [{ 'elem.locationId': OLD }] }
    ),
  ])
  updates.push([
    'locations qrCode.qrData replace',
    await db.collection('locations').updateMany(
      { 'qrCode.qrData': { $regex: OLD } },
      [
        {
          $set: {
            'qrCode.qrData': {
              $replaceOne: {
                input: '$qrCode.qrData',
                find: OLD,
                replacement: NEW,
              },
            },
          },
        },
      ]
    ),
  ])

  for (const [name, result] of updates) {
    console.log(
      `${name}: matched=${result.matchedCount} modified=${result.modifiedCount}`
    )
  }

  const checks = [
    ['users', { 'spaLocation.locationId': OLD }],
    ['users', { 'selectedLocation.locationId': OLD }],
    ['services', { locationId: OLD }],
    ['bookings', { locationId: OLD }],
    ['categories', { locationId: OLD }],
    ['rewards', { locationId: OLD }],
    ['userrewards', { locationId: OLD }],
    ['pointtransactions', { locationId: OLD }],
    ['gamewheels', { locationId: OLD }],
    ['locations', { 'qrCode.qrData': { $regex: OLD } }],
  ]

  for (const [collection, query] of checks) {
    const count = await db.collection(collection).countDocuments(query)
    console.log(`remaining ${collection} ${JSON.stringify(query)} => ${count}`)
  }

  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error('Migration failed:', error)
  try {
    await mongoose.disconnect()
  } catch {
    // Ignore disconnect errors
  }
  process.exit(1)
})
