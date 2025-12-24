/* eslint-disable */
import {
    Controller,
    Get,
    Patch,
    Param,
    UseGuards,
    Req,
    ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    /**
     * Get all notifications for the authenticated user
     */
    @Get()
    async getNotifications(@Req() req) {
        const userId = req.user.id;
        return this.notificationService.getUserNotifications(userId);
    }

    /**
     * Get count of unread notifications
     */
    @Get('unread')
    async getUnreadCount(@Req() req) {
        const userId = req.user.id;
        const count = await this.notificationService.getUnreadCount(userId);
        return { unreadCount: count };
    }

    /**
     * Mark a single notification as read
     */
    @Patch(':id/read')
    async markAsRead(@Req() req, @Param('id', ParseIntPipe) id: number) {
        const userId = req.user.id;
        await this.notificationService.markAsRead(userId, id);
        return { success: true };
    }

    /**
     * Mark all notifications as read
     */
    @Patch('read-all')
    async markAllAsRead(@Req() req) {
        const userId = req.user.id;
        await this.notificationService.markAllAsRead(userId);
        return { success: true };
    }
}
