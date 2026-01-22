
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ReportsService } from '../src/reports/reports.service';
import { CreateProductReportDto } from '../src/reports/dto/create-product-report.dto';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const reportsService = app.get(ReportsService);
    const prisma = app.get(PrismaService);

    // 1. Get a product to report
    const product = await prisma.product.findFirst();
    if (!product) {
        console.log('No products found to report.');
        await app.close();
        return;
    }

    const dto: CreateProductReportDto = {
        productId: product.id.toString(),
        message: 'Test report'
    };

    console.log(`🧪 Testing reporting for Product ID: ${product.id}`);

    // Test 1: USER
    console.log('\n👤 Testing as USER...');
    try {
        const user = { id: 9999, isAdmin: false }; // Mock user
        // We need to bypass the Prisma check for existing report if we want to run this multiple times
        // Or just use a random virtual ID for mock user.
        await reportsService.createReport(user, dto);
        console.log('✅ USER report success (Mocked ID)');
    } catch (err) {
        console.log(`❌ USER report failed: ${err.message}`);
    }

    // Test 2: SELLER
    console.log('\n🏪 Testing as SELLER...');
    try {
        const seller = { id: 8888, isAdmin: false }; // Mock seller
        await reportsService.createReport(seller, dto);
        console.log('✅ SELLER report success (Mocked ID)');
    } catch (err) {
        console.log(`❌ SELLER report failed: ${err.message}`);
    }

    // Test 3: ADMIN
    console.log('\n🛡️ Testing as ADMIN...');
    try {
        const admin = { id: 7777, isAdmin: true }; // Mock admin
        await reportsService.createReport(admin, dto);
        console.log('❌ ADMIN report success (Should have failed)');
    } catch (err) {
        console.log(`✅ ADMIN report blocked (Expected): ${err.message}`);
    }

    await app.close();
}

main().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
