import {
    Controller,
    Post,
    Body,
    NotFoundException,
} from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';

@Controller('dev/firebase')
export class FirebaseTestController {
    constructor(private readonly pushNotificationService: PushNotificationService) { }

    /**
     * Diagnostic endpoint for testing push notifications.
     * Restricted to non-production environments.
     */
    @Post('test')
    async testPush(@Body() body: { token: string; title: string; body: string }) {
        // Strict guard against production use
        if (process.env.NODE_ENV === 'production') {
            throw new NotFoundException('Diagnostic endpoint is disabled in production');
        }

        const { token, title, body: notificationBody } = body;

        const messageId = await this.pushNotificationService.sendToToken(token, {
            title,
            body: notificationBody,
        });

        return {
            success: true,
            messageId,
        };
    }
}
