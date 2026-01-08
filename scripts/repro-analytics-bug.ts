
import { PrismaClient } from '@prisma/client';

async function test() {
    const prisma = new PrismaClient();
    const salesStatuses = ['APPROVED', 'SHIPPED', 'DELIVERED'];

    console.log('--- Testing Global Analytics Aggregation ---');
    try {
        const result = await prisma.orderItem.aggregate({
            _sum: { priceAtPurchase: true },
            _count: { id: true },
            where: {
                status: { in: salesStatuses as any },
                store: { isActive: true }
            }
        });
        console.log('Success:', result);
    } catch (e) {
        console.error('FAILED Global Analytics Aggregation:');
        console.error(e.message);
    }

    console.log('\n--- Testing Trends Query ---');
    try {
        const result = await prisma.orderItem.findMany({
            where: {
                status: { in: salesStatuses as any },
                store: { isActive: true }
            },
            take: 1
        });
        console.log('Success (fetched 1):', result.length);
    } catch (e) {
        console.error('FAILED Trends Query:');
        console.error(e.message);
    }

    await prisma.$disconnect();
}

test();
