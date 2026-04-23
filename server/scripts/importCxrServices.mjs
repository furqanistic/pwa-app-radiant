/**
 * Import services from CXR_Onboarding_Sheet.xlsx (Services sheet) into MongoDB.
 *
 * Usage:
 *   node scripts/importCxrServices.mjs --location-id=v9oZYW5R8X9QsRKfJ8u9 --dry-run
 *   node scripts/importCxrServices.mjs --location-id=v9oZYW5R8X9QsRKfJ8u9
 *
 * Options:
 *   --file=<path>          Default: ../client/public/CXR_Onboarding_Sheet.xlsx
 *   --location-id=<id>     Required unless using default from plan
 *   --created-by=<id>      Mongo ObjectId of User; else first super-admin/admin
 *   --dry-run              Log actions only
 *   --no-skip-existing     Insert even if same name exists for location (default: skip)
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'
import Category from '../models/Category.js'
import Service from '../models/Service.js'
import User from '../models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const DEFAULT_FILE = path.join(
  __dirname,
  '../../client/public/CXR_Onboarding_Sheet.xlsx'
)
const DEFAULT_LOCATION_ID = 'v9oZYW5R8X9QsRKfJ8u9'

function parseArgs(argv) {
  const out = {
    file: DEFAULT_FILE,
    locationId: DEFAULT_LOCATION_ID,
    createdBy: '',
    dryRun: false,
    skipExisting: true,
  }
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--no-skip-existing') out.skipExisting = false
    else if (arg.startsWith('--file='))
      out.file = path.resolve(arg.slice('--file='.length))
    else if (arg.startsWith('--location-id='))
      out.locationId = arg.slice('--location-id='.length).trim()
    else if (arg.startsWith('--created-by='))
      out.createdBy = arg.slice('--created-by='.length).trim()
  }
  return out
}

function toStr(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return String(v).trim()
}

function parseBasePrice(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw >= 0 ? raw : null
  }
  const s = String(raw).trim().replace(/[$,]/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** When Regular price is empty, use the first amount in Price range (e.g. "$95 - $160" → 95). */
function parseFirstPriceFromRange(raw) {
  const s = toStr(raw)
  if (!s) return null
  const matches = [...s.matchAll(/\$?\s*(\d+(?:\.\d+)?)/g)]
  const nums = matches
    .map((m) => parseFloat(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0)
  if (nums.length === 0) return null
  return nums[0]
}

function resolveBasePrice(regularRaw, priceRangeStr) {
  const fromRegular = parseBasePrice(regularRaw)
  if (fromRegular !== null) return { price: fromRegular, source: 'regular' }
  const fromRange = parseFirstPriceFromRange(priceRangeStr)
  if (fromRange !== null) return { price: fromRange, source: 'range' }
  return { price: null, source: null }
}

function parseMemberPrice(raw) {
  const p = parseBasePrice(raw)
  return p !== null && p > 0 ? p : null
}

/**
 * Parse session length strings into minutes (e.g. "20 mins", "1 hr", "1hr 15 mins", "80 minutes").
 */
function parseDurationMinutes(raw) {
  const s = toStr(raw).toLowerCase().replace(/\s+/g, ' ')
  if (!s) return null

  let total = 0
  const spacedHours = /(\d+(?:\.\d+)?)\s+(?:hr|hrs|hour|hours)\b/gi
  let m
  while ((m = spacedHours.exec(s)) !== null) {
    total += Math.round(parseFloat(m[1]) * 60)
  }
  const compactHour = s.match(/(\d+(?:\.\d+)?)hr\b/i)
  if (compactHour) {
    total += Math.round(parseFloat(compactHour[1]) * 60)
  }

  const minRe = /(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)\b/gi
  while ((m = minRe.exec(s)) !== null) {
    total += Math.round(parseFloat(m[1]))
  }

  if (total > 0) return Math.max(1, total)

  const onlyNum = s.match(/^(\d+(?:\.\d+)?)\s*$/)
  if (onlyNum) {
    const n = Math.round(parseFloat(onlyNum[1]))
    if (n > 0 && n <= 480) return n
  }

  return null
}

function categoryDisplayName(businessName, locationId) {
  const biz = toStr(businessName) || 'Unknown business'
  return `${biz} · CXR · ${locationId}`
}

async function resolveCreatedByUserId(explicitId) {
  if (explicitId) {
    if (!mongoose.isValidObjectId(explicitId)) {
      throw new Error(`Invalid --created-by ObjectId: ${explicitId}`)
    }
    const u = await User.findById(explicitId).select('_id role')
    if (!u) throw new Error(`User not found for --created-by=${explicitId}`)
    return u._id
  }
  let u = await User.findOne({ role: 'super-admin' }).select('_id').sort({ _id: 1 })
  if (!u) u = await User.findOne({ role: 'admin' }).select('_id').sort({ _id: 1 })
  if (!u) {
    throw new Error(
      'No super-admin or admin user found. Create one or pass --created-by=<userObjectId>'
    )
  }
  return u._id
}

function buildDescription(row, extras) {
  const base = toStr(row.description)
  const parts = []
  if (base) parts.push(base)
  else parts.push('Imported from CXR onboarding sheet.')
  if (extras.priceSource === 'range' && extras.priceRange) {
    parts.push(
      `Base price taken from the sheet’s price range (regular price column was empty): ${extras.priceRange}`
    )
  } else if (extras.priceRange) {
    parts.push(`Price range: ${extras.priceRange}`)
  }
  if (extras.staff) parts.push(`Staff: ${extras.staff}`)
  if (extras.memberPrice != null)
    parts.push(`Member price: $${extras.memberPrice}`)
  return parts.join('\n\n').slice(0, 50000)
}

async function findOrCreateCategory(name, locationId, createdBy, dryRun, cache) {
  const key = `${locationId}::${name}`
  if (cache.has(key)) return cache.get(key)

  let cat = await Category.findOne({
    name,
    locationId,
    isDeleted: false,
  }).select('_id')

  if (cat) {
    cache.set(key, cat._id)
    return cat._id
  }

  if (dryRun) {
    console.log(`[dry-run] would create category: "${name}"`)
    const fake = new mongoose.Types.ObjectId()
    cache.set(key, fake)
    return fake
  }

  cat = await Category.create({
    name,
    description: 'Auto-created for CXR onboarding import',
    icon: '',
    color: '#3B82F6',
    order: 0,
    isActive: true,
    locationId,
    createdBy,
  })
  cache.set(key, cat._id)
  console.log(`Created category: ${name} (${cat._id})`)
  return cat._id
}

function normalizeHeaderRow(row) {
  const h = row.map((c) => toStr(c).toLowerCase())
  const idx = (needle) => h.findIndex((x) => x.includes(needle))
  const business = idx('business name')
  const service = idx('service name')
  if (business >= 0 && service >= 0) {
    return {
      business,
      service,
      priceRange: idx('price range'),
      session: idx('session length'),
      regular: idx('regular price'),
      member: idx('member price'),
      staff: idx('staff member'),
      description: idx('description'),
    }
  }
  return {
    business: 0,
    service: 1,
    priceRange: 2,
    session: 3,
    regular: 4,
    member: 5,
    staff: 6,
    description: 7,
  }
}

function cell(row, i) {
  if (i < 0) return ''
  return row[i] !== undefined && row[i] !== null ? row[i] : ''
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { file, locationId, dryRun, skipExisting } = args

  if (!process.env.MONGO) {
    throw new Error('MONGO is not defined in server/.env')
  }

  console.log(`File: ${file}`)
  console.log(`locationId: ${locationId}`)
  console.log(`dryRun: ${dryRun}`)
  console.log(`skipExisting: ${skipExisting}`)

  const workbook = XLSX.readFile(file, { cellDates: true })
  const sheet = workbook.Sheets['Services']
  if (!sheet) {
    throw new Error('Sheet "Services" not found in workbook')
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 2) {
    throw new Error('Services sheet has no data rows')
  }

  const col = normalizeHeaderRow(rows[0])
  console.log('Column map:', col)

  await mongoose.connect(process.env.MONGO)
  console.log('Connected to MongoDB')

  const createdBy = await resolveCreatedByUserId(args.createdBy)
  console.log(`createdBy: ${createdBy}`)

  const categoryCache = new Map()
  /** In --dry-run, DB is unchanged; treat a second row with the same name as duplicate. */
  const stagedServiceNames = new Set()
  let created = 0
  let skippedNoName = 0
  let skippedNoPrice = 0
  let skippedDup = 0
  let failed = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!Array.isArray(row) || row.every((c) => toStr(c) === '')) continue

    const businessName = toStr(cell(row, col.business))
    const serviceName = toStr(cell(row, col.service))
    const priceRange = toStr(cell(row, col.priceRange))
    const sessionRaw = cell(row, col.session)
    const regularRaw = cell(row, col.regular)
    const memberRaw = cell(row, col.member)
    const staff = toStr(cell(row, col.staff))
    const descCell = toStr(cell(row, col.description))

    if (!serviceName) {
      skippedNoName++
      continue
    }

    const { price: basePrice, source: priceSource } = resolveBasePrice(
      regularRaw,
      priceRange
    )
    if (basePrice === null) {
      console.warn(
        `Row ${i + 1}: skip — no regular price (${toStr(regularRaw)}) and no amount in price range (${toStr(priceRange)})`
      )
      skippedNoPrice++
      continue
    }

    let duration = parseDurationMinutes(sessionRaw)
    if (duration === null) {
      duration = 60
      console.warn(
        `Row ${i + 1}: "${serviceName}" — could not parse duration "${toStr(sessionRaw)}", using 60 min`
      )
    }

    const memberPrice = parseMemberPrice(memberRaw)
    const description = buildDescription(
      { description: descCell },
      { priceRange, staff, memberPrice, priceSource }
    )

    const catName = categoryDisplayName(businessName, locationId)

    try {
      if (skipExisting) {
        const exists = await Service.findOne({
          locationId,
          name: serviceName,
          isDeleted: false,
        }).select('_id')
        if (exists) {
          skippedDup++
          continue
        }
        if (dryRun && stagedServiceNames.has(serviceName)) {
          skippedDup++
          continue
        }
      }

      const categoryId = await findOrCreateCategory(
        catName,
        locationId,
        createdBy,
        dryRun,
        categoryCache
      )

      const doc = {
        name: serviceName,
        description,
        categoryId,
        basePrice,
        duration,
        image: '',
        imagePublicId: '',
        status: 'active',
        discount: {
          percentage: 0,
          startDate: null,
          endDate: null,
          active: false,
        },
        limit: 1,
        subTreatments: [],
        membershipPricing: [],
        creditValue: 0,
        ghlCalendar: {},
        ghlService: {},
        ghlBooking: {},
        createdBy,
        locationId,
        rewardCount: 0,
        totalRewardRedemptions: 0,
        rewardValueSaved: 0,
        hasActiveRewards: false,
        popularRewardType: null,
      }

      if (dryRun) {
        stagedServiceNames.add(serviceName)
        created++
        if (created <= 5 || created % 100 === 0) {
          console.log(
            `[dry-run] row ${i + 1}: "${serviceName}" $${basePrice} ${duration}m cat="${catName}"`
          )
        }
      } else {
        await Service.create(doc)
        created++
        if (created <= 5 || created % 100 === 0) {
          console.log(`Inserted row ${i + 1}: "${serviceName}"`)
        }
      }
    } catch (e) {
      console.error(`Row ${i + 1} (${serviceName}):`, e.message || e)
      failed++
    }
  }

  console.log('---')
  const insertLabel = dryRun ? 'Would insert (new rows only)' : 'Inserted'
  console.log(
    `${insertLabel}: ${created} | skipped (already in DB for this location + name): ${skippedDup} | skipped (no service name): ${skippedNoName} | skipped (no price / range): ${skippedNoPrice} | failed: ${failed}`
  )
  if (dryRun && skipExisting && skippedDup > 0 && created === 0) {
    console.log(
      '(Tip: With --skip-existing (default), dry-run shows 0 new inserts when those services already exist. Use --no-skip-existing only if you intentionally want duplicate names.)'
    )
  }

  await mongoose.disconnect()
  console.log('Disconnected')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
