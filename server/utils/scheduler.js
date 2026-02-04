
import cron from 'node-cron';
import Location from '../models/Location.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Run every day at 9:00 AM
export const initScheduler = () => {
  console.log('📅 Scheduler initialized. Birthday check scheduled for 9:00 AM daily.');
  
  // Schedule task to run at 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log('🎂 Running daily birthday check...');
    try {
      await checkBirthdays();
    } catch (error) {
      console.error('❌ Error running birthday check:', error);
    }
  });
};

const checkBirthdays = async () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate(); // 1-31

    try {
        // 1. Find users whose birthday matches today (ignoring year)
        // MongoDB aggregation to match day and month
        const birthdayUsers = await User.find({
            $expr: {
                $and: [
                    { $eq: [{ $month: '$dateOfBirth' }, currentMonth] },
                    { $eq: [{ $dayOfMonth: '$dateOfBirth' }, currentDay] }
                ]
            },
            isDeleted: false
        });

        if (birthdayUsers.length === 0) {
            console.log('No birthdays found today.');
            return;
        }

        console.log(`🎉 Found ${birthdayUsers.length} users with birthdays today.`);

        // 2. Process each user
        for (const user of birthdayUsers) {
            // Determine user's location (spaLocation for team, selectedLocation for user)
            // Logic adapted from User.js getRelevantLocation method
            let locationId = null;

            if (user.role === 'team') {
                locationId = user.spaLocation?.locationId;
            } else if (user.role === 'user') {
                locationId = user.selectedLocation?.locationId;
            }

            if (!locationId) continue;

            // 3. Check if location has active birthday gift
            // We need to find the actual Location document to get the settings
            // The user model stores locationId as string, Location model stores it as string in locationId field
            const locationConfig = await Location.findOne({ 
                locationId: locationId,
                isActive: true
            });

            if (!locationConfig || !locationConfig.birthdayGift?.isActive) {
                continue;
            }

            const giftSettings = locationConfig.birthdayGift;

            // 4. Create notification
            // Check if notification already exists for today to prevent duplicates (idempotency)
            const startOfDay = new Date(today.setHours(0,0,0,0));
            const endOfDay = new Date(today.setHours(23,59,59,999));

            const existingNotif = await Notification.findOne({
                recipient: user._id,
                category: 'game_reward', // or 'promotion' - using game_reward as it implies a gift/reward
                createdAt: { $gte: startOfDay, $lte: endOfDay },
                'metadata.isBirthdayGift': true
            });

            if (existingNotif) {
                console.log(`Skipping ${user.email} - Notification already sent.`);
                continue;
            }

            // Create new notification
            await Notification.create({
                recipient: user._id,
                type: 'system',
                title: 'Happy Birthday! 🎁',
                message: giftSettings.message || "We have a special gift waiting for you!",
                priority: 'high',
                category: 'game_reward',
                metadata: {
                    isBirthdayGift: true,
                    giftType: giftSettings.giftType || "free",
                    giftValue: giftSettings.value || 0,
                    serviceId: giftSettings.serviceId,
                    voiceNoteUrl: giftSettings.voiceNoteUrl,
                    giftDate: new Date()
                }
            });

            console.log(`✅ Birthday notification sent to ${user.email}`);
        }

    } catch (error) {
        console.error('Error in checkBirthdays:', error);
    }
};
