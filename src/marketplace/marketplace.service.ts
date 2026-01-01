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
        const { category, minPrice, maxPrice, storeId } = query;

        const where: Prisma.ProductWhereInput = {
            ...(storeId && { storeId }),
            ...(category && { category }),
            ...(minPrice || maxPrice
                ? {
                    price: {
                        ...(minPrice && { gte: minPrice }),
                        ...(maxPrice && { lte: maxPrice }),
                    },
                }
                : {}),
        };

        const products = await this.prisma.product.findMany({
            where,
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        return this.badgeService.attachBadgesToProducts(products);
    }

    // =========================
    // Get products by store ID
    // =========================
    async findProductsByStore(storeId: number, query: MarketplaceQueryDto) {
        const { category, minPrice, maxPrice } = query;

        const where: Prisma.ProductWhereInput = {
            storeId,
            ...(category && { category }),
            ...(minPrice || maxPrice
                ? {
                    price: {
                        ...(minPrice && { gte: minPrice }),
                        ...(maxPrice && { lte: maxPrice }),
                    },
                }
                : {}),
        };

        const products = await this.prisma.product.findMany({
            where,
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
