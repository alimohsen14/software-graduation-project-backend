
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdminAnalyticsService } from '../src/admin/admin-analytics.service';

async function test() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(AdminAnalyticsService);

    console.log('--- Testing Global Analytics ---');
    try {
        const result = await service.getGlobalAnalytics();
        console.log('GLOBAL_RESULT:', JSON.stringify(result));
    } catch (e) {
        console.error('GLOBAL_ERROR:', e.message);
    }

    console.log('\n--- Testing Trends ---');
    try {
        const result = await service.getRevenueTrends('daily');
        console.log('TRENDS_RESULT_COUNT:', result.length);
    } catch (e) {
        console.error('TRENDS_ERROR:', e.message);
    }

    console.log('\n--- Testing Categories ---');
    try {
        const result = await service.getCategoryAnalytics();
        console.log('CATEGORIES_RESULT_COUNT:', result.length);
    } catch (e) {
        console.error('CATEGORIES_ERROR:', e.message);
    }

    await app.close();
}

test();
