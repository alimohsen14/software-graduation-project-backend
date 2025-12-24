/* eslint-disable */
import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { BadgeService } from 'src/product/badge.service';

@Injectable()
export class SellerProductService {
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
                    select: {
                        id: true,
                        name: true,
                        isOfficial: true,
                    },
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
                    select: {
                        id: true,
                        name: true,
                        isOfficial: true,
                    },
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
        const store = await this.getSellerStore(userId);

        const product = await this.prisma.product.create({
            data: {
                ...dto,
                storeId: store.id,
            },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        isOfficial: true,
                    },
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
                    select: {
                        id: true,
                        name: true,
                        isOfficial: true,
                    },
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

        return this.prisma.product.delete({
            where: { id: productId },
        });
    }
}
