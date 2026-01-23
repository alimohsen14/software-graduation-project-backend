import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    /**
     * Register or update a device token for push notifications
     */
    @Post('push-token')
    @UseGuards(JwtAuthGuard)
    async registerPushToken(@Req() req: any, @Body() body: { token: string; platform?: string }) {
        const userId = req.user.id;

        if (!body.token) {
            return { success: false, message: 'Token is required' };
        }

        try {
            await this.usersService.savePushToken(userId, body.token, body.platform || 'web');
            return { success: true };
        } catch (error) {
            console.error(`Failed to register push token for user ${userId}:`, error);
            // Return 200 with error message to prevent client crashes/retries loop if it's a non-retriable error
            return { success: false, message: 'Internal Server Error saving token' };
        }
    }
}
