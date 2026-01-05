
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class OrderManagementService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) { }

    async findAll(storeId: number) {
        const orders = await this.prisma.order.findMany({
            where: {
                items: {
                    some: {
                        storeId: storeId,
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
                        storeId: storeId,
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

        const mappedOrders = orders.map((order) => {
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
            totalOrders: mappedOrders.length,
            orders: mappedOrders
        };
    }

    async approveOrderItem(itemId: number, storeId: number) {
        const item = await this.prisma.orderItem.findFirst({
            where: {
                id: itemId,
                storeId: storeId,
            },
            include: {
                order: true,
                product: true,
                store: true
            },
        });

        if (!item) {
            throw new NotFoundException('Order item not found or does not belong to this store');
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

        await this.notificationService.createNotification({
            userId: item.order.userId,
            type: 'ORDER_ITEM_APPROVED' as any,
            title: 'Order Item Approved',
            message: `Your item "${item.product.name}" from ${item.store.name} has been approved.`,
            orderId: item.orderId,
        });

        return updatedItem;
    }

    async rejectOrderItem(itemId: number, storeId: number, reason: string) {
        const item = await this.prisma.orderItem.findFirst({
            where: {
                id: itemId,
                storeId: storeId,
            },
            include: {
                order: true,
                product: true,
                store: true
            },
        });

        if (!item) {
            throw new NotFoundException('Order item not found or does not belong to this store');
        }

        if (item.status === 'APPROVED' || item.status === 'REJECTED') {
            throw new BadRequestException(`Item is already ${item.status.toLowerCase()}`);
        }

        const updatedItem = await this.prisma.$transaction(async (tx) => {
            const result = await tx.orderItem.update({
                where: { id: itemId },
                data: {
                    status: 'REJECTED',
                    rejectReason: reason
                } as any,
            });

            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
            });

            const parentOrder = await tx.order.findUnique({
                where: { id: item.orderId },
                include: { payments: { where: { status: 'PAID' }, take: 1 } }
            });

            if (parentOrder && parentOrder.status === 'PAID') {
                const payment = parentOrder.payments[0];
                if (payment) {
                    await tx.refund.create({
                        data: {
                            orderItemId: item.id,
                            paymentId: payment.id,
                            amount: item.quantity * item.priceAtPurchase,
                            status: 'REFUNDED',
                        }
                    });
                }
            }

            return result;
        });

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
