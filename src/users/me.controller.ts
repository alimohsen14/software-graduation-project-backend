import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { StoreSocialService } from 'src/store/store-social.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
    constructor(
        private readonly storeSocialService: StoreSocialService,
    ) { }

    @Get('followed-stores')
    getFollowedStores(@Req() req) {
        return this.storeSocialService.getFollowedStores(req.user.id);
    }

    @Get('favorite-stores')
    getFavoriteStores(@Req() req) {
        return this.storeSocialService.getFavoriteStores(req.user.id);
    }
}
