
import { PrismaClient } from '@prisma/client';

async function test() {
    const prisma = new PrismaClient();
    try {
        const columns: any[] = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Store';
        `;
        console.log('COLUMNS:', JSON.stringify(columns, null, 2));
    } catch (e) {
        console.log('ERROR_RAW:', e.message);
    }
    await prisma.$disconnect();
}

test();
