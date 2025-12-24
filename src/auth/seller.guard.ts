/* eslint-disable */
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

@Injectable()
export class SellerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();

        if (!req.user) {
            throw new ForbiddenException('Unauthorized');
        }

        if (!req.user.isSeller) {
            throw new ForbiddenException('Access denied – Seller only');
        }

        return true;
    }
}
