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

@Controller('stores')
export class StoreController {
    constructor(
        private readonly storeService: StoreService,
        private readonly marketplaceService: MarketplaceService,
    ) { }

    // =========================
    // Public: get all stores
    // =========================
    @Get()
    findAll() {
        return this.storeService.findAll();
    }

    // =========================
    // Public: get official store
    // =========================
    @Get('official')
    getOfficialStore() {
        return this.storeService.getOfficialStore();
    }

    // =========================
    // Seller: get my store
    // =========================
    @UseGuards(JwtAuthGuard, SellerGuard)
    @Get('my-store')
    getMyStore(@Req() req) {
        return this.storeService.findByOwnerId(req.user.id);
    }

    // =========================
    // Public: get store by ID
    // =========================
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.storeService.findOne(id);
    }

    // =========================
    // Public: get store products
    // =========================
    @Get(':id/products')
    findStoreProducts(
        @Param('id', ParseIntPipe) id: number,
        @Query() query: MarketplaceQueryDto,
    ) {
        return this.marketplaceService.findProductsByStore(id, query);
    }

    // =========================
    // Seller: create store
    // =========================
    @UseGuards(JwtAuthGuard, SellerGuard)
    @Post()
    create(@Req() req, @Body() dto: CreateStoreDto) {
        return this.storeService.create(req.user.id, dto);
    }

    // =========================
    // Seller/Admin: update store
    // =========================
    @UseGuards(JwtAuthGuard, SellerOrAdminGuard)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Req() req,
        @Body() dto: UpdateStoreDto,
    ) {
        return this.storeService.update(id, req.user.id, req.user.isAdmin, dto);
    }

    // =========================
    // Admin: delete store
    // =========================
    @UseGuards(JwtAuthGuard, AdminGuard)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.storeService.remove(id);
    }
}

