import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  // =========================
  // Create product (Admin)
  // =========================
  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: dto,
    });
  }

  // =========================
  // Get all products (Public)
  // =========================
  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
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

    return product;
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
