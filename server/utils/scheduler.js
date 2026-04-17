
import dotenv from 'dotenv';
import cron from 'node-cron';
import webpush from 'web-push';
import Booking from '../models/Booking.js';
import Location from '../models/Location.js';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';

dotenv.config()

const hasVapidKeys = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
)

if (hasVapidKeys) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_MAILTO || 'your-email@example.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

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

  // Review reminder check every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('⭐ Running review reminder check...')
    try {
      await sendDueReviewReminders()
    } catch (error) {
      console.error('❌ Error running review reminder check:', error)
    }
  })
};

const sendDueReviewReminders = async () => {
  const now = new Date()
  const candidates = await Booking.find({
    paymentStatus: 'paid',
    status: { $nin: ['cancelled', 'no-show'] },
    $or: [{ rating: null }, { rating: { $exists: false } }],
    reviewReminderSentAt: null,
    date: { $lte: now },
  })
    .select('_id userId serviceId serviceName date time reviewReminderSentAt rating paymentStatus status')
    .lean()

  if (candidates.length === 0) {
    return
  }

  const candidateUserIds = Array.from(
    new Set(candidates.map((booking) => `${booking.userId || ''}`).filter(Boolean))
  )
  const activeSubscriptions = candidateUserIds.length
    ? await PushSubscription.find({
        user: { $in: candidateUserIds },
        isActive: true,
      })
        .select('user endpoint p256dh auth')
        .lean()
    : []
  const subscriptionsByUserId = activeSubscriptions.reduce((acc, subscription) => {
    const userKey = `${subscription.user || ''}`
    if (!userKey) return acc
    if (!acc.has(userKey)) acc.set(userKey, [])
    acc.get(userKey).push(subscription)
    return acc
  }, new Map())

  let remindersSent = 0
  let pushSent = 0
  for (const booking of candidates) {
    const canRate = Booking.canRateBooking(booking)
    if (!canRate) continue

    const inAppNotification = await Notification.create({
      recipient: booking.userId,
      type: 'system',
      title: `How was your ${booking.serviceName || 'service'}?`,
      message: 'Please rate your recent appointment and share your feedback.',
      priority: 'normal',
      category: 'general',
      metadata: {
        type: 'service_review_prompt',
        bookingId: booking._id,
        serviceId: booking.serviceId,
        actionPath: '/bookings?tab=history',
      },
    })

    if (hasVapidKeys) {
      const userSubscriptions = subscriptionsByUserId.get(`${booking.userId || ''}`) || []
      if (userSubscriptions.length > 0) {
        const payload = {
          title: `How was your ${booking.serviceName || 'service'}?`,
          body: 'Tap to leave a quick rating and feedback.',
          icon: '/favicon_io/android-chrome-192x192.png',
          badge: '/favicon_io/android-chrome-192x192.png',
          tag: `service-review-${booking._id}`,
          requireInteraction: false,
          data: {
            url: '/bookings?tab=history',
            notificationId: inAppNotification?._id || null,
            bookingId: booking._id,
            serviceId: booking.serviceId,
          },
        }

        for (const subscription of userSubscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              JSON.stringify(payload)
            )
            pushSent += 1
          } catch (pushError) {
            const statusCode = pushError?.statusCode
            if (statusCode === 404 || statusCode === 410) {
              await PushSubscription.updateOne(
                { endpoint: subscription.endpoint },
                { $set: { isActive: false } }
              )
            }
            console.error('Failed to send review reminder push:', pushError?.message || pushError)
          }
        }
      }
    }

    await Booking.updateOne(
      { _id: booking._id, reviewReminderSentAt: null },
      { $set: { reviewReminderSentAt: now } }
    )
    remindersSent += 1
  }

  if (remindersSent > 0) {
    console.log(
      `✅ Sent ${remindersSent} review reminder notifications (${pushSent} push deliveries).`
    )
  }
}

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
            // Determine user's location (spaLocation for spa, selectedLocation for user)
            // Logic adapted from User.js getRelevantLocation method
            let locationId = null;

            if (user.role === 'spa') {
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
