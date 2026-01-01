/* eslint-disable */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BadgeService } from './badge.service';
import { StoreType } from '@prisma/client';

// Store select for consistent response shape
const storeSelect = {
  id: true,
  name: true,
  logo: true,
};

export const PRODUCT_CATEGORIES = {
  PALESTINIAN_FOOD: 'PALESTINIAN_FOOD',
  PALESTINIAN_LIFESTYLE: 'PALESTINIAN_LIFESTYLE',
  HANDMADE: 'HANDMADE',
  PALESTINIAN_HERITAGE: 'PALESTINIAN_HERITAGE',
};

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private prisma: PrismaService,
    private badgeService: BadgeService,
  ) { }

  // =========================
  // Get or create admin store
  // =========================
  // =========================
  // Get or create admin store
  // =========================
  private async getOrCreateAdminStore(adminUserId: number) {
    // 1. Check if user owns ANY store
    const existingStore = await this.prisma.store.findUnique({
      where: { ownerId: adminUserId },
    });

    if (existingStore) {
      if (existingStore.type === StoreType.ADMIN) {
        return existingStore;
      }
      // If admin already has a SELLER store, this is a conflict for "Official Store" products
      throw new BadRequestException(
        'You already have a Seller Store linked to this account. Admin products must be created under an Official Store (Type: ADMIN). Please use a different admin account or delete your Seller Store.',
      );
    }

    // 2. Create admin store if none exists
    return this.prisma.store.create({
      data: {
        name: 'Official Soap Store',
        description: 'The official store for premium soap products',
        type: StoreType.ADMIN,
        ownerId: adminUserId,
      },
    });
  }

  // =========================
  // Create product (Admin)
  // =========================
  async create(dto: CreateProductDto, adminUserId: number) {
    this.logger.log(`Admin creating product: ${dto.name}`);

    // Get or create admin store
    const adminStore = await this.getOrCreateAdminStore(adminUserId);
    this.logger.log(`Using Admin Store ID: ${adminStore.id}`);

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        storeId: adminStore.id,
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
  // Get all products (Public)
  // =========================
  async findAll() {
    const products = await this.prisma.product.findMany({
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
  // Get product by ID
  // =========================
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        store: {
          select: storeSelect,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.badgeService.attachBadgeToProduct(product);
  }

  // =========================
  // Update product (Admin)
  // =========================
  async update(id: number, dto: UpdateProductDto) {
    const exists = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        store: {
          select: storeSelect,
        },
      },
    });
  }

  // =========================
  // Delete product (Admin)
  // =========================
  async remove(id: number) {
    const exists = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }
}

