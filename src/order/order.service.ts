import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) { }

  /**
   * Create order with stock validation and atomic stock deduction.
   *
   * Verification checklist (Postman/curl):
   * 1. POST /orders with valid items → 201, stock decremented
   * 2. POST /orders with quantity > stock → 400 "Insufficient stock"
   * 3. POST /orders with non-existing productId → 404 "Product not found"
   * 4. POST /orders with empty items array → 400 (DTO validation)
   * 5. POST /orders with quantity < 1 → 400 (DTO validation)
   */
  async create(userId: number, dto: CreateOrderDto) {
    // Validate items array not empty (additional backend check)
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Validate all quantities are positive
    for (const item of dto.items) {
      if (item.quantity < 1) {
        throw new BadRequestException(
          'Quantity must be at least 1 for all items',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map((item) => item.productId);

      // Fetch all products in one query
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      // Validate all products exist
      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p.id);
        const missingIds = productIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Product(s) not found: ${missingIds.join(', ')}`,
        );
      }

      // Build product map for quick lookup
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Calculate total from actual product prices (security: don't trust frontend prices)
      let calculatedTotal = 0;

      // Validate stock availability for each item
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;

        // Check stock availability
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
          );
        }

        // Accumulate total using actual product price
        calculatedTotal += product.price * item.quantity;
      }

      // Decrease stock for each item (prevents negative stock via validation above)
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Create order with items using actual product prices
      return tx.order.create({
        data: {
          userId,
          total: calculatedTotal,
          status: 'PENDING',
          city: dto.city,
          address: dto.address,
          phone: dto.phone,
          items: {
            create: dto.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                priceAtPurchase: product.price, // Use actual product price, not frontend price
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
