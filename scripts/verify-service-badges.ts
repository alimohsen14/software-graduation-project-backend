
import { Test, TestingModule } from '@nestjs/testing';
import { BadgeService } from '../src/product/badge.service';
import { BadgeConfigService } from '../src/product/badge-config.service';
import { PrismaService } from '../src/prisma/prisma.service';
// We need to import the ConfigService if PrismaService uses it, or mock it.
// Assuming PrismaService is simple or we can mock it.
// Actually, let's just use the real classes but manual instantiation if possible, 
// or use Test.createTestingModule if dependencies are complex.

async function main() {
    console.log('🔍 Starting Badge Service Verification...');

    const module: TestingModule = await Test.createTestingModule({
        providers: [
            BadgeService,
            BadgeConfigService,
            PrismaService, // Use real PrismaService
        ],
    }).compile();

    const badgeService = module.get<BadgeService>(BadgeService);
    const prisma = module.get<PrismaService>(PrismaService);
    const config = module.get<BadgeConfigService>(BadgeConfigService);

    console.log('✅ Service instantiated.');
    console.log('Config:', config.getConfig());

    // 1. Create Data (similar to previous script but using the service to check)
    const store = await prisma.store.upsert({
        where: { ownerId: 888888 },
        update: {},
        create: {
            name: 'Service Test Store',
            owner: {
                create: {
                    id: 888888,
                    email: 'service_test@example.com',
                    name: 'Service Tester',
                    gender: 'FEMALE',
                }
            },
            type: 'SELLER'
        }
    });

    const now = new Date();

    // NEW Product
    const newProduct = await prisma.product.create({
        data: { name: 'SVC_NEW', price: 10, image: 'img', stock: 100, category: 'TEST', storeId: store.id, createdAt: now }
    });

    // HOT Product
    const hotProduct = await prisma.product.create({
        data: { name: 'SVC_HOT', price: 10, image: 'img', stock: 100, category: 'TEST', storeId: store.id, createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10) }
    });

    // Create Sales for HOT
    await prisma.order.create({
        data: {
            userId: 888888, total: 250, status: 'PAID',
            items: { create: { productId: hotProduct.id, storeId: store.id, quantity: 25, priceAtPurchase: 10, status: 'APPROVED' } }
        }
    });

    // Test Calculation
    console.log('Checking NEW product...');
    const badgesNew = await badgeService.calculateBadges(newProduct);
    console.log('NEW Product Badges:', badgesNew);
    if (!badgesNew.includes('NEW')) throw new Error('NEW badge missing');

    console.log('Checking HOT product...');
    const badgesHot = await badgeService.calculateBadges(hotProduct);
    console.log('HOT Product Badges:', badgesHot);
    if (!badgesHot.includes('HOT')) throw new Error('HOT badge missing');

    // Cleanup
    await prisma.order.deleteMany({ where: { userId: 888888 } });
    await prisma.product.deleteMany({ where: { storeId: store.id } });
    await prisma.store.delete({ where: { id: store.id } });
    await prisma.user.delete({ where: { id: 888888 } });

    console.log('✅ Service Verification Complete');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
