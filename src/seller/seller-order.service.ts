/* eslint-disable */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SellerOrderService {
    constructor(private prisma: PrismaService) { }

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
                        product: {
                            storeId: store.id,
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: {
                    where: {
                        product: {
                            storeId: store.id,
                        },
                    },
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                price: true,
                            },
                        },
                    },
                },
            },
        });

        // Calculate store-specific totals
        return orders.map((order) => {
            const storeTotal = order.items.reduce(
                (sum, item) => sum + item.priceAtPurchase * item.quantity,
                0,
            );
            return {
                ...order,
                storeTotal,
            };
        });
    }

    // =========================
    // Get single order containing seller's products
    // =========================
    async findOne(userId: number, orderId: number) {
        const store = await this.getSellerStore(userId);

        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                items: {
                    some: {
                        product: {
                            storeId: store.id,
                        },
                    },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: {
                    where: {
                        product: {
                            storeId: store.id,
                        },
                    },
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                price: true,
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found or does not contain your products');
        }

        const storeTotal = order.items.reduce(
            (sum, item) => sum + item.priceAtPurchase * item.quantity,
            0,
        );

        return {
            ...order,
            storeTotal,
        };
    }
}
