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
import { ProductManagementService } from 'src/product/product-management.service';

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
        private productManagementService: ProductManagementService,
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
        return this.productManagementService.findAll(store.id);
    }

    // =========================
    // Get single product for seller's store
    // =========================
    async findOne(userId: number, productId: number) {
        const store = await this.getSellerStore(userId);
        return this.productManagementService.findOne(store.id, productId);
    }

    // =========================
    // Create product for seller's store
    // =========================
    async create(userId: number, dto: CreateProductDto) {
        const store = await this.getSellerStore(userId);
        return this.productManagementService.create(store.id, dto);
    }

    // =========================
    // Update product for seller's store
    // =========================
    async update(userId: number, productId: number, dto: UpdateProductDto) {
        const store = await this.getSellerStore(userId);
        return this.productManagementService.update(store.id, productId, dto);
    }

    // =========================
    // Delete product for seller's store
    // =========================
    async remove(userId: number, productId: number) {
        const store = await this.getSellerStore(userId);
        return this.productManagementService.remove(store.id, productId);
    }

    // =========================
    // Get low stock alerts for seller
    // =========================
    async getLowStockProducts(userId: number) {
        const store = await this.getSellerStore(userId);
        return this.productManagementService.getLowStockProducts(store.id);
    }
}

