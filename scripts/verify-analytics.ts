
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdminAnalyticsService } from '../src/admin/admin-analytics.service';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const analyticsService = app.get(AdminAnalyticsService);

    console.log('🧪 Testing Admin Analytics: GET /admin/analytics/users');
    const analytics = await analyticsService.getUsersAnalytics();
    console.log('📊 Stats:', JSON.stringify(analytics, null, 2));

    console.log('\n🧪 Testing Admin Analytics List: GET /admin/analytics/users/list');
    const usersList = await analyticsService.getUsersList({ page: 1, limit: 5 });
    console.log('📋 User List Data Sample:', usersList.data[0]);
    console.log('📋 Meta:', usersList.meta);

    // Check rounding
    console.log('\n📊 Checking Seller Ratio rounding:', analytics.sellerRatio % 1 === 0 ? '✅ Integer' : '❌ Float');

    await app.close();
}

main().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
