/* eslint-disable */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    if (!req.user) {
      throw new ForbiddenException('Unauthorized');
    }

    if (!req.user.isAdmin) {
      throw new ForbiddenException('Access denied – Admin only');
    }

    return true;
  }
}
