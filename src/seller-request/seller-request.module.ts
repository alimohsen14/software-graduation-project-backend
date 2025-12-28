import { Module } from '@nestjs/common';
import { SellerRequestService } from './seller-request.service';
import { SellerRequestController } from './seller-request.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    controllers: [SellerRequestController],
    providers: [SellerRequestService, PrismaService],
    exports: [SellerRequestService],
})
export class SellerRequestModule { }
