import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    AiModule,
    ProductModule,
    OrderModule,
    UploadsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
