import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { StoreSocialService } from './store-social.service';

@Module({
    imports: [PrismaModule, MarketplaceModule],
    controllers: [StoreController],
    providers: [StoreService, StoreSocialService],
    exports: [StoreService, StoreSocialService],
})
export class StoreModule { }
