
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdminUsersService } from '../src/admin/admin-users.service';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const adminUsersService = app.get(AdminUsersService);

    console.log('🧪 Testing Admin Users Analytics...');
    const analytics = await adminUsersService.getUsersAnalytics();
    console.log('📊 Analytics:', JSON.stringify(analytics, null, 2));

    console.log('\n🧪 Testing Admin Users List (Page 1, Limit 2)...');
    const usersList = await adminUsersService.getUsersList({ page: 1, limit: 2 });
    console.log('📋 Users List:', JSON.stringify(usersList, null, 2));

    console.log('\n🧪 Testing Admin Users List Filter (Role: seller)...');
    const sellersList = await adminUsersService.getUsersList({ role: 'seller', limit: 5 });
    console.log('📋 Sellers List Count:', sellersList.data.length);

    await app.close();
}

main().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
