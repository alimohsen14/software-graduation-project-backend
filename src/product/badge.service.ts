import { Injectable } from '@nestjs/common';
import { Product } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadgeConfigService } from './badge-config.service';
import { ProductBadges } from './interfaces/badges.interface';

/**
 * Service for calculating product badges based on business rules.
 *
 * Badge Priority (for frontend display):
 * 1. SOLD OUT (highest)
 * 2. HOT + BEST (combined state)
 * 3. BEST SELLER
 * 4. HOT
 * 5. NEW
 * 6. LOW STOCK (warning, not a selling badge)
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
    async calculateBadges(product: Product): Promise<ProductBadges> {
        const badgesMap = await this.calculateBadgesBatch([product]);
        return badgesMap.get(product.id)!;
    }

    /**
     * Calculate badges for multiple products (optimized batch operation).
     * Uses a single query for best seller data.
     */
    async calculateBadgesBatch(
        products: Product[],
    ): Promise<Map<number, ProductBadges>> {
        const productIds = products.map((p) => p.id);
        const salesData = await this.getSalesData(productIds);
        const result = new Map<number, ProductBadges>();

        for (const product of products) {
            const badges = this.computeBadgesForProduct(
                product,
                salesData.get(product.id) || 0,
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
    ): Promise<T & { badges: ProductBadges }> {
        const badges = await this.calculateBadges(product);
        return { ...product, badges };
    }

    /**
     * Attach badges to multiple products, returning new objects.
     */
    async attachBadgesToProducts<T extends Product>(
        products: T[],
    ): Promise<(T & { badges: ProductBadges })[]> {
        const badgesMap = await this.calculateBadgesBatch(products);
        return products.map((product) => ({
            ...product,
            badges: badgesMap.get(product.id)!,
        }));
    }

    /**
     * Compute badge states for a single product (synchronous helper).
     */
    private computeBadgesForProduct(
        product: Product,
        totalSales: number,
    ): ProductBadges {
        const config = this.config.getConfig();
        const now = new Date();

        // SOLD OUT: stock === 0
        const isSoldOut = product.stock === 0;

        // LOW STOCK: stock > 0 && stock <= threshold
        // Do NOT show low stock if sold out
        const isLowStock =
            !isSoldOut &&
            product.stock > 0 &&
            product.stock <= config.lowStockThreshold;

        // NEW: createdAt within newProductDays
        const createdAt = new Date(product.createdAt);
        const daysSinceCreation = Math.floor(
            (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        const isNew = daysSinceCreation < config.newProductDays;

        // HOT: manual flag from database
        const isHot = product.isHot;

        // BEST SELLER: total sales >= threshold in last 30 days
        const isBestSeller = totalSales >= config.bestSellerThreshold;

        return {
            isSoldOut,
            isLowStock,
            isNew,
            isHot,
            isBestSeller,
        };
    }

    /**
     * Get sales data for best seller calculation.
     * Aggregates order items from non-canceled orders in the last N days.
     * Only includes orders with status: PAID, SHIPPED (excluding PENDING and CANCELED).
     */
    private async getSalesData(
        productIds: number[],
    ): Promise<Map<number, number>> {
        if (productIds.length === 0) {
            return new Map();
        }

        const config = this.config.getConfig();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - config.bestSellerDays);

        // Aggregate sales by product from completed orders
        const salesData = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                productId: { in: productIds },
                order: {
                    createdAt: { gte: cutoffDate },
                    status: { in: ['PAID', 'SHIPPED'] },
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
