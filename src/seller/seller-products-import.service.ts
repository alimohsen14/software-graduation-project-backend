import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductImportService } from 'src/product/product-import.service';

@Injectable()
export class SellerProductsImportService {
    constructor(
        private prisma: PrismaService,
        private sharedImportService: ProductImportService,
    ) { }

    async importProducts(userId: number, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Solve for Seller's Store
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId },
        });

        if (!store) {
            throw new NotFoundException('Seller store not found');
        }

        return this.sharedImportService.importProducts(store.id, file);
    }
}
