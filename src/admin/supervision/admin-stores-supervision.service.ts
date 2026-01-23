import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { OrderItemStatus, StoreType } from '@prisma/client';

@Injectable()
export class AdminStoresSupervisionService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) { }

    // SUCCESSFUL_ITEM_STATUSES
    private readonly SUCCESSFUL_STATUSES = [
        OrderItemStatus.APPROVED,
        OrderItemStatus.SHIPPED,
        OrderItemStatus.DELIVERED,
    ];

    /**
     * DASHBOARD OVERVIEW (STORE-CENTRIC)
     */
    async getOverview() {
        const [totalStores, activeStores, inactiveStores] = await Promise.all([
            this.prisma.store.count(),
            this.prisma.store.count({ where: { isActive: true } }),
            this.prisma.store.count({ where: { isActive: false } }),
        ]);

        // Calculate top store by revenue
        const storeRevenues = await this.prisma.orderItem.groupBy({
            by: ['storeId'],
            _sum: {
                priceAtPurchase: true,
                quantity: true,
            },
            _count: {
                orderId: true,
            },
            where: {
                status: { in: this.SUCCESSFUL_STATUSES },
            },
        });

        let topStore: any = null;
        if (storeRevenues.length > 0) {
            // Calculate revenue for each store and find the top one
            const storesWithRevenue = storeRevenues.map(sr => ({
                storeId: sr.storeId,
                revenue: (sr._sum.priceAtPurchase ?? 0) * (sr._sum.quantity ?? 0),
                ordersCount: sr._count.orderId,
            })).sort((a, b) => b.revenue - a.revenue);

            const topStoreData = storesWithRevenue[0];

            // Fetch store details
            const store = await this.prisma.store.findUnique({
                where: { id: topStoreData.storeId },
                select: { id: true, name: true },
            });

            if (store) {
                topStore = {
                    storeId: store.id,
                    storeName: store.name,
                    revenue: topStoreData.revenue,
                    ordersCount: topStoreData.ordersCount,
                };
            }
        }

        return {
            totalStores,
            activeStores,
            inactiveStores,
            topStore,
        };
    }

    /**
     * STORES LIST (PAGINATED)
     */
    async findAllStores(query: {
        page?: number;
        limit?: number;
        status?: 'all' | 'active' | 'inactive';
        category?: string;
        search?: string;
    }) {
        const { page = 1, limit = 10, status = 'all', category, search } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (status === 'active') where.isActive = true;
        if (status === 'inactive') where.isActive = false;

        if (category) {
            where.products = { some: { category, isActive: true } };
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { owner: { name: { contains: search, mode: 'insensitive' } } },
                { owner: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [stores, total] = await Promise.all([
            this.prisma.store.findMany({
                where,
                skip,
                take: limit,
                include: {
                    owner: { select: { id: true, name: true, email: true } },
                    _count: { select: { products: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.store.count({ where }),
        ]);

        if (stores.length === 0) {
            return { data: [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
        }

        const storeIds = stores.map(s => s.id);

        // Dominant category per store
        // We still need this for the "Role" column
        const storeCategories = await this.prisma.product.groupBy({
            by: ['storeId', 'category'],
            _count: { id: true },
            where: { storeId: { in: storeIds }, isActive: true },
            orderBy: { _count: { id: 'desc' } }
        });

        const categoryMap = storeCategories.reduce((acc, sc) => {
            if (!acc[sc.storeId]) acc[sc.storeId] = sc.category; // First one is dominant due to order
            return acc;
        }, {} as Record<number, string>);

        const data = stores.map(s => ({
            id: s.id,
            name: s.name,
            isActive: s.isActive,
            category: categoryMap[s.id] || null,
            owner: s.owner,
            createdAt: s.createdAt.toISOString()
        }));

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * STORE DETAILS
     */
    async getStoreDetails(id: number) {
        const store = await this.prisma.store.findUnique({
            where: { id },
            include: { owner: { select: { id: true, name: true, email: true } } }
        });

        if (!store) throw new NotFoundException('Store not found');

        // Best Seller (Highest Quantity Sold)
        const bestSellerAggregation = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            where: { storeId: id, status: { in: this.SUCCESSFUL_STATUSES } },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 1
        });

        let bestSeller: any = null;
        if (bestSellerAggregation.length > 0) {
            const best = bestSellerAggregation[0];
            const product = await this.prisma.product.findUnique({ where: { id: best.productId } });
            if (product) {
                bestSeller = {
                    productId: product.id,
                    name: product.name,
                    soldCount: best._sum.quantity ?? 0
                };
            }
        }

        // Monthly Sales (Current Calendar Month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyItems = await this.prisma.orderItem.findMany({
            where: {
                storeId: id,
                status: { in: this.SUCCESSFUL_STATUSES },
                order: { createdAt: { gte: startOfMonth } }
            },
            select: { priceAtPurchase: true, quantity: true }
        });

        const monthlySales = monthlyItems.reduce((acc, item) => {
            acc.soldCount += item.quantity;
            acc.revenue += item.priceAtPurchase * item.quantity;
            return acc;
        }, { soldCount: 0, revenue: 0 });

        // Products (All, plain array)
        const products = await this.prisma.product.findMany({
            where: { storeId: id },
            orderBy: { createdAt: 'desc' }
        });

        // Orders (All, plain array)
        const orderItems = await this.prisma.orderItem.findMany({
            where: { storeId: id },
            include: {
                order: { select: { id: true, createdAt: true } },
                product: { select: { name: true } }
            },
            orderBy: { order: { createdAt: 'desc' } }
        });

        return {
            id: store.id,
            name: store.name,
            isActive: store.isActive,
            bestSeller,
            monthlySales,
            products,
            orders: orderItems.map(oi => ({
                id: oi.id,
                orderId: oi.orderId,
                productId: oi.productId,
                productName: oi.product.name,
                quantity: oi.quantity,
                unitPrice: oi.priceAtPurchase,
                totalPrice: Number((oi.priceAtPurchase * oi.quantity).toFixed(2)), // Numeric total
                status: oi.status,
                createdAt: oi.order.createdAt.toISOString()
            }))
        };
    }

    /**
     * SEND WARNING (No status change)
     */
    async sendWarning(id: number, message: string) {
        const store = await this.prisma.store.findUnique({
            where: { id },
            select: { ownerId: true, name: true }
        });

        if (!store) throw new NotFoundException('Store not found');

        await this.notificationService.createNotification({
            userId: store.ownerId,
            type: 'STORE_WARNING',
            title: 'Admin Warning',
            message: message,
        });

        return { success: true, message: 'Warning sent to store owner' };
    }

    /**
     * DEACTIVATE STORE
     */
    async deactivateStore(id: number, reason?: string) {
        const store = await this.prisma.store.findUnique({ where: { id } });
        if (!store) throw new NotFoundException('Store not found');

        const updatedStore = await this.prisma.store.update({
            where: { id },
            data: { isActive: false, deactivationReason: reason || null },
            include: { owner: { select: { id: true, name: true, email: true } } }
        });

        // Notify owner about deactivation
        await this.notificationService.createNotification({
            userId: store.ownerId,
            type: 'STORE_DEACTIVATED',
            title: 'Store Deactivated',
            message: `Your store "${store.name}" has been deactivated by an admin.${reason ? ` Reason: ${reason}` : ''}`,
        });

        return {
            id: updatedStore.id,
            name: updatedStore.name,
            isActive: updatedStore.isActive,
            deactivationReason: updatedStore.deactivationReason,
            owner: updatedStore.owner
        };
    }

    /**
     * ACTIVATE STORE
     */
    async activateStore(id: number) {
        const store = await this.prisma.store.findUnique({ where: { id } });
        if (!store) throw new NotFoundException('Store not found');

        const updatedStore = await this.prisma.store.update({
            where: { id },
            data: { isActive: true, deactivationReason: null },
            include: { owner: { select: { id: true, name: true, email: true } } }
        });

        // Optional: Notify owner about reactivation
        await this.notificationService.createNotification({
            userId: store.ownerId,
            type: 'STORE_REACTIVATED',
            title: 'Store Reactivated',
            message: `Your store "${store.name}" has been reactivated by an admin.`,
        });

        return {
            id: updatedStore.id,
            name: updatedStore.name,
            isActive: updatedStore.isActive,
            deactivationReason: null,
            owner: updatedStore.owner
        };
    }
}
