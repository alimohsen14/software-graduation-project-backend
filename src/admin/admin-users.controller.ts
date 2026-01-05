import {
    Controller,
    Get,
    Query,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
    constructor(private readonly adminUsersService: AdminUsersService) { }

    @Get('analytics')
    async getAnalytics() {
        return this.adminUsersService.getUsersAnalytics();
    }

    @Get()
    async getUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('role') role?: string,
        @Query('country') country?: string,
        @Query('search') search?: string,
    ) {
        return this.adminUsersService.getUsersList({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            role,
            country,
            search,
        });
    }
}
