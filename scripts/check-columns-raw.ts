
import { PrismaClient } from '@prisma/client';

async function test() {
    const prisma = new PrismaClient();
    try {
        const rawStore: any = await prisma.$queryRaw`SELECT * FROM "Store" LIMIT 1`;
        if (rawStore && rawStore[0]) {
            console.log('STORE_COLUMNS:', Object.keys(rawStore[0]).join(', '));
        } else {
            console.log('NO_STORES_FOUND');
        }
    } catch (e) {
        console.log('ERROR_RAW_SELECT:', e.message);
    }
    await prisma.$disconnect();
}

test();
