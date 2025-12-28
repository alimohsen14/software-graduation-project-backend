import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SellerGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        if (!req.user || !req.user.id) {
            throw new UnauthorizedException('Unauthorized');
        }

        // Fetch fresh user data from DB
        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { store: true },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Check if user is a seller
        if (!user.isSeller) {
            throw new ForbiddenException('Access denied – Seller account required');
        }

        // Check if seller has an active store
        if (!user.store) {
            throw new ForbiddenException('Access denied – No active store found');
        }

        // Attach fresh user & store to request for downstream use (optional but helpful)
        req.user = user;

        return true;
    }
}
