import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { SellerProductService } from './seller-product.service';
import { SellerOrderService } from './seller-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { NotificationModule } from '../notification/notification.module';
import { StoreModule } from '../store/store.module';
import { SellerProductsImportService } from './seller-products-import.service';

@Module({
    imports: [PrismaModule, ProductModule, NotificationModule, StoreModule],
    controllers: [SellerController],
    providers: [SellerProductService, SellerOrderService, SellerProductsImportService],
})
export class SellerModule { }
