import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderManagementService } from './order-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [OrderController],
  providers: [OrderService, OrderManagementService],
  exports: [OrderManagementService],
})
export class OrderModule { }

