import { Injectable, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductReportDto } from './dto/create-product-report.dto';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async createReport(user: any, dto: CreateProductReportDto) {
        if (user.isAdmin) {
            throw new ForbiddenException('Admins cannot submit product reports');
        }

        const userId = user.id;
        const productId = parseInt(dto.productId);
        if (isNaN(productId)) {
            throw new BadRequestException('Invalid product ID');
        }

        // 1. Prevent duplicate reports from same user for same product
        const existingReport = await this.prisma.productReport.findFirst({
            where: {
                userId,
                productId,
            },
        });

        if (existingReport) {
            throw new ConflictException('You have already reported this product');
        }

        // 2. Verify product exists
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new BadRequestException('Product not found');
        }

        // 3. Create report
        const report = await this.prisma.productReport.create({
            data: {
                message: dto.message,
                userId,
                productId,
            },
            include: {
                user: true,
                product: true,
            },
        });

        // 4. Create Admin Notification (DB only)
        await this.prisma.adminNotification.create({
            data: {
                title: 'New product report',
                body: `Product ${report.product.name} was reported by ${report.user.name}`,
            },
        });

        return { message: 'Report submitted successfully' };
    }

    async getAllReports() {
        return this.prisma.productReport.findMany({
            include: {
                product: {
                    include: {
                        store: true,
                    },
                },
                user: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async updateStatus(reportId: string, status: 'PENDING' | 'RESOLVED') {
        return this.prisma.productReport.update({
            where: { id: reportId },
            data: { status },
        });
    }
}
