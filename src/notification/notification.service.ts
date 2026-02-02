import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { PushNotificationService } from '../firebase/push-notification.service';
import { UsersService } from '../users_temp/users.service';

@Injectable()
export class NotificationService {
    constructor(
        private prisma: PrismaService,
        private pushNotificationService: PushNotificationService,
        private usersService: UsersService,
    ) { }

    /**
     * Create a new notification for a user and send a push notification
     */
    async createNotification(data: {
        userId: number;
        type: NotificationType;
        title: string;
        message: string;
        orderId?: number;
    }) {
        // 1. Create DB Notification
        const notification = await this.prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                orderId: data.orderId,
            },
        });

        // 2. Send Firebase Push Notification (Non-blocking)
        this.sendPushToUser(data.userId, {
            title: data.title,
            body: data.message,
            data: {
                type: data.type,
                orderId: data.orderId?.toString() || '',
                notificationId: notification.id.toString(),
            }
        }).catch(err => console.error('Failed to send push notification:', err));

        // 3. Push to Firebase Realtime Database
        this.pushNotificationService.pushRealtimeToUser(data.userId, {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            orderId: notification.orderId,
            isRead: false,
            createdAt: notification.createdAt.toISOString(),
        }).catch(err => console.error('Failed to push realtime notification:', err));

        return notification;
    }

    /**
     * Helper to send push notifications to all user device tokens
     */
    private async sendPushToUser(userId: number, payload: { title: string; body: string; data?: Record<string, string> }) {
        try {
            const tokens = await this.usersService.getUserTokens(userId);
            if (tokens.length === 0) return;

            console.log(`📡 Dispatching push to user ${userId} (${tokens.length} devices)`);
            const result = await this.pushNotificationService.sendToMany(tokens, payload);

            if (result.failureCount > 0) {
                console.warn(`⚠️ Push partial success for user ${userId}: ${result.successCount} sent, ${result.failureCount} failed.`);
            }
        } catch (error) {
            console.error(`🔴 Fatal error in sendPushToUser for user ${userId}:`, error.message);
        }
    }

    /**
     * Create an Admin Notification and send push to all admins
     */
    async createAdminNotification(data: { title: string; body: string }) {
        // 1. Create DB Admin Notification
        const adminNotification = await this.prisma.adminNotification.create({
            data: {
                title: data.title,
                body: data.body,
            },
        });

        // 2. Send Push to all Admins (Non-blocking)
        this.sendPushToAdmins({
            title: data.title,
            body: data.body,
            data: {
                is_admin_alert: 'true',
                id: adminNotification.id,
            }
        }).catch(err => console.error('🔴 Failed to send admin push notification:', err));

        // 3. Push to Admin Realtime Channel
        this.pushNotificationService.pushRealtimeToAdmins({
            id: adminNotification.id,
            title: adminNotification.title,
            body: adminNotification.body,
            isRead: false,
            createdAt: adminNotification.createdAt.toISOString(),
        }).catch(err => console.error('Failed to push admin realtime notification:', err));

        return adminNotification;
    }

    /**
     * Helper to fetch all admins and send push notifications
     */
    private async sendPushToAdmins(payload: { title: string; body: string; data?: Record<string, string> }) {
        try {
            const tokens = await this.usersService.getAllAdminTokens();
            if (tokens.length === 0) {
                console.log('🛡️ No admin device tokens found.');
                return;
            }

            console.log(`🛡️ Dispatching admin push to ${tokens.length} tokens`);
            const result = await this.pushNotificationService.sendToMany(tokens, payload);

            if (result.failureCount > 0) {
                console.warn(`⚠️ Admin push partial success: ${result.successCount} sent, ${result.failureCount} failed.`);
            }
        } catch (error) {
            console.error('🔴 Error in sendPushToAdmins:', error.message);
        }
    }

    /**
     * Get all notifications for a user, ordered by newest first
     */
    async getUserNotifications(userId: number) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                order: {
                    select: {
                        id: true,
                        total: true,
                        status: true,
                        adminStatus: true,
                    },
                },
            },
        });
    }

    /**
     * Get count of unread notifications for a user
     */
    async getUnreadCount(userId: number): Promise<number> {
        return this.prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(userId: number, notificationId: number) {
        const update = await this.prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId, // Ensures user can only mark their own notifications
            },
            data: { isRead: true },
        });

        // Cleanup realtime node if update was successful
        if (update.count > 0) {
            this.pushNotificationService.removeRealtimeNotification(userId, notificationId)
                .catch(err => console.error('Failed to remove realtime notification:', err));
        }

        return update;
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: number) {
        const update = await this.prisma.notification.updateMany({
            where: { userId },
            data: { isRead: true },
        });

        // Cleanup all realtime nodes for user
        this.pushNotificationService.clearRealtimeNotifications(userId)
            .catch(err => console.error('Failed to clear realtime notifications:', err));

        return update;
    }
}
