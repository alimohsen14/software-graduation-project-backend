import { Injectable } from '@nestjs/common';
import { Product } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadgeConfigService } from './badge-config.service';

/**
 * Service for calculating product badges based on business rules.
 */
@Injectable()
export class BadgeService {
    constructor(
        private prisma: PrismaService,
        private config: BadgeConfigService,
    ) { }

    /**
     * Calculate badges for a single product.
     */
    async calculateBadges(product: Product): Promise<string[]> {
        const badgesMap = await this.calculateBadgesBatch([product]);
        return badgesMap.get(product.id)!;
    }

    /**
     * Calculate badges for multiple products (optimized batch operation).
     */
    async calculateBadgesBatch(
        products: Product[],
    ): Promise<Map<number, string[]>> {
        const productIds = products.map((p) => p.id);
        const config = this.config.getConfig();

        // 1. Get sales data for HOT (last 24h) and BEST (last 30d)
        const now = new Date();

        const oneDayAgo = new Date(now);
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - config.bestSellerDays);

        const [hotSalesMap, bestSalesMap] = await Promise.all([
            this.getSalesCount(productIds, oneDayAgo),
            this.getSalesCount(productIds, thirtyDaysAgo),
        ]);

        const result = new Map<number, string[]>();

        for (const product of products) {
            const badges = this.computeBadgesForProduct(
                product,
                hotSalesMap.get(product.id) || 0,
                bestSalesMap.get(product.id) || 0,
            );
            result.set(product.id, badges);
        }

        return result;
    }

    /**
     * Attach badges to a single product, returning a new object.
     */
    async attachBadgeToProduct<T extends Product>(
        product: T,
    ): Promise<T & { badges: string[] }> {
        const badges = await this.calculateBadges(product);
        return { ...product, badges };
    }

    /**
     * Attach badges to multiple products, returning new objects.
     */
    async attachBadgesToProducts<T extends Product>(
        products: T[],
    ): Promise<(T & { badges: string[] })[]> {
        const badgesMap = await this.calculateBadgesBatch(products);
        return products.map((product) => ({
            ...product,
            badges: badgesMap.get(product.id)!,
        }));
    }

    /**
     * Compute badge states for a single product (synchronous helper).
     * Priority: HOT -> BEST -> NEW -> LOW_STOCK
     */
    private computeBadgesForProduct(
        product: Product,
        salesLast24h: number,
        salesLast30d: number,
    ): string[] {
        const config = this.config.getConfig();
        const now = new Date();
        const badges: string[] = [];

        // SOLD OUT: stock === 0
        if (product.stock === 0) {
            badges.push('SOLD_OUT');
            return badges; // Stops other badges if sold out
        }

        // 1. HOT: > 20 units sold in last 24 hours
        if (salesLast24h > config.hotSalesThreshold) {
            badges.push('HOT');
        }

        // 2. BEST: >= 30 units sold in last 30 days
        if (salesLast30d >= config.bestSellerThreshold) {
            badges.push('BEST');
        }

        // 3. NEW: product.createdAt within last 3 days
        const createdAt = new Date(product.createdAt);
        const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation <= config.newProductDays) {
            badges.push('NEW');
        }

        // 4. LOW_STOCK: product.stock <= 10
        if (product.stock <= config.lowStockThreshold) {
            badges.push('LOW_STOCK');
        }

        return badges;
    }

    /**
     * Get aggregate sales quantity for products since a given date.
     * Conditions: Order.status = PAID, OrderItem.status IN (APPROVED, SHIPPED)
     */
    private async getSalesCount(
        productIds: number[],
        sinceDate: Date,
    ): Promise<Map<number, number>> {
        if (productIds.length === 0) {
            return new Map();
        }

        const salesData = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                productId: { in: productIds },
                // Item status must be APPROVED or SHIPPED
                status: { in: ['APPROVED', 'SHIPPED'] },
                order: {
                    createdAt: { gte: sinceDate },
                    // Parent order must be PAID
                    status: 'PAID',
                },
            },
            _sum: {
                quantity: true,
            },
        });

        const result = new Map<number, number>();
        for (const item of salesData) {
            result.set(item.productId, item._sum.quantity || 0);
        }

        return result;
    }
}
