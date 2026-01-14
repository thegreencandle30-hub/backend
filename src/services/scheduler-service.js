import cron from 'node-cron';
import User from '../models/User.js';
import SubscriptionQueue from '../models/SubscriptionQueue.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { sendToUser } from './notification-service.js';
import logger from '../utils/logger.js';
import moment from 'moment-timezone';

/**
 * Initialize all scheduled tasks
 */
export const initSchedulers = () => {
    // Run every 15 minutes to check for plan rotations and reminders
    cron.schedule('*/15 * * * *', async () => {
        logger.debug('Running subscription scheduler task...');
        await checkExpiriesAndReminders();
    });
};

/**
 * Main logic for checking expired plans and sending reminders
 */
async function checkExpiriesAndReminders() {
    try {
        const now = new Date();

        // 1. Process Expired Plans
        const expiredPlans = await SubscriptionQueue.find({
            status: 'active',
            expiryDate: { $lte: now }
        });

        for (const expired of expiredPlans) {
            // Mark current as completed
            expired.status = 'completed';
            await expired.save();

            // Find next pending plan
            const nextPlan = await SubscriptionQueue.findOne({
                user: expired.user,
                status: 'pending',
                queuePosition: expired.queuePosition + 1
            }).populate('planId');

            if (nextPlan) {
                // Activate next plan
                nextPlan.status = 'active';
                nextPlan.activationDate = new Date();
                
                const activationDate = nextPlan.activationDate;
                const expiryDate = moment(activationDate).add(nextPlan.planId.durationDays, 'days').toDate();
                
                nextPlan.expiryDate = expiryDate;
                await nextPlan.save();

                // Update User model
                await User.findByIdAndUpdate(expired.user, {
                    subscription: {
                        planTier: nextPlan.planId.tier,
                        startDate: activationDate,
                        endDate: expiryDate,
                        isActive: true,
                        maxTargetsVisible: nextPlan.planId.maxTargetsVisible,
                        reminderHours: nextPlan.planId.reminderHours,
                        reminderSent: false
                    }
                });

                logger.info(`Activated next plan (${nextPlan.planId.name}) in queue for user ${expired.user}`);
            } else {
                // No more plans, deactivate subscription in User model
                await User.findByIdAndUpdate(expired.user, {
                    'subscription.isActive': false
                });
                logger.info(`User ${expired.user} subscription expired with no pending plans.`);
            }
        }

        // 2. Send Reminders
        const activePlans = await SubscriptionQueue.find({ status: 'active' }).populate('planId');
        for (const entry of activePlans) {
            const user = await User.findById(entry.user);
            if (!user || !user.fcmToken) continue;

            const reminderHours = entry.planId.reminderHours || 24;
            const reminderTime = moment(entry.expiryDate).subtract(reminderHours, 'hours');
            
            // If we are within the 15-min window of the reminder time
            if (moment().isBetween(reminderTime, moment(reminderTime).add(16, 'minutes'))) {
                await sendToUser(user.fcmToken, {
                    title: 'Subscription Expiring Soon!',
                    body: `Your ${entry.planId.name} subscription will expire in ${reminderHours} hours. Renew now to stay updated!`
                });
                logger.debug(`Sent expiry reminder to user ${user._id}`);
            }
        }

    } catch (error) {
        logger.error('Error in checkExpiriesAndReminders:', error);
    }
}
