import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const migrateRoles = async () => {
  try {
    if (!process.env.MONGO) {
      throw new Error('MONGO is not defined in environment variables')
    }

    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO)
    console.log('Connected to MongoDB')

    // 1. Update users with role 'team' to 'spa'
    console.log('Finding users with role "team"...')
    const updateResult = await User.updateMany(
      { role: 'team' },
      { $set: { role: 'spa' } }
    )

    console.log(`Migration complete. Updated ${updateResult.modifiedCount} users from "team" to "spa".`)

    // 2. Verify update
    const remainingTeamUsers = await User.countDocuments({ role: 'team' })
    const newSpaUsers = await User.countDocuments({ role: 'spa' })

    console.log(`Remaining "team" users: ${remainingTeamUsers}`)
    console.log(`Total "spa" users: ${newSpaUsers}`)

    if (remainingTeamUsers === 0 && updateResult.modifiedCount > 0) {
      console.log('SUCCESS: All team roles migrated to spa.')
    } else if (updateResult.modifiedCount === 0) {
      console.log('NOTICE: No users found with role "team" to migrate.')
    } else {
      console.warn('WARNING: Some team users might remain.')
    }

  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
    process.exit()
  }
}

migrateRoles()
