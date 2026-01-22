import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

@Injectable()
export class UserGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();

        if (!req.user) {
            throw new ForbiddenException('Unauthorized');
        }

        if (req.user.isAdmin) {
            throw new ForbiddenException('Admins cannot submit product reports');
        }

        return true;
    }
}
