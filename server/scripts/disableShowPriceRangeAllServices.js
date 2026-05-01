/**
 * Sets showPriceRange: false on every Service document.
 * Run from server directory: node scripts/disableShowPriceRangeAllServices.js
 * Requires MONGO in server/.env
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import Service from '../models/Service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const run = async () => {
  try {
    if (!process.env.MONGO) {
      throw new Error('MONGO is not defined in environment variables')
    }

    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO)
    console.log('Connected.')

    const total = await Service.countDocuments()
    console.log(`Services in collection: ${total}`)

    const result = await Service.updateMany(
      {},
      { $set: { showPriceRange: false } }
    )

    console.log(
      `Done. Matched: ${result.matchedCount}, modified: ${result.modifiedCount}`
    )
  } catch (err) {
    console.error('Migration failed:', err)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected.')
  }
}

run()
