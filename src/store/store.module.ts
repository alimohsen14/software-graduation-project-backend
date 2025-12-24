import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
    imports: [PrismaModule, MarketplaceModule],
    controllers: [StoreController],
    providers: [StoreService],
    exports: [StoreService],
})
export class StoreModule { }
