import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BadgeService } from './badge.service';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private badgeService: BadgeService,
  ) { }

  // =========================
  // Create product (Admin)
  // =========================
  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: dto,
    });
    return this.badgeService.attachBadgeToProduct(product);
  }

  // =========================
  // Get all products (Public)
  // =========================
  async findAll() {
    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return this.badgeService.attachBadgesToProducts(products);
  }

  // =========================
  // Get product by ID
  // =========================
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
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
