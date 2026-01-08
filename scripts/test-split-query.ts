
import { PrismaClient } from '@prisma/client';

async function test() {
    const prisma = new PrismaClient();
    const salesStatuses = ['APPROVED', 'SHIPPED', 'DELIVERED'];

    console.log('START_SPLIT_TEST');
    try {
        // 1. Get active store IDs
        const activeStores = await prisma.store.findMany({
            where: { isActive: true },
            select: { id: true }
        });
        const activeStoreIds = activeStores.map(s => s.id);

        // 2. Aggregate with storeId filter
        const result = await prisma.orderItem.aggregate({
            _sum: { priceAtPurchase: true },
            _count: { id: true },
            where: {
                status: { in: salesStatuses as any },
                storeId: { in: activeStoreIds }
            }
        });
        console.log('RESULT_SPLIT:', JSON.stringify(result));
    } catch (e) {
        console.log('ERROR_SPLIT:', e.message);
    }
    console.log('END_SPLIT_TEST');

    await prisma.$disconnect();
}

test();
