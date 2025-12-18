import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateOrderDto) {
    return this.prisma.order.create({
      data: {
        userId,
        total: dto.total,
        status: 'PENDING',
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: item.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }
}
