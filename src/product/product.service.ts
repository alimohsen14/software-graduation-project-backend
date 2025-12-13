import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  // Add a new product (Admin only)
  async create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  // Get all products for shop (public)
  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get product by id
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) throw new NotFoundException('Product not found');

    return product;
  }

  // Update product (Admin only)
  async update(id: number, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  // Delete product (Admin only)
  async remove(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }
}
