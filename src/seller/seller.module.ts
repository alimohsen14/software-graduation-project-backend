import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { SellerProductService } from './seller-product.service';
import { SellerOrderService } from './seller-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductModule } from '../product/product.module';

@Module({
    imports: [PrismaModule, ProductModule],
    controllers: [SellerController],
    providers: [SellerProductService, SellerOrderService],
})
export class SellerModule { }
