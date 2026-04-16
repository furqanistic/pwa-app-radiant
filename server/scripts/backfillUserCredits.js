import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const backfillUserCredits = async () => {
  try {
    if (!process.env.MONGO) {
      throw new Error('MONGO is not defined in environment variables')
    }

    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO)
    console.log('Connected to MongoDB')

    const existingUsers = await User.countDocuments()
    console.log(`Found ${existingUsers} total users.`)

    const updateResult = await User.updateMany({}, { $set: { credits: 0 } })

    console.log(
      `Credits backfill complete. Matched ${updateResult.matchedCount} users and updated ${updateResult.modifiedCount} users.`
    )
  } catch (error) {
    console.error('Credits backfill failed:', error)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

backfillUserCredits()
