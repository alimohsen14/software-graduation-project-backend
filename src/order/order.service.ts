/* eslint-disable */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) { }

  /**
   * Create order with stock validation and atomic stock deduction.
   * Sets adminStatus to ADMIN_PENDING and creates ORDER_CREATED notification.
   */
  async create(userId: number, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    for (const item of dto.items) {
      if (item.quantity < 1) {
        throw new BadRequestException(
          'Quantity must be at least 1 for all items',
        );
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map((item) => item.productId);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p.id);
        const missingIds = productIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Product(s) not found: ${missingIds.join(', ')}`,
        );
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      let calculatedTotal = 0;

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
          );
        }

        calculatedTotal += product.price * item.quantity;
      }

      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.order.create({
        data: {
          userId,
          total: calculatedTotal,
          status: 'PENDING',
          adminStatus: 'ADMIN_PENDING',
          city: dto.city,
          address: dto.address,
          phone: dto.phone,
          items: {
            create: dto.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                priceAtPurchase: product.price,
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

    await this.notificationService.createNotification({
      userId,
      type: 'ORDER_CREATED',
      title: 'Order Placed',
      message: 'Your order from the official store has been placed successfully.',
      orderId: order.id,
    });

    return order;
  }

  /**
   * Get all orders (admin only)
   */
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

  /**
   * Get all orders pending admin approval (admin only)
   */
  async findAllPending() {
    return this.prisma.order.findMany({
      where: { adminStatus: 'ADMIN_PENDING' },
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

  /**
   * Approve an order (admin only)
   */
  async approveOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.adminStatus !== 'ADMIN_PENDING') {
      throw new BadRequestException(
        `Order is already ${order.adminStatus === 'ADMIN_APPROVED' ? 'approved' : 'rejected'
        }`,
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        adminStatus: 'ADMIN_APPROVED',
        approvedAt: new Date(),
      },
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

    await this.notificationService.createNotification({
      userId: order.userId,
      type: 'ORDER_APPROVED',
      title: 'Order Approved',
      message: 'Your order has been approved and is being prepared for delivery.',
      orderId: order.id,
    });

    return updatedOrder;
  }

  /**
   * Reject an order (admin only)
   * Restores product stock atomically
   */
  async rejectOrder(orderId: number, rejectionReason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.adminStatus !== 'ADMIN_PENDING') {
      throw new BadRequestException(
        `Order is already ${order.adminStatus === 'ADMIN_APPROVED' ? 'approved' : 'rejected'
        }`,
      );
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          adminStatus: 'ADMIN_REJECTED',
          rejectedAt: new Date(),
          rejectionReason,
        },
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
    });

    const message = `Your order has been rejected.
Reason: ${rejectionReason}

If you have any questions or would like to request a review,
please contact us at: support@yourstore.com
We will respond as soon as possible.`;

    await this.notificationService.createNotification({
      userId: order.userId,
      type: 'ORDER_REJECTED',
      title: 'Order Rejected',
      message,
      orderId: order.id,
    });

    return updatedOrder;
  }
}
