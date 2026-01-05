
import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { BadgeService } from 'src/product/badge.service';

const storeSelect = {
    id: true,
    name: true,
    logo: true,
};

@Injectable()
export class ProductManagementService {
    private readonly logger = new Logger(ProductManagementService.name);

    constructor(
        private prisma: PrismaService,
        private badgeService: BadgeService,
    ) { }

    async findAll(storeId: number) {
        const products = await this.prisma.product.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        return this.badgeService.attachBadgesToProducts(products);
    }

    async findOne(storeId: number, productId: number) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                storeId,
            },
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found in this store');
        }

        return this.badgeService.attachBadgeToProduct(product);
    }

    async create(storeId: number, dto: CreateProductDto) {
        this.logger.log(`Creating product: ${dto.name} for store ID: ${storeId}`);

        const product = await this.prisma.product.create({
            data: {
                ...dto,
                storeId,
            },
            include: {
                store: {
                    select: storeSelect,
                },
            },
        });

        return this.badgeService.attachBadgeToProduct(product);
    }

    async update(storeId: number, productId: number, dto: UpdateProductDto) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                storeId,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found in this store');
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

    async remove(storeId: number, productId: number) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                storeId,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found in this store');
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

    async getLowStockProducts(storeId: number) {
        const LOW_STOCK_THRESHOLD = 5;

        const products = await this.prisma.product.findMany({
            where: {
                storeId,
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
