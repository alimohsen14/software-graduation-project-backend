import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    /**
     * Store or update a push token for a user
     */
    async savePushToken(userId: number, token: string, platform?: string) {
        return this.prisma.userDeviceToken.upsert({
            where: { token },
            update: {
                userId,
                platform,
                lastUsedAt: new Date(),
            },
            create: {
                token,
                userId,
                platform,
            },
        });
    }

    /**
     * Get all push tokens for a specific user
     */
    async getUserTokens(userId: number): Promise<string[]> {
        const tokens = await this.prisma.userDeviceToken.findMany({
            where: { userId },
            select: { token: true },
        });
        return tokens.map((t) => t.token);
    }

    /**
     * Get all push tokens for all admin users
     */
    async getAllAdminTokens(): Promise<string[]> {
        const adminTokens = await this.prisma.userDeviceToken.findMany({
            where: {
                user: {
                    isAdmin: true,
                },
            },
            select: { token: true },
        });
        return adminTokens.map((t) => t.token);
    }
}
