
import { PrismaClient } from '@prisma/client';

async function test() {
    const prisma = new PrismaClient();
    try {
        const store = await prisma.store.findFirst({
            select: { id: true, name: true }
        });
        console.log('STORE_BASIC:', JSON.stringify(store));

        try {
            const storeWithActive = await prisma.store.findFirst({
                where: { isActive: true },
                select: { id: true, isActive: true }
            });
            console.log('STORE_WITH_ACTIVE:', JSON.stringify(storeWithActive));
        } catch (e) {
            console.log('ERROR_ACTIVE_COL:', e.message);
        }
    } catch (e) {
        console.log('ERROR_BASIC:', e.message);
    }
    await prisma.$disconnect();
}

test();
