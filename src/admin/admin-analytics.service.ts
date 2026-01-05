import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoreType } from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getUsersAnalytics() {
        const totalUsers = await this.prisma.user.count();
        const sellersCount = await this.prisma.user.count({
            where: {
                store: {
                    type: StoreType.SELLER,
                },
            },
        });

        const regularUsersCount = totalUsers - sellersCount;
        const sellerRatio = totalUsers > 0 ? Math.round((sellersCount / totalUsers) * 100) : 0;

        const countries = await this.prisma.user.groupBy({
            by: ['country'],
            _count: {
                id: true,
            },
            where: {
                country: { not: null },
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            }
        });

        const usersByCountry = countries.map((c) => ({
            country: c.country,
            count: c._count.id,
        }));

        // Age ranges: 18-24, 25-34, 35-44, 45+
        // Exclude users with missing age
        const ageRanges = await Promise.all([
            this.prisma.user.count({ where: { age: { gte: 18, lte: 24 } } }),
            this.prisma.user.count({ where: { age: { gte: 25, lte: 34 } } }),
            this.prisma.user.count({ where: { age: { gte: 35, lte: 44 } } }),
            this.prisma.user.count({ where: { age: { gte: 45 } } }),
        ]);

        const usersByAgeRange = [
            { range: '18-24', count: ageRanges[0] },
            { range: '25-34', count: ageRanges[1] },
            { range: '35-44', count: ageRanges[2] },
            { range: '45+', count: ageRanges[3] },
        ];

        return {
            totalUsers,
            sellersCount,
            regularUsersCount,
            sellerRatio,
            usersByCountry,
            usersByAgeRange,
        };
    }

    async getUsersList(filters: {
        page?: number;
        limit?: number;
        role?: string;
        country?: string;
        search?: string;
    }) {
        const { page = 1, limit = 20, role, country, search } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (country) {
            where.country = country;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role === 'seller') {
            where.store = { type: StoreType.SELLER };
        } else if (role === 'user') {
            where.OR = [
                { store: null },
                { store: { type: StoreType.ADMIN } },
            ];
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    country: true,
                    age: true,
                    createdAt: true,
                    store: {
                        select: {
                            type: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        const data = users.map((u) => ({
            id: u.id,
            name: u.name,
            country: u.country,
            age: u.age,
            role: u.store?.type === StoreType.SELLER ? 'SELLER' : 'USER',
            createdAt: u.createdAt,
        }));

        return {
            data,
            meta: {
                page,
                limit,
                total,
            },
        };
    }
}
