import 'dotenv/config'
import mongoose from 'mongoose'
import Category from '../models/Category.js'
import Service from '../models/Service.js'

const LOCATION_ID = 'v9oZYW5R8X9QsRKfJ8u9'
const TARGET_CATEGORIES = [
  'Waxing',
  'Waxing Combos',
  'Vajacials',
  'Add-Ons',
  'Permanent Jewelry',
]

const args = new Set(process.argv.slice(2))
const dryRun = !args.has('--apply')

function normalize(value) {
  return `${value || ''}`.toLowerCase().replace(/\s+/g, ' ').trim()
}

function pickCategoryName(serviceName) {
  const name = normalize(serviceName)

  if (
    name.includes('pj') ||
    name.includes('sterling silver') ||
    name.includes('rose gold') ||
    name.includes('anklet') ||
    name.includes('bracelet') ||
    name.includes('necklace') ||
    name.includes('permanent jewelry')
  ) {
    return 'Permanent Jewelry'
  }

  if (name.includes('vajacial')) {
    return 'Vajacials'
  }

  if (
    name.includes('add on') ||
    name.includes('add-on') ||
    name.includes('addon') ||
    name.includes('paraffin') ||
    name.includes('spray tan') ||
    name.includes('membership')
  ) {
    return 'Add-Ons'
  }

  if (
    name.includes('&') ||
    name.includes(',') ||
    name.includes(' and ') ||
    name.includes('/')
  ) {
    return 'Waxing Combos'
  }

  return 'Waxing'
}

async function run() {
  const mongoUri = process.env.MONGO || process.env.MONGO_URI
  if (!mongoUri) {
    throw new Error('Missing MongoDB URI. Expected MONGO or MONGO_URI in env.')
  }

  await mongoose.connect(mongoUri)

  const services = await Service.find({
    locationId: LOCATION_ID,
    isDeleted: false,
  })
    .select('_id name categoryId createdBy')
    .lean()

  if (services.length === 0) {
    console.log(`No services found for location ${LOCATION_ID}.`) 
    await mongoose.disconnect()
    return
  }

  const createdByFallback = services.find((s) => s.createdBy)?.createdBy
  if (!createdByFallback) {
    throw new Error('Unable to determine createdBy for category creation.')
  }

  const categoryDocsByName = new Map()

  for (const catName of TARGET_CATEGORIES) {
    const existing = await Category.findOne({
      name: catName,
      locationId: LOCATION_ID,
      isDeleted: false,
    })
      .select('_id name locationId createdBy')
      .lean()

    if (existing) {
      categoryDocsByName.set(catName, existing)
      continue
    }

    if (dryRun) {
      categoryDocsByName.set(catName, {
        _id: `DRY_RUN_${catName.replace(/\s+/g, '_')}`,
        name: catName,
        locationId: LOCATION_ID,
      })
      continue
    }

    const created = await Category.create({
      name: catName,
      description: '',
      locationId: LOCATION_ID,
      createdBy: createdByFallback,
      updatedBy: createdByFallback,
      isActive: true,
      isDeleted: false,
    })

    categoryDocsByName.set(catName, {
      _id: created._id,
      name: created.name,
      locationId: created.locationId,
    })
  }

  const updates = []
  const assignmentCounts = Object.fromEntries(TARGET_CATEGORIES.map((c) => [c, 0]))

  for (const service of services) {
    const targetCategoryName = pickCategoryName(service.name)
    assignmentCounts[targetCategoryName] += 1

    const targetCategory = categoryDocsByName.get(targetCategoryName)
    if (!targetCategory) {
      throw new Error(`Missing category doc for ${targetCategoryName}`)
    }

    const currentCategoryId = `${service.categoryId || ''}`
    const nextCategoryId = `${targetCategory._id}`

    if (currentCategoryId !== nextCategoryId) {
      updates.push({
        updateOne: {
          filter: { _id: service._id },
          update: { $set: { categoryId: targetCategory._id } },
        },
      })
    }
  }

  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`)
  console.log(`Location: ${LOCATION_ID}`)
  console.log(`Services found: ${services.length}`)
  console.log('Assignment counts by target category:')
  for (const categoryName of TARGET_CATEGORIES) {
    console.log(`- ${categoryName}: ${assignmentCounts[categoryName]}`)
  }
  console.log(`Services needing categoryId update: ${updates.length}`)

  if (!dryRun && updates.length > 0) {
    const result = await Service.bulkWrite(updates, { ordered: false })
    console.log('Bulk update result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    })
  }

  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error('Migration failed:', error)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
