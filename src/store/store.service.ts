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
import { StoreType } from '@prisma/client';
import { UpdateSellerStoreDto } from './dto/update-seller-store.dto';


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
    // Get public store details
    // =========================
    async findPublicStoreById(id: number) {
        const store = await this.prisma.store.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                logo: true,
                description: true,
                owner: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        // Flatten to include ownerName
        const { owner, ...rest } = store;
        return {
            ...rest,
            ownerName: owner.name,
        };
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
                type: StoreType.SELLER,
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
    // Update store by ownerId (Seller)
    // =========================
    async updateByOwnerId(ownerId: number, dto: UpdateSellerStoreDto) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        return this.prisma.store.update({
            where: { ownerId },
            data: dto,
        });
    }

    // =========================
    // Update store logo (Seller)
    // =========================
    async updateStoreLogo(ownerId: number, logoUrl: string) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        return this.prisma.store.update({
            where: { ownerId },
            data: { logo: logoUrl },
        });
    }

    // =========================
    // Update store image (Seller)
    // =========================
    async updateStoreImage(ownerId: number, imageUrl: string) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        return this.prisma.store.update({
            where: { ownerId },
            data: { image: imageUrl },
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

        if (store.type === StoreType.ADMIN) {
            throw new BadRequestException('Cannot delete the admin store');
        }

        return this.prisma.store.delete({
            where: { id },
        });
    }

    // =========================
    // Get admin store
    // =========================
    async getAdminStore() {
        const store = await this.prisma.store.findFirst({
            where: { type: StoreType.ADMIN },
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

        return store;
    }

    // =========================
    // Get or create admin store
    // =========================
    async getOrCreateAdminStore(adminUserId: number) {
        // First try to find existing admin store
        let store = await this.prisma.store.findFirst({
            where: { type: StoreType.ADMIN },
        });

        if (store) {
            return store;
        }

        // Create admin store if it doesn't exist
        store = await this.prisma.store.create({
            data: {
                name: 'Official Soap Store',
                description: 'The official store for premium soap products',
                type: StoreType.ADMIN,
                ownerId: adminUserId,
            },
        });

        return store;
    }

    // =========================
    // Get official store (backwards compatibility)
    // =========================
    async getOfficialStore() {
        const store = await this.prisma.store.findFirst({
            where: { type: StoreType.ADMIN },
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

    /**
     * Get the Official (ADMIN) store. 
     * If it does not exist, it automatically creates it using the first available admin user.
     * This ensures the system is stable and self-heals without manual scripts.
     */
    async getOfficialStoreSafe() {
        // 1. Try to find the existing admin store
        let store = await this.prisma.store.findFirst({
            where: { type: StoreType.ADMIN },
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

        if (store) {
            return store;
        }

        // 2. If missing, find the first admin user to own it
        const firstAdmin = await this.prisma.user.findFirst({
            where: { isAdmin: true },
        });

        if (!firstAdmin) {
            // This is a catastrophic system state (no admins exist), 
            // but we still want a clear error.
            throw new NotFoundException('Catastrophic Error: No admin user found to own the Official Store.');
        }

        // 3. Create the Official Store atomically
        return this.prisma.store.create({
            data: {
                name: 'Official Store',
                description: 'The official marketplace store for premium products.',
                type: StoreType.ADMIN,
                ownerId: firstAdmin.id,
                logo: 'https://res.cloudinary.com/demo/image/upload/v1625218315/sample.jpg', // Default logo
            },
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
}

