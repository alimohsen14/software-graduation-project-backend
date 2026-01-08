import { Controller, Get, Post, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminStoresSupervisionService } from './admin-stores-supervision.service';

@Controller('admin/supervision')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStoresSupervisionController {
    constructor(private readonly supervisionService: AdminStoresSupervisionService) { }

    @Get('overview')
    async getOverview() {
        return this.supervisionService.getOverview();
    }

    @Get('stores')
    async findAllStores(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: 'all' | 'active' | 'inactive',
        @Query('category') category?: string,
        @Query('search') search?: string,
    ) {
        return this.supervisionService.findAllStores({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
            status,
            category,
            search,
        });
    }

    @Get('stores/:id')
    async getStoreDetails(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.supervisionService.getStoreDetails(id);
    }

    @Post('stores/:id/warning')
    async sendWarning(
        @Param('id', ParseIntPipe) id: number,
        @Body('message') message: string,
    ) {
        return this.supervisionService.sendWarning(id, message);
    }

    @Post('stores/:id/deactivate')
    async deactivateStore(
        @Param('id', ParseIntPipe) id: number,
        @Body('reason') reason?: string,
    ) {
        return this.supervisionService.deactivateStore(id, reason);
    }

    @Post('stores/:id/activate')
    async activateStore(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.supervisionService.activateStore(id);
    }
}
