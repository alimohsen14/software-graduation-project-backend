import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoreType } from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getUsersAnalytics() {
        const totalUsers = await this.prisma.user.count();
        const sellersCount = await this.prisma.user.count({
            where: {
                store: {
                    type: StoreType.SELLER,
                },
            },
        });

        const regularUsersCount = totalUsers - sellersCount;
        const sellerRatio = totalUsers > 0 ? Math.round((sellersCount / totalUsers) * 100) : 0;

        const countries = await this.prisma.user.groupBy({
            by: ['country'],
            _count: {
                id: true,
            },
            where: {
                country: { not: null },
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            }
        });

        const usersByCountry = countries.map((c) => ({
            country: c.country,
            count: c._count.id,
        }));

        // Age ranges: 18-24, 25-34, 35-44, 45+
        // Exclude users with missing age
        const ageRanges = await Promise.all([
            this.prisma.user.count({ where: { age: { gte: 18, lte: 24 } } }),
            this.prisma.user.count({ where: { age: { gte: 25, lte: 34 } } }),
            this.prisma.user.count({ where: { age: { gte: 35, lte: 44 } } }),
            this.prisma.user.count({ where: { age: { gte: 45 } } }),
        ]);

        const usersByAgeRange = [
            { range: '18-24', count: ageRanges[0] },
            { range: '25-34', count: ageRanges[1] },
            { range: '35-44', count: ageRanges[2] },
            { range: '45+', count: ageRanges[3] },
        ];

        return {
            totalUsers,
            sellersCount,
            regularUsersCount,
            sellerRatio,
            usersByCountry,
            usersByAgeRange,
        };
    }

    async getUsersList(filters: {
        page?: number;
        limit?: number;
        role?: string;
        country?: string;
        search?: string;
    }) {
        const { page = 1, limit = 20, role, country, search } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (country) {
            where.country = country;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role === 'seller') {
            where.store = { type: StoreType.SELLER };
        } else if (role === 'user') {
            where.OR = [
                { store: null },
                { store: { type: StoreType.ADMIN } },
            ];
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    country: true,
                    age: true,
                    createdAt: true,
                    store: {
                        select: {
                            type: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        const data = users.map((u) => ({
            id: u.id,
            name: u.name,
            country: u.country,
            age: u.age,
            role: u.store?.type === StoreType.SELLER ? 'SELLER' : 'USER',
            createdAt: u.createdAt,
        }));

        return {
            data,
            meta: {
                page,
                limit,
                total,
            },
        };
    }

    /**
     * Platform-wide Global Analytics
     */
    async getGlobalAnalytics() {
        // Correct statuses for OrderItem
        const salesStatuses = ['APPROVED', 'SHIPPED', 'DELIVERED'];

        // Split query to avoid relation filters in aggregate (performance & safety)
        const activeStores = await this.prisma.store.findMany({
            where: { isActive: true },
            select: { id: true }
        });
        const activeStoreIds = activeStores.map(s => s.id);

        const [ordersOverview, salesAggregation] = await Promise.all([
            // Total Orders Count (all statuses)
            this.prisma.order.count({
                where: {
                    items: {
                        some: {
                            storeId: { in: activeStoreIds }
                        }
                    }
                }
            }),
            // Total Sales and Revenue
            this.prisma.orderItem.aggregate({
                _sum: {
                    priceAtPurchase: true,
                    quantity: true
                },
                _count: {
                    id: true
                },
                where: {
                    status: { in: salesStatuses as any },
                    storeId: { in: activeStoreIds }
                }
            })
        ]);

        const totalRevenue = salesAggregation._sum?.priceAtPurchase ?? 0;
        const totalSalesCount = salesAggregation._count?.id ?? 0;
        const averageOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

        return {
            totalRevenue,
            totalOrdersCount: ordersOverview,
            totalSalesCount,
            averageOrderValue,
        };
    }

    /**
     * Revenue Trends (daily/monthly aggregations)
     */
    async getRevenueTrends(period: 'daily' | 'monthly' = 'daily') {
        const salesStatuses = ['APPROVED', 'SHIPPED', 'DELIVERED'];

        // Split query for safety
        const activeStores = await this.prisma.store.findMany({
            where: { isActive: true },
            select: { id: true }
        });
        const activeStoreIds = activeStores.map(s => s.id);

        const now = new Date();
        const startDate = period === 'daily'
            ? new Date(now.setDate(now.getDate() - 30))
            : new Date(now.setFullYear(now.getFullYear() - 1));

        const items = await this.prisma.orderItem.findMany({
            where: {
                status: { in: salesStatuses as any },
                storeId: { in: activeStoreIds },
                order: {
                    createdAt: { gte: startDate }
                }
            },
            select: {
                priceAtPurchase: true,
                order: {
                    select: { createdAt: true }
                }
            }
        });

        const grouped = items.reduce((acc, item) => {
            const date = item.order.createdAt;
            const key = period === 'daily'
                ? date.toISOString().split('T')[0]
                : `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

            acc[key] = (acc[key] || 0) + item.priceAtPurchase;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Category Analytics (String-based)
     */
    async getCategoryAnalytics() {
        const salesStatuses = ['APPROVED', 'SHIPPED', 'DELIVERED'];

        // Split query for safety
        const activeStores = await this.prisma.store.findMany({
            where: { isActive: true },
            select: { id: true }
        });
        const activeStoreIds = activeStores.map(s => s.id);

        // 1. Get revenue per category
        // We fetch order items with their product category
        const items = await this.prisma.orderItem.findMany({
            where: {
                status: { in: salesStatuses as any },
                storeId: { in: activeStoreIds }
            },
            select: {
                priceAtPurchase: true,
                product: {
                    select: { category: true }
                }
            }
        });

        const revenueByCategory = items.reduce((acc, item) => {
            const cat = item.product.category;
            acc[cat] = (acc[cat] || 0) + item.priceAtPurchase;
            return acc;
        }, {} as Record<string, number>);

        // 2. Count active stores per category
        // A store is counted if it's active and has at least one active product in that category
        const productStats = await this.prisma.product.findMany({
            where: {
                isActive: true,
                storeId: { in: activeStoreIds }
            },
            select: {
                category: true,
                storeId: true
            }
        });

        const storesByCategory = productStats.reduce((acc, p) => {
            if (!acc[p.category]) acc[p.category] = new Set<number>();
            acc[p.category].add(p.storeId);
            return acc;
        }, {} as Record<string, Set<number>>);

        // 3. Combine and rank
        const categories = Object.keys({ ...revenueByCategory, ...storesByCategory });

        return categories.map(name => ({
            name,
            revenue: revenueByCategory[name] || 0,
            activeStoresCount: storesByCategory[name]?.size || 0,
        })).sort((a, b) => b.revenue - a.revenue);
    }
}
