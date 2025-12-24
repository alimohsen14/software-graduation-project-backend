import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BadgeService } from './badge.service';
import { BadgeConfigService } from './badge-config.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductService, BadgeService, BadgeConfigService],
  exports: [BadgeService],
})
export class ProductModule { }

