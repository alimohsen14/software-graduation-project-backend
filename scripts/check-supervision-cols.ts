
import { PrismaClient } from '@prisma/client';

async function test() {
    const prisma = new PrismaClient();
    try {
        const columns: any[] = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Store' AND column_name IN ('isActive', 'deactivationReason');
        `;
        console.log('FOUND_COLUMNS:', JSON.stringify(columns));
    } catch (e) {
        console.log('ERROR_RAW:', e.message);
    }
    await prisma.$disconnect();
}

test();
