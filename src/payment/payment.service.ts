import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
    constructor(private prisma: PrismaService) { }

    async createMockPayment(userId: number, orderId: number) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { payments: true },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Ownership check (or Admin)
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (order.userId !== userId && !user?.isAdmin) {
            throw new BadRequestException('You do not own this order');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException(`Cannot pay for an order with status ${order.status}`);
        }

        // Check if there is already a PAID payment
        const existingPaid = order.payments.find(p => p.status === 'PAID');
        if (existingPaid) {
            throw new BadRequestException('Order is already paid');
        }

        return await this.prisma.$transaction(async (tx) => {
            // 1. Create Payment
            const payment = await tx.payment.create({
                data: {
                    orderId: order.id,
                    userId: order.userId,
                    amount: order.total,
                    method: 'MOCK',
                    status: 'PAID',
                },
            });

            // 2. Update Order Status
            await tx.order.update({
                where: { id: order.id },
                data: { status: 'PAID' },
            });

            return {
                message: 'Mock payment successful',
                paymentId: payment.id,
                orderStatus: 'PAID',
                amount: payment.amount,
            };
        });
    }
}
