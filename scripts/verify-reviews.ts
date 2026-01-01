
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting Reviews Verification...');

    // 1. Setup Data: User, Store, Product
    const user = await prisma.user.upsert({
        where: { email: 'review_tester@example.com' },
        update: {},
        create: {
            email: 'review_tester@example.com',
            name: 'Review Tester',
            password: 'hash',
            gender: 'MALE',
        },
    });

    const store = await prisma.store.upsert({
        where: { ownerId: user.id },
        update: {},
        create: {
            name: 'Review Test Store',
            ownerId: user.id,
            type: 'SELLER',
        },
    });

    // Clean old products/reviews
    await prisma.product.deleteMany({ where: { storeId: store.id } });

    const product = await prisma.product.create({
        data: {
            name: 'Reviewable Product',
            price: 100,
            image: 'img',
            stock: 10,
            category: 'TEST',
            storeId: store.id,
        },
    });

    console.log(`✅ Setup complete. Product ID: ${product.id}, User ID: ${user.id}`);

    // 2. Create Review (Manual DB insert to simulate Service)
    // We utilize the prisma client directly to verify the schema and relations working.
    // Ideally we would call the CRUD endpoints or logic, but DB level is good for verification script.

    const review = await prisma.review.create({
        data: {
            productId: product.id,
            userId: user.id,
            rating: 4,
            comment: 'Great product!',
        },
    });
    console.log('✅ Review created:', review);

    // 3. Verify Aggregation Logic
    // We simulate what attachRatings does
    const ratingsGrouped = await prisma.review.groupBy({
        by: ['productId'],
        where: { productId: product.id },
        _avg: { rating: true },
        _count: { _all: true },
    });

    const result = ratingsGrouped[0];
    console.log('📊 Aggregation Result:', result);

    if (!result || result._avg.rating !== 4 || result._count._all !== 1) {
        throw new Error('Aggregation failed');
    }

    // 4. Verify Unique Constraint
    try {
        await prisma.review.create({
            data: {
                productId: product.id,
                userId: user.id,
                rating: 5,
                comment: 'Duplicate!',
            },
        });
        throw new Error('❌ Constraint failed: Duplicate review allowed');
    } catch (e) {
        if (e.code === 'P2002') {
            console.log('✅ Constraint PASSED: Duplicate review rejected');
        } else {
            throw e;
        }
    }

    // Cleanup
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.store.delete({ where: { id: store.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log('🎉 Verification Success');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
