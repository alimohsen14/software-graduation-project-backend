/* eslint-disable */
import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoreService {
    constructor(private prisma: PrismaService) { }

    // =========================
    // Get all stores (Public)
    // =========================
    async findAll() {
        return this.prisma.store.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: { products: true },
                },
            },
        });
    }

    // =========================
    // Get store by ID (Public)
    // =========================
    async findOne(id: number) {
        const store = await this.prisma.store.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: { products: true },
                },
            },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        return store;
    }

    // =========================
    // Get store by owner ID
    // =========================
    async findByOwnerId(ownerId: number) {
        return this.prisma.store.findUnique({
            where: { ownerId },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: { products: true },
                },
            },
        });
    }

    // =========================
    // Create store (Seller)
    // =========================
    async create(ownerId: number, dto: CreateStoreDto) {
        const existingStore = await this.prisma.store.findUnique({
            where: { ownerId },
        });

        if (existingStore) {
            throw new BadRequestException('You already have a store');
        }

        return this.prisma.store.create({
            data: {
                name: dto.name,
                description: dto.description,
                logo: dto.logo,
                ownerId,
                isOfficial: false,
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    // =========================
    // Update store (Seller/Admin)
    // =========================
    async update(id: number, userId: number, isAdmin: boolean, dto: UpdateStoreDto) {
        const store = await this.prisma.store.findUnique({
            where: { id },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        if (!isAdmin && store.ownerId !== userId) {
            throw new ForbiddenException('You can only update your own store');
        }

        return this.prisma.store.update({
            where: { id },
            data: dto,
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    // =========================
    // Delete store (Admin only)
    // =========================
    async remove(id: number) {
        const store = await this.prisma.store.findUnique({
            where: { id },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        if (store.isOfficial) {
            throw new BadRequestException('Cannot delete the official store');
        }

        return this.prisma.store.delete({
            where: { id },
        });
    }

    // =========================
    // Get official store
    // =========================
    async getOfficialStore() {
        const store = await this.prisma.store.findFirst({
            where: { isOfficial: true },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: { products: true },
                },
            },
        });

        if (!store) {
            throw new NotFoundException('Official store not found');
        }

        return store;
    }
}
