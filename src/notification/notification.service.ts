/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new notification for a user
     */
    async createNotification(data: {
        userId: number;
        type: NotificationType;
        title: string;
        message: string;
        orderId?: number;
    }) {
        return this.prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                orderId: data.orderId,
            },
        });
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
        return this.prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId, // Ensures user can only mark their own notifications
            },
            data: { isRead: true },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: number) {
        return this.prisma.notification.updateMany({
            where: { userId },
            data: { isRead: true },
        });
    }
}
