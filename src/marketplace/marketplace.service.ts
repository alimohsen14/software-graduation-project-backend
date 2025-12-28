/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadgeService } from 'src/product/badge.service';
import { MarketplaceQueryDto } from './dto/marketplace-query.dto';
import { Prisma } from '@prisma/client';

// Store select for consistent response shape
const storeSelect = {
    id: true,
    name: true,
    logo: true,
};

@Injectable()
export class MarketplaceService {
    constructor(
        private prisma: PrismaService,
        private badgeService: BadgeService,
    ) { }

    // =========================
    // Get all marketplace products with filters
    // =========================
    async findAllProducts(query: MarketplaceQueryDto) {
        const where: Prisma.ProductWhereInput = {};
        const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];

        // Category filter
        if (query.category) {
            where.category = query.category;
        }

        // Price range filter
        if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            where.price = {};
            if (query.minPrice !== undefined) {
                where.price.gte = query.minPrice;
            }
            if (query.maxPrice !== undefined) {
                where.price.lte = query.maxPrice;
            }
        }

        // Store filter
        if (query.storeId !== undefined) {
            where.storeId = query.storeId;
        }

        // Sorting
        if (query.sort === 'price_asc') {
            orderBy.push({ price: 'asc' });
        } else if (query.sort === 'price_desc') {
            orderBy.push({ price: 'desc' });
        } else if (query.sort === 'newest') {
            orderBy.push({ createdAt: 'desc' });
        } else if (query.sort === 'best_seller') {
            // For best seller, we'll sort by createdAt desc as fallback
            // The actual best seller logic is in badges
            orderBy.push({ createdAt: 'desc' });
        } else {
            orderBy.push({ createdAt: 'desc' });
        }

        const products = await this.prisma.product.findMany({
            where,
            orderBy,
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        // If best_seller sort, we need to sort by sales
        if (query.sort === 'best_seller') {
            const productsWithBadges = await this.badgeService.attachBadgesToProducts(products);
            // Sort by best seller flag first, then by date
            return productsWithBadges.sort((a, b) => {
                if (a.badges.isBestSeller && !b.badges.isBestSeller) return -1;
                if (!a.badges.isBestSeller && b.badges.isBestSeller) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        }

        return this.badgeService.attachBadgesToProducts(products);
    }

    // =========================
    // Get products by store ID
    // =========================
    async findProductsByStore(storeId: number, query: MarketplaceQueryDto) {
        const where: Prisma.ProductWhereInput = { storeId };
        const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];

        // Category filter
        if (query.category) {
            where.category = query.category;
        }

        // Price range filter
        if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            where.price = {};
            if (query.minPrice !== undefined) {
                where.price.gte = query.minPrice;
            }
            if (query.maxPrice !== undefined) {
                where.price.lte = query.maxPrice;
            }
        }

        // Sorting
        if (query.sort === 'price_asc') {
            orderBy.push({ price: 'asc' });
        } else if (query.sort === 'price_desc') {
            orderBy.push({ price: 'desc' });
        } else if (query.sort === 'newest') {
            orderBy.push({ createdAt: 'desc' });
        } else {
            orderBy.push({ createdAt: 'desc' });
        }

        const products = await this.prisma.product.findMany({
            where,
            orderBy,
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        return this.badgeService.attachBadgesToProducts(products);
    }

    // =========================
    // Get all categories
    // =========================
    async getCategories() {
        const products = await this.prisma.product.findMany({
            select: { category: true },
            distinct: ['category'],
        });
        return products.map((p) => p.category);
    }
}
