
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StoreService } from '../src/store/store.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StoreType } from '@prisma/client';

async function main() {
    console.log('🧪 Starting Self-Healing Verification...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const storeService = app.get(StoreService);
    const prisma = app.get(PrismaService);

    try {
        // 1. Ensure at least one admin exists (for the test to pass)
        const admin = await prisma.user.findFirst({ where: { isAdmin: true } });
        if (!admin) {
            console.error('❌ Error: No admin user found in DB. Please create one before running this test.');
            return;
        }
        console.log(`👤 Found Admin User: ${admin.email}`);

        // 2. Delete the Admin Store to simulate a "broken" state
        console.log('🗑️ Deleting Admin Store (if it exists) to simulate broken state...');
        await prisma.store.deleteMany({
            where: { type: StoreType.ADMIN }
        });

        // 3. Verify it's gone
        const countBefore = await prisma.store.count({ where: { type: StoreType.ADMIN } });
        console.log(`📊 Admin Store Count After Deletion: ${countBefore}`);

        // 4. Trigger self-healing
        console.log('🩹 Triggering Self-Healing via getOfficialStoreSafe()...');
        const restoredStore = await storeService.getOfficialStoreSafe();

        // 5. Final Check
        if (restoredStore && restoredStore.type === StoreType.ADMIN) {
            console.log('✅ SUCCESS: Admin Store was automatically recreated!');
            console.log(`🏢 Store Name: ${restoredStore.name}`);
            console.log(`🆔 Store ID: ${restoredStore.id}`);
        } else {
            console.log('❌ FAILURE: Admin Store was not recreated correctly.');
        }

    } catch (error) {
        console.error('❌ Test Error:', error);
    } finally {
        await app.close();
        console.log('🏁 Verification Complete.');
    }
}

main();
