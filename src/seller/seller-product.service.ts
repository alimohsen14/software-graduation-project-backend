/* eslint-disable */
import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { BadgeService } from 'src/product/badge.service';

// Store select for consistent response shape
const storeSelect = {
    id: true,
    name: true,
    logo: true,
};

@Injectable()
export class SellerProductService {
    private readonly logger = new Logger(SellerProductService.name);

    constructor(
        private prisma: PrismaService,
        private badgeService: BadgeService,
    ) { }

    // =========================
    // Get seller's store
    // =========================
    private async getSellerStore(userId: number) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
        });

        if (!store) {
            throw new BadRequestException('You do not have a store. Please create one first.');
        }

        return store;
    }

    // =========================
    // Get all products for seller's store
    // =========================
    async findAll(userId: number) {
        const store = await this.getSellerStore(userId);

        const products = await this.prisma.product.findMany({
            where: { storeId: store.id },
            orderBy: { createdAt: 'desc' },
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        return this.badgeService.attachBadgesToProducts(products);
    }

    // =========================
    // Get single product for seller's store
    // =========================
    async findOne(userId: number, productId: number) {
        const store = await this.getSellerStore(userId);

        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                storeId: store.id,
            },
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found in your store');
        }

        return this.badgeService.attachBadgeToProduct(product);
    }

    // =========================
    // Create product for seller's store
    // =========================
    async create(userId: number, dto: CreateProductDto) {
        this.logger.log(`Seller creating product: ${dto.name} (User: ${userId})`);
        const store = await this.getSellerStore(userId);
        this.logger.log(`Using Seller Store ID: ${store.id}`);

        const product = await this.prisma.product.create({
            data: {
                ...dto,
                storeId: store.id,
            },
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        return this.badgeService.attachBadgeToProduct(product);
    }

    // =========================
    // Update product for seller's store
    // =========================
    async update(userId: number, productId: number, dto: UpdateProductDto) {
        const store = await this.getSellerStore(userId);

        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                storeId: store.id,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found in your store');
        }

        return this.prisma.product.update({
            where: { id: productId },
            data: dto,
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });
    }

    // =========================
    // Delete product for seller's store
    // =========================
    async remove(userId: number, productId: number) {
        const store = await this.getSellerStore(userId);

        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                storeId: store.id,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found in your store');
        }

        if (!product.isActive) {
            throw new BadRequestException('Product is already disabled');
        }

        await this.prisma.product.update({
            where: { id: productId },
            data: { isActive: false },
        });

        return { message: 'Product has been disabled successfully' };
    }
    // =========================
    // Get low stock alerts for seller
    // =========================
    async getLowStockProducts(userId: number) {
        const store = await this.getSellerStore(userId);

        // Define low stock threshold (could be moved to config)
        const LOW_STOCK_THRESHOLD = 5;

        const products = await this.prisma.product.findMany({
            where: {
                storeId: store.id,
                stock: { lte: LOW_STOCK_THRESHOLD },
            },
            include: {
                store: {
                    select: storeSelect,
                },
            },
            orderBy: { stock: 'asc' },
        });

        return this.badgeService.attachBadgesToProducts(products);
    }
}

