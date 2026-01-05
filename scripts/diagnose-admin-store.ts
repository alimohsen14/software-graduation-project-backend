
import { PrismaClient } from '@prisma/client';

async function main() {
    console.log('🔍 STARTING ADMIN STORE DIAGNOSTIC 🔍');
    console.log('--------------------------------------------------');

    // 1. Confirm Environment
    const dbUrl = process.env.DATABASE_URL;
    console.log(`📡 DATABASE_URL: ${dbUrl ? dbUrl.replace(/:[^:@]*@/, ':****@') : 'UNDEFINED'}`);

    const prisma = new PrismaClient();

    try {
        console.log('--------------------------------------------------');
        console.log('📊 DATABASE REALITY CHECK');

        // A) Count stores
        const count = await prisma.store.count();
        console.log(`Total Stores Count: ${count}`);

        // B) List all stores
        const stores = await prisma.store.findMany({
            select: { id: true, name: true, type: true, ownerId: true }
        });

        console.log('Store List:');
        if (stores.length === 0) {
            console.log('   (No stores found)');
        } else {
            console.table(stores);
        }

        // C) Check Admin Store specifically
        console.log('--------------------------------------------------');
        console.log('🎯 CHECKING FOR ADMIN STORE (type="ADMIN")');

        const adminStore = await prisma.store.findFirst({
            where: { type: 'ADMIN' }
        });

        if (adminStore) {
            console.log(`✅ FOUND ADMIN STORE:`);
            console.log(`   ID: ${adminStore.id}`);
            console.log(`   Name: ${adminStore.name}`);
            console.log(`   Type: ${adminStore.type}`);
            console.log(`   OwnerId: ${adminStore.ownerId}`);
        } else {
            console.log(`❌ NO ADMIN STORE FOUND.`);
            console.log(`   (This explains the 404 error)`);
        }

    } catch (error) {
        console.error('❌ FATAL ERROR DURING DIAGNOSTIC:', error);
    } finally {
        await prisma.$disconnect();
        console.log('--------------------------------------------------');
        console.log('🏁 DIAGNOSTIC COMPLETE');
    }
}

main();
