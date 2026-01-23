import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushNotificationService {
    constructor(
        @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: admin.app.App,
        private prisma: PrismaService,
    ) { }

    /**
     * Send push notifications to multiple FCM tokens
     */
    async sendToMany(
        tokens: string[],
        payload: { title: string; body: string; data?: Record<string, string> },
    ): Promise<{ successCount: number; failureCount: number }> {
        if (!tokens || tokens.length === 0) {
            return { successCount: 0, failureCount: 0 };
        }

        try {
            const response = await this.firebaseAdmin.messaging().sendEachForMulticast({
                tokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data,
            });

            let failureCount = response.failureCount;
            let successCount = response.successCount;

            if (failureCount > 0) {
                const tokensToRemove: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error as any;
                        const errorCode = error?.code || error?.errorInfo?.code;
                        if (
                            errorCode === 'messaging/registration-token-not-registered' ||
                            errorCode === 'messaging/invalid-registration-token'
                        ) {
                            tokensToRemove.push(tokens[idx]);
                        }
                    }
                });

                if (tokensToRemove.length > 0) {
                    console.log(`🗑️ Removing ${tokensToRemove.length} invalid FCM tokens from database`);
                    await this.prisma.userDeviceToken.deleteMany({
                        where: { token: { in: tokensToRemove } },
                    }).catch(e => console.error('Failed to delete invalid tokens:', e));
                }
            }

            console.log(`📡 Push summary: ${successCount} sent, ${failureCount} failed.`);
            return { successCount, failureCount };
        } catch (error) {
            console.error('Multicast Send Error:', error);
            return { successCount: 0, failureCount: tokens.length };
        }
    }

    /**
     * Send a push notification to a specific FCM token
     */
    async sendToToken(
        token: string,
        payload: { title: string; body: string; data?: Record<string, string> },
    ): Promise<string | null> {
        if (!token || token.trim() === '') {
            throw new BadRequestException('FCM token is required and cannot be empty');
        }

        try {
            const response = await this.firebaseAdmin.messaging().send({
                token,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data,
            });

            return response; // Returns the messageId
        } catch (error: any) {
            // Handle invalid tokens by removing them from DB
            const errorCode = error.code || error.errorInfo?.code;
            if (
                errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token'
            ) {
                console.log(`🗑️ Removing invalid FCM token from database: ${token.substring(0, 10)}...`);
                await this.prisma.userDeviceToken.deleteMany({
                    where: { token },
                }).catch(e => console.error('Failed to delete invalid token:', e));
            }

            console.error('FCM Send Error:', errorCode, error.message);
            // throw error; // Don't throw, just log.
            return null;
        }
    }

    // ------------------------------------------------------------------
    // REALTIME DATABASE / FIRESTORE HANDLERS
    // ------------------------------------------------------------------

    /**
     * Push a notification to the user's realtime channel.
     * Tries Firebase Realtime Database first, falls back to Firestore.
     */
    async pushRealtimeToUser(userId: number, payload: any) {
        const pathRef = `realtime-notifications/users/${userId}/${payload.id}`;
        try {
            await this.firebaseAdmin.database().ref(pathRef).set(payload);
            console.log(`✅ [RealtimeDB] Pushed to user ${userId}`);
        } catch (dbError) {
            console.error(`🔴 [RealtimeDB] Failed to push to user ${userId}:`, dbError.message);
        }
    }

    /**
     * Push a notification to the admins' realtime channel.
     */
    async pushRealtimeToAdmins(payload: any) {
        const pathRef = `realtime-notifications/admins/${payload.id}`;
        try {
            await this.firebaseAdmin.database().ref(pathRef).set(payload);
            console.log(`✅ [RealtimeDB] Pushed to admins`);
        } catch (dbError) {
            console.error(`🔴 [RealtimeDB] Failed to push to admins:`, dbError.message);
        }
    }

    /**
     * Remove a specific notification from realtime storage.
     */
    async removeRealtimeNotification(userId: number, notificationId: number) {
        const pathRef = `realtime-notifications/users/${userId}/${notificationId}`;
        try {
            await this.firebaseAdmin.database().ref(pathRef).remove();
        } catch (dbError) {
            console.error(`🔴 Failed to remove notification ${notificationId}:`, dbError.message);
        }
    }

    /**
     * Clear all realtime notifications for a user (e.g. on "Mark All Read").
     */
    async clearRealtimeNotifications(userId: number) {
        const pathRef = `realtime-notifications/users/${userId}`;
        try {
            await this.firebaseAdmin.database().ref(pathRef).remove();
        } catch (dbError) {
            console.error(`🔴 Failed to clear notifications for ${userId}:`, dbError.message);
        }
    }
}
