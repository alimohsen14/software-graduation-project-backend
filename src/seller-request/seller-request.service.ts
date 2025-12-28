/* eslint-disable */
import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSellerRequestDto } from './dto/create-seller-request.dto';
import { SellerRequestStatus, StoreType } from '@prisma/client';

@Injectable()
export class SellerRequestService {
    constructor(private prisma: PrismaService) { }

    // =========================
    // Create seller request (User)
    // =========================
    async createRequest(userId: number, dto: CreateSellerRequestDto) {
        // Check if user is already a seller
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.isSeller) {
            throw new BadRequestException('You are already a seller');
        }

        if (user.isAdmin) {
            throw new BadRequestException('Admins cannot become sellers');
        }

        // Check if user already has a pending or approved request
        const existingRequest = await this.prisma.sellerRequest.findUnique({
            where: { userId },
        });

        if (existingRequest) {
            if (existingRequest.status === SellerRequestStatus.PENDING) {
                throw new BadRequestException('You already have a pending seller request');
            }
            if (existingRequest.status === SellerRequestStatus.APPROVED) {
                throw new BadRequestException('Your seller request was already approved');
            }
            // If rejected, allow re-applying by updating the existing request
            return this.prisma.sellerRequest.update({
                where: { userId },
                data: {
                    storeName: dto.storeName,
                    storeImage: dto.storeImage,
                    message: dto.message,
                    productType: dto.productType,
                    region: dto.region,
                    status: SellerRequestStatus.PENDING,
                    rejectionReason: null,
                    processedAt: null,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
        }

        return this.prisma.sellerRequest.create({
            data: {
                userId,
                storeName: dto.storeName,
                storeImage: dto.storeImage,
                message: dto.message,
                productType: dto.productType,
                region: dto.region,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    // =========================
    // Get my request status (User)
    // =========================
    async getMyRequest(userId: number) {
        const request = await this.prisma.sellerRequest.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return request;
    }

    // =========================
    // Get all requests (Admin)
    // =========================
    async findAll() {
        return this.prisma.sellerRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });
    }

    // =========================
    // Get pending requests (Admin)
    // =========================
    async findAllPending() {
        return this.prisma.sellerRequest.findMany({
            where: { status: SellerRequestStatus.PENDING },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });
    }

    // =========================
    // Get single request (Admin)
    // =========================
    async findOne(id: number) {
        const request = await this.prisma.sellerRequest.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!request) {
            throw new NotFoundException('Seller request not found');
        }

        return request;
    }

    // =========================
    // Approve request (Admin)
    // =========================
    async approve(id: number) {
        const request = await this.prisma.sellerRequest.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!request) {
            throw new NotFoundException('Seller request not found');
        }

        if (request.status !== SellerRequestStatus.PENDING) {
            throw new BadRequestException('This request has already been processed');
        }

        // Check if user already has a store
        const existingStore = await this.prisma.store.findUnique({
            where: { ownerId: request.userId },
        });

        if (existingStore) {
            throw new BadRequestException('User already has a store');
        }

        // Use transaction to update request, create store, and update user
        return this.prisma.$transaction(async (tx) => {
            // Update request status
            const updatedRequest = await tx.sellerRequest.update({
                where: { id },
                data: {
                    status: SellerRequestStatus.APPROVED,
                    processedAt: new Date(),
                },
            });

            // Create store for seller
            const store = await tx.store.create({
                data: {
                    name: request.storeName,
                    image: request.storeImage,
                    type: StoreType.SELLER,
                    ownerId: request.userId,
                },
            });

            // Update user to be a seller
            await tx.user.update({
                where: { id: request.userId },
                data: { isSeller: true },
            });

            return {
                request: updatedRequest,
                store,
                message: 'Seller request approved successfully',
            };
        });
    }

    // =========================
    // Reject request (Admin)
    // =========================
    async reject(id: number, reason?: string) {
        const request = await this.prisma.sellerRequest.findUnique({
            where: { id },
        });

        if (!request) {
            throw new NotFoundException('Seller request not found');
        }

        if (request.status !== SellerRequestStatus.PENDING) {
            throw new BadRequestException('This request has already been processed');
        }

        return this.prisma.sellerRequest.update({
            where: { id },
            data: {
                status: SellerRequestStatus.REJECTED,
                rejectionReason: reason,
                processedAt: new Date(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
}
