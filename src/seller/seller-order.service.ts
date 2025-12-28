/* eslint-disable */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import { OrderItemStatus } from '@prisma/client';

@Injectable()
export class SellerOrderService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
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

        // Find orders that contain products from this store
        const orders = await this.prisma.order.findMany({
            where: {
                items: {
                    some: {
                        storeId: store.id, // Scoped to items in this store
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
                items: {
                    where: {
                        storeId: store.id, // ONLY return items for THIS seller's store
                    },
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        // totalOrders is the count of distinct orders found
        const totalOrders = orders.length;

        // Map to exact requested frontend shape
        const mappedOrders = orders.map((order) => {
            // Temporary debug log as requested
            console.log("Seller Order Customer:", {
                orderId: order.id,
                phone: order.phone,
                city: order.city
            });

            return {
                orderId: order.id,
                createdAt: order.createdAt,
                orderStatus: order.status,
                customer: {
                    name: order.user?.name || null,
                    phone: order.phone || null,
                    city: order.city || null,
                    address: order.address || null
                },
                items: order.items.map(item => {
                    // Debug log to confirm id is included
                    console.log("OrderItem.id returned:", item.id);

                    return {
                        id: item.id,
                        productId: item.productId,
                        productName: item.product.name,
                        quantity: item.quantity,
                        priceAtPurchase: item.priceAtPurchase,
                        status: item.status,
                        rejectReason: (item as any).rejectReason || null
                    };
                }),
            };
        });

        return {
            totalOrders,
            orders: mappedOrders
        };
    }

    // =========================
    // Update Order Item Status
    // =========================
    // =========================
    // Approve Order Item
    // =========================
    async approveOrderItem(itemId: number, userId: number) {
        const store = await this.getSellerStore(userId);

        const item = await this.prisma.orderItem.findFirst({
            where: {
                id: itemId,
                storeId: store.id,
            },
            include: {
                order: true,
                product: true,
                store: true
            },
        });

        if (!item) {
            throw new NotFoundException('Order item not found or does not belong to your store');
        }

        if (item.status === 'APPROVED' || item.status === 'REJECTED') {
            throw new BadRequestException(`Item is already ${item.status.toLowerCase()}`);
        }

        const updatedItem = await this.prisma.orderItem.update({
            where: { id: itemId },
            data: {
                status: 'APPROVED',
                rejectReason: null
            } as any,
        });

        // Notify Buyer
        await this.notificationService.createNotification({
            userId: item.order.userId,
            type: 'ORDER_ITEM_APPROVED' as any, // Cast to any because prisma client might not have synced yet
            title: 'Order Item Approved',
            message: `Your item "${item.product.name}" from ${item.store.name} has been approved.`,
            orderId: item.orderId,
        });

        return updatedItem;
    }

    // =========================
    // Reject Order Item
    // =========================
    async rejectOrderItem(itemId: number, userId: number, reason: string) {
        const store = await this.getSellerStore(userId);

        const item = await this.prisma.orderItem.findFirst({
            where: {
                id: itemId,
                storeId: store.id,
            },
            include: {
                order: true,
                product: true,
                store: true
            },
        });

        if (!item) {
            throw new NotFoundException('Order item not found or does not belong to your store');
        }

        if (item.status === 'APPROVED' || item.status === 'REJECTED') {
            throw new BadRequestException(`Item is already ${item.status.toLowerCase()}`);
        }

        const updatedItem = await this.prisma.$transaction(async (tx) => {
            // Update status and save reason
            const result = await tx.orderItem.update({
                where: { id: itemId },
                data: {
                    status: 'REJECTED',
                    rejectReason: reason
                } as any,
            });

            // Restore stock
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
            });

            return result;
        });

        // Notify Buyer
        await this.notificationService.createNotification({
            userId: item.order.userId,
            type: 'ORDER_ITEM_REJECTED' as any,
            title: 'Order Item Rejected',
            message: `Your item "${item.product.name}" from ${item.store.name} was rejected: ${reason}`,
            orderId: item.orderId,
        });

        return updatedItem;
    }
}
