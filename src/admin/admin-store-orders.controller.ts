
import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    UseGuards,
    ParseIntPipe,
    NotFoundException,
} from '@nestjs/common';
import { OrderManagementService } from 'src/order/order-management.service';
import { StoreService } from 'src/store/store.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('admin/store/orders')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStoreOrdersController {
    constructor(
        private readonly orderManagementService: OrderManagementService,
        private readonly storeService: StoreService,
    ) { }

    private async getAdminStoreId(): Promise<number> {
        const store = await this.storeService.getOfficialStoreSafe();
        return store.id;
    }

    @Get()
    async findAll() {
        const storeId = await this.getAdminStoreId();
        return this.orderManagementService.findAll(storeId);
    }

    @Patch('items/:id/approve')
    async approveOrderItem(
        @Param('id', ParseIntPipe) id: number,
    ) {
        const storeId = await this.getAdminStoreId();
        return this.orderManagementService.approveOrderItem(id, storeId);
    }

    @Patch('items/:id/reject')
    async rejectOrderItem(
        @Param('id', ParseIntPipe) id: number,
        @Body('reason') reason: string,
    ) {
        const storeId = await this.getAdminStoreId();
        return this.orderManagementService.rejectOrderItem(id, storeId, reason);
    }
}
