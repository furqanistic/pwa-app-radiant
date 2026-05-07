// File: server/scripts/generateReferralCodes.js
// Run this script once to generate referral codes for existing users

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import User from '../models/User.js'

dotenv.config()

const generateReferralCodes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO)
    console.log('Connected to MongoDB')

    // Find all users without referral codes
    const usersWithoutCodes = await User.find({
      referralCode: { $exists: false },
    }).select('_id name email referralCode')

    console.log(
      `Found ${usersWithoutCodes.length} users without referral codes`
    )

    if (usersWithoutCodes.length === 0) {
      console.log('All users already have referral codes!')
      process.exit(0)
    }

    // Generate codes for each user
    let processed = 0
    for (const user of usersWithoutCodes) {
      try {
        // The pre-save middleware will generate the code automatically
        await user.save()
        processed++
        console.log(
          `✅ Generated code for user: ${user.name} (${user.email}) - Code: ${user.referralCode}`
        )
      } catch (error) {
        console.error(
          `❌ Failed to generate code for user ${user.email}:`,
          error.message
        )
      }
    }

    console.log(
      `\n🎉 Successfully processed ${processed}/${usersWithoutCodes.length} users`
    )

    // Verify all users now have codes
    const remainingUsers = await User.countDocuments({
      referralCode: { $exists: false },
    })

    if (remainingUsers === 0) {
      console.log('✅ All users now have referral codes!')
    } else {
      console.log(`⚠️  ${remainingUsers} users still don't have referral codes`)
    }
  } catch (error) {
    console.error('Error generating referral codes:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
    process.exit(0)
  }
}

// Also handle users with null/empty referral codes
const fixEmptyReferralCodes = async () => {
  try {
    await mongoose.connect(process.env.MONGO)
    console.log('Connected to MongoDB')

    // Find users with null, empty, or missing referral codes
    const usersToFix = await User.find({
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: '' },
        { referralCode: { $in: [null, ''] } },
      ],
    }).select('_id name email referralCode')

    console.log(
      `Found ${usersToFix.length} users with missing/empty referral codes`
    )

    for (const user of usersToFix) {
      try {
        // Clear the referralCode so pre-save middleware generates a new one
        user.referralCode = undefined
        await user.save()
        console.log(
          `✅ Fixed referral code for: ${user.name} - New code: ${user.referralCode}`
        )
      } catch (error) {
        console.error(`❌ Failed to fix user ${user.email}:`, error.message)
      }
    }
  } catch (error) {
    console.error('Error fixing empty referral codes:', error)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

// Run the appropriate function based on command line argument
const command = process.argv[2]
if (command === 'fix-empty') {
  fixEmptyReferralCodes()
} else {
  generateReferralCodes()
}
