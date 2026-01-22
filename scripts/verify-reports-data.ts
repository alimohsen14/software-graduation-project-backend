
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ReportsService } from '../src/reports/reports.service';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const reportsService = app.get(ReportsService);

    console.log('🧪 Fetching all reports to verify store data...');
    const reports = await reportsService.getAllReports();

    if (reports.length === 0) {
        console.log('⚠️ No reports found to verify.');
    } else {
        console.log(`✅ Found ${reports.length} reports.`);
        const firstReport = reports[0];
        console.log('📝 Sample Report Structure:');
        console.log(JSON.stringify({
            id: firstReport.id,
            product: {
                name: firstReport.product?.name,
                store: firstReport.product?.store ? {
                    name: firstReport.product.store.name
                } : 'MISSING'
            },
            user: {
                name: firstReport.user?.name
            }
        }, null, 2));

        if (firstReport.product?.store?.name) {
            console.log('✨ SUCCESS: Store name is present.');
        } else {
            console.log('❌ FAILURE: Store name is missing.');
        }
    }

    await app.close();
}

main().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
