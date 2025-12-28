import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class SellerProductsImportService {
    constructor(private prisma: PrismaService) { }

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

        // 1. Parse Excel
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Get headers and data
        const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (data.length < 2) {
            throw new BadRequestException('Excel file is empty or missing data rows');
        }

        const headers: string[] = data[0].map((h: any) => String(h).trim());
        const rows = data.slice(1);

        // 2. Validate Headers
        const requiredColumns = ['name', 'price', 'category', 'stock'];
        for (const col of requiredColumns) {
            if (!headers.includes(col)) {
                throw new BadRequestException(`Missing required column: ${col}`);
            }
        }

        const headerMap: Record<string, number> = {};
        headers.forEach((h, i) => (headerMap[h] = i));

        const optionalColumns = ['description', 'imageUrl'];
        optionalColumns.forEach((col) => {
            if (headers.includes(col)) {
                headerMap[col] = headers.indexOf(col);
            }
        });

        // 3. Parse and Validate Rows
        const productsToCreate: any[] = [];
        const categoryNamesSet = new Set<string>();

        rows.forEach((row, index) => {
            const rowIndex = index + 2; // Row 1 is headers, 0-based data slice starts at index 1 of sheet

            const name = String(row[headerMap['name']] || '').trim();
            const price = parseFloat(row[headerMap['price']]);
            const category = String(row[headerMap['category']] || '').trim();
            const stock = parseInt(row[headerMap['stock']], 10);
            const description = headerMap['description'] !== undefined ? String(row[headerMap['description']] || '').trim() : '';
            const imageUrl = headerMap['imageUrl'] !== undefined ? String(row[headerMap['imageUrl']] || '').trim() : '';

            if (!name) {
                throw new BadRequestException(`Row ${rowIndex}: Name is required`);
            }
            if (isNaN(price) || price <= 0) {
                throw new BadRequestException(`Row ${rowIndex}: Valid positive price is required`);
            }
            if (!category) {
                throw new BadRequestException(`Row ${rowIndex}: Category is required`);
            }
            if (isNaN(stock) || stock < 0) {
                throw new BadRequestException(`Row ${rowIndex}: Stock must be a non-negative integer`);
            }

            categoryNamesSet.add(category);

            productsToCreate.push({
                name,
                price,
                category,
                stock,
                fullDescription: description,
                image: imageUrl,
                rowIndex,
            });
        });

        // 4. Handle Categories & Insertion
        return await this.prisma.$transaction(async (tx) => {
            const finalProducts = await Promise.all(
                productsToCreate.map((p) =>
                    tx.product.create({
                        data: {
                            name: p.name,
                            price: p.price,
                            fullDescription: p.fullDescription,
                            image: p.image || '', // Schema says 'image String', so we provide empty string if missing
                            category: p.category, // Directly using string as defined in schema
                            storeId: store.id,
                            stock: p.stock,
                        },
                    }),
                ),
            );

            return {
                success: true,
                insertedCount: finalProducts.length,
            };
        });
    }
}
