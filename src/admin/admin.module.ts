import { Module } from '@nestjs/common';
import { AdminStoreProductsController } from './admin-store-products.controller';
import { AdminStoreController } from './admin-store.controller';
import { AdminStoreOrdersController } from './admin-store-orders.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { ProductModule } from '../product/product.module';
import { StoreModule } from '../store/store.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        PrismaModule,
        ProductModule,
        StoreModule,
        OrderModule,
        NotificationModule
    ],
    controllers: [
        AdminStoreController,
        AdminStoreProductsController,
        AdminStoreOrdersController,
        AdminAnalyticsController,
    ],
    providers: [AdminAnalyticsService],
})
export class AdminModule { }
