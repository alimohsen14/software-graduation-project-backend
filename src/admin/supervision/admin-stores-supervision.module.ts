import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../../notification/notification.module';
import { AdminStoresSupervisionController } from './admin-stores-supervision.controller';
import { AdminStoresSupervisionService } from './admin-stores-supervision.service';

@Module({
    imports: [PrismaModule, NotificationModule],
    controllers: [AdminStoresSupervisionController],
    providers: [AdminStoresSupervisionService],
    exports: [AdminStoresSupervisionService],
})
export class AdminStoresSupervisionModule { }
