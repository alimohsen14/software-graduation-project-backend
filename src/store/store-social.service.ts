import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StoreSocialService {
    constructor(private prisma: PrismaService) { }

    // =========================
    // FOLLOW LOGIC
    // =========================
    async followStore(userId: number, storeId: number) {
        await this.validateStoreExists(storeId);

        const existing = await this.prisma.storeFollow.findUnique({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        if (existing) {
            return { success: true, storeId, action: 'already_followed' };
        }

        await this.prisma.storeFollow.create({
            data: { userId, storeId },
        });

        return { success: true, storeId, action: 'followed' };
    }

    async unfollowStore(userId: number, storeId: number) {
        const existing = await this.prisma.storeFollow.findUnique({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        if (!existing) {
            return { success: true, storeId, action: 'not_followed' };
        }

        await this.prisma.storeFollow.delete({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        return { success: true, storeId, action: 'unfollowed' };
    }

    // =========================
    // FAVORITE LOGIC
    // =========================
    async favoriteStore(userId: number, storeId: number) {
        await this.validateStoreExists(storeId);

        const existing = await this.prisma.storeFavorite.findUnique({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        if (existing) {
            return { success: true, storeId, action: 'already_favorited' };
        }

        // Check limit
        const favoriteCount = await this.prisma.storeFavorite.count({
            where: { userId },
        });

        if (favoriteCount >= 10) {
            throw new BadRequestException('You can only favorite up to 10 stores');
        }

        await this.prisma.storeFavorite.create({
            data: { userId, storeId },
        });

        return { success: true, storeId, action: 'favorited' };
    }

    async unfavoriteStore(userId: number, storeId: number) {
        const existing = await this.prisma.storeFavorite.findUnique({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        if (!existing) {
            return { success: true, storeId, action: 'not_favorited' };
        }

        await this.prisma.storeFavorite.delete({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        return { success: true, storeId, action: 'unfavorited' };
    }

    // =========================
    // STATUS & LISTS
    // =========================
    async getStoreSocialStatus(userId: number, storeId: number) {
        const [follow, favorite] = await Promise.all([
            this.prisma.storeFollow.findUnique({
                where: { userId_storeId: { userId, storeId } },
            }),
            this.prisma.storeFavorite.findUnique({
                where: { userId_storeId: { userId, storeId } },
            }),
        ]);

        return {
            isFollowed: !!follow,
            isFavorited: !!favorite,
        };
    }

    async getFollowedStores(userId: number) {
        const follows = await this.prisma.storeFollow.findMany({
            where: { userId },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return { stores: follows.map((f) => f.store) };
    }

    async getFavoriteStores(userId: number) {
        const favorites = await this.prisma.storeFavorite.findMany({
            where: { userId },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return { stores: favorites.map((f) => f.store) };
    }

    private async validateStoreExists(storeId: number) {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
        });
        if (!store) {
            throw new NotFoundException('Store not found');
        }
    }
}
