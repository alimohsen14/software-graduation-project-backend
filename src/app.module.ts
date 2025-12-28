import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationModule } from './notification/notification.module';
import { StoreModule } from './store/store.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { SellerModule } from './seller/seller.module';
import { SellerRequestModule } from './seller-request/seller-request.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    AiModule,
    ProductModule,
    OrderModule,
    UploadsModule,
    NotificationModule,
    StoreModule,
    MarketplaceModule,
    SellerModule,
    SellerRequestModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule { }

