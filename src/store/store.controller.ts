/* eslint-disable */
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    UseGuards,
    Req,
    ParseIntPipe,
    Query,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import { SellerGuard } from 'src/auth/seller.guard';
import { SellerOrAdminGuard } from 'src/auth/seller-or-admin.guard';
import { MarketplaceService } from 'src/marketplace/marketplace.service';
import { MarketplaceQueryDto } from 'src/marketplace/dto/marketplace-query.dto';

import { StoreSocialService } from './store-social.service';

@Controller('stores')
export class StoreController {
    constructor(
        private readonly storeService: StoreService,
        private readonly marketplaceService: MarketplaceService,
        private readonly storeSocialService: StoreSocialService,
    ) { }

    // ... (existing code)

    // =========================
    // Admin: delete store
    // =========================
    @UseGuards(JwtAuthGuard, AdminGuard)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.storeService.remove(id);
    }

    // =========================
    // SOCIAL ACTIONS
    // =========================
    @Post(':id/follow')
    @UseGuards(JwtAuthGuard)
    followStore(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.storeSocialService.followStore(req.user.id, id);
    }

    @Delete(':id/follow')
    @UseGuards(JwtAuthGuard)
    unfollowStore(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.storeSocialService.unfollowStore(req.user.id, id);
    }

    @Post(':id/favorite')
    @UseGuards(JwtAuthGuard)
    favoriteStore(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.storeSocialService.favoriteStore(req.user.id, id);
    }

    @Delete(':id/favorite')
    @UseGuards(JwtAuthGuard)
    unfavoriteStore(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.storeSocialService.unfavoriteStore(req.user.id, id);
    }

    @Get(':id/social-status')
    @UseGuards(JwtAuthGuard)
    getSocialStatus(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.storeSocialService.getStoreSocialStatus(req.user.id, id);
    }
}

