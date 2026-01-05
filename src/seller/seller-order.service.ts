/* eslint-disable */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import { OrderItemStatus } from '@prisma/client';
import { OrderManagementService } from 'src/order/order-management.service';

@Injectable()
export class SellerOrderService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private orderManagementService: OrderManagementService,
    ) { }

    // =========================
    // Get seller's store
    // =========================
    private async getSellerStore(userId: number) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
        });

        if (!store) {
            throw new NotFoundException('You do not have a store');
        }

        return store;
    }

    // =========================
    // Get orders containing seller's products
    // =========================
    async findAll(userId: number) {
        const store = await this.getSellerStore(userId);
        return this.orderManagementService.findAll(store.id);
    }

    // =========================
    // Update Order Item Status
    // =========================
    // =========================
    // Approve Order Item
    // =========================
    async approveOrderItem(itemId: number, userId: number) {
        const store = await this.getSellerStore(userId);
        return this.orderManagementService.approveOrderItem(itemId, store.id);
    }

    // =========================
    // Reject Order Item
    // =========================
    async rejectOrderItem(itemId: number, userId: number, reason: string) {
        const store = await this.getSellerStore(userId);
        return this.orderManagementService.rejectOrderItem(itemId, store.id, reason);
    }
}
