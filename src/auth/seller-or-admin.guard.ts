/* eslint-disable */
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

@Injectable()
export class SellerOrAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();

        if (!req.user) {
            throw new ForbiddenException('Unauthorized');
        }

        if (!req.user.isSeller && !req.user.isAdmin) {
            throw new ForbiddenException('Access denied – Seller or Admin only');
        }

        return true;
    }
}
