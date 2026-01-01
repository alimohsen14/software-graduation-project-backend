import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a review
     * - Check if product exists
     * - Check for duplicate review by user
     */
    async create(userId: number, productId: number, dto: CreateReviewDto) {
        // 1. Check Product existence
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // 2. Check overlap
        const existing = await this.prisma.review.findUnique({
            where: {
                productId_userId: {
                    productId,
                    userId,
                },
            },
        });

        if (existing) {
            throw new ConflictException('You have already reviewed this product');
        }

        // 3. Create
        return this.prisma.review.create({
            data: {
                ...dto,
                productId,
                userId,
            },
        });
    }

    /**
     * Find reviews for a product (Public)
     * - exclude sensitive user info
     */
    async findAll(productId: number) {
        const reviews = await this.prisma.review.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                rating: true,
                comment: true,
                imageUrl: true,
                createdAt: true,
                user: {
                    select: {
                        name: true,
                        // NO email, id is presumably safe but prompt asked for just name in user object
                        // "user: { name }"
                    },
                },
            },
        });
        return reviews;
    }

    /**
     * Update own review
     */
    async updateMyReview(
        userId: number,
        productId: number,
        dto: UpdateReviewDto,
    ) {
        // 1. Find existing review
        const review = await this.prisma.review.findUnique({
            where: {
                productId_userId: {
                    productId,
                    userId,
                },
            },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        // 2. Update
        return this.prisma.review.update({
            where: { id: review.id },
            data: dto,
        });
    }

    /**
     * Delete own review
     */
    async removeMyReview(userId: number, productId: number) {
        // 1. Find existing review
        const review = await this.prisma.review.findUnique({
            where: {
                productId_userId: {
                    productId,
                    userId,
                },
            },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        // 2. Delete
        return this.prisma.review.delete({
            where: { id: review.id },
        });
    }
}
