
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Initializing Admin Market (Official Store)...');

    // 1. Find a user with isAdmin = true
    const adminUser = await prisma.user.findFirst({
        where: { isAdmin: true },
    });

    if (!adminUser) {
        console.error('❌ No admin user found in the database. Please create an admin user first.');
        process.exit(1);
    }

    console.log(`👤 Found Admin User: ${adminUser.email} (ID: ${adminUser.id})`);

    // 2. Check if a Store with type = ADMIN already exists
    const existingAdminStore = await prisma.store.findFirst({
        where: { type: 'ADMIN' },
    });

    if (existingAdminStore) {
        console.log(`✅ Official Store already exists: ${existingAdminStore.name} (ID: ${existingAdminStore.id})`);

        // Ensure it's linked to an admin (optional but good for consistency)
        const owner = await prisma.user.findUnique({ where: { id: existingAdminStore.ownerId } });
        if (!owner || !owner.isAdmin) {
            console.log(`⚠️ Warning: Existing Official Store is not owned by an Admin. Updating owner to ${adminUser.email}...`);
            await prisma.store.update({
                where: { id: existingAdminStore.id },
                data: { ownerId: adminUser.id }
            });
        }
    } else {
        // 3. Create the Official Store
        console.log('🏗️ Creating Official Store...');
        const officialStore = await prisma.store.create({
            data: {
                name: 'Official Store',
                description: 'The official marketplace store for Palestine3D.',
                type: 'ADMIN',
                ownerId: adminUser.id,
                logo: 'https://res.cloudinary.com/demo/image/upload/v1625218315/sample.jpg', // Placeholder
            },
        });
        console.log(`✅ Official Store created successfully: ${officialStore.name} (ID: ${officialStore.id})`);
    }

    console.log('✨ Initialization Complete.');
}

main()
    .catch((e) => {
        console.error('❌ Error during initialization:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
