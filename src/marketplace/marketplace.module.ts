import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductModule } from '../product/product.module';

@Module({
    imports: [PrismaModule, ProductModule],
    controllers: [MarketplaceController],
    providers: [MarketplaceService],
    exports: [MarketplaceService],
})
export class MarketplaceModule { }
