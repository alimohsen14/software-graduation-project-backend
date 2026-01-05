import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import { AdminAnalyticsService } from './admin-analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAnalyticsController {
    constructor(private readonly analyticsService: AdminAnalyticsService) { }

    @Get('users')
    async getAnalytics() {
        return this.analyticsService.getUsersAnalytics();
    }

    @Get('users/list')
    async getUsersList(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('role') role?: string,
        @Query('country') country?: string,
        @Query('search') search?: string,
    ) {
        return this.analyticsService.getUsersList({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            role,
            country,
            search,
        });
    }
}
