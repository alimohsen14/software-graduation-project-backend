
import { PrismaClient } from '@prisma/client';

async function test() {
    const prisma = new PrismaClient();
    const salesStatuses = ['APPROVED', 'SHIPPED', 'DELIVERED'];

    console.log('START_TEST');
    try {
        const salesAggregation = await prisma.orderItem.aggregate({
            _sum: { priceAtPurchase: true },
            _count: { id: true },
            where: {
                status: { in: salesStatuses as any },
                store: { isActive: true }
            }
        });

        const totalRevenue = salesAggregation._sum?.priceAtPurchase ?? 0;
        const totalSalesCount = salesAggregation._count?.id ?? 0;
        const averageOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

        const response = {
            totalRevenue,
            totalSalesCount,
            averageOrderValue,
        };
        console.log('RESULT_GLOBAL:', JSON.stringify(response));
    } catch (e) {
        console.log('ERROR_GLOBAL:', e.message);
    }

    try {
        const items = await prisma.orderItem.findMany({
            where: {
                status: { in: salesStatuses as any },
                store: { isActive: true }
            },
            select: { priceAtPurchase: true, product: { select: { category: true } } }
        });
        console.log('RESULT_CATEGORIES_COUNT:', items.length);
    } catch (e) {
        console.log('ERROR_CATEGORIES:', e.message);
    }
    console.log('END_TEST');

    await prisma.$disconnect();
}

test();
