import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductManagementService } from './product-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BadgeService } from './badge.service';
import { BadgeConfigService } from './badge-config.service';
import { ProductImportService } from './product-import.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductService, BadgeService, BadgeConfigService, ProductManagementService, ProductImportService],
  exports: [BadgeService, ProductManagementService, ProductImportService],
})
export class ProductModule { }
