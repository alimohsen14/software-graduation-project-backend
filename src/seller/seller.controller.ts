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
    UploadedFile,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SellerProductService } from './seller-product.service';
import { SellerOrderService } from './seller-order.service';
import { StoreService } from 'src/store/store.service';
import { UpdateSellerStoreDto } from 'src/store/dto/update-seller-store.dto';
import cloudinary from '../config/cloudinary';
import { NotificationService } from 'src/notification/notification.service';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { SellerGuard } from 'src/auth/seller.guard';
import { RejectOrderItemDto } from './dto/reject-order-item.dto';

import { SellerProductsImportService } from './seller-products-import.service';

@Controller('seller')
@UseGuards(JwtAuthGuard, SellerGuard)
export class SellerController {
    constructor(
        private readonly sellerProductService: SellerProductService,
        private readonly sellerOrderService: SellerOrderService,
        private readonly notificationService: NotificationService,
        private readonly storeService: StoreService,
        private readonly importService: SellerProductsImportService,
    ) { }

    // ========================
    // PRODUCT IMPORT
    // ========================
    @Post('products/import')
    @UseInterceptors(FileInterceptor('file'))
    async importProducts(@Req() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Validate extension
        if (!file.originalname.match(/\.(xlsx)$/)) {
            throw new BadRequestException('Only .xlsx files are allowed');
        }

        return this.importService.importProducts(req.user.id, file);
    }

    // ========================
    // STORE MANAGEMENT
    // ========================

    @Get('store')
    getStore(@Req() req) {
        return this.storeService.findByOwnerId(req.user.id);
    }

    @Patch('store')
    updateStore(@Req() req, @Body() dto: UpdateSellerStoreDto) {
        return this.storeService.updateByOwnerId(req.user.id, dto);
    }

    @Post('store/logo')
    @UseInterceptors(FileInterceptor('file'))
    async uploadLogo(@Req() req, @UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.uploadToCloudinary(file, 'store-logos');
        return this.storeService.updateStoreLogo(req.user.id, result.secure_url);
    }

    @Post('store/image')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@Req() req, @UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.uploadToCloudinary(file, 'store-banners');
        return this.storeService.updateStoreImage(req.user.id, result.secure_url);
    }

    private async uploadToCloudinary(file: any, folder: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: `soap-shop/${folder}` },
                (error, res) => {
                    if (error) return reject(error);
                    resolve(res);
                },
            );
            uploadStream.end(file.buffer);
        });
    }

    // ========================
    // NOTIFICATION ENDPOINTS
    // ========================

    @Get('notifications')
    getNotifications(@Req() req) {
        return this.notificationService.getUserNotifications(req.user.id);
    }

    // ========================
    // PRODUCT ENDPOINTS
    // ========================

    @Get('products')
    findAllProducts(@Req() req) {
        return this.sellerProductService.findAll(req.user.id);
    }

    @Get('products/:id')
    findOneProduct(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.sellerProductService.findOne(req.user.id, id);
    }

    @Get('stock-alerts')
    findLowStockProducts(@Req() req) {
        return this.sellerProductService.getLowStockProducts(req.user.id);
    }

    @Post('products')
    createProduct(@Req() req, @Body() dto: CreateProductDto) {
        return this.sellerProductService.create(req.user.id, dto);
    }

    @Patch('products/:id')
    updateProduct(
        @Req() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductDto,
    ) {
        return this.sellerProductService.update(req.user.id, id, dto);
    }

    @Delete('products/:id')
    removeProduct(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.sellerProductService.remove(req.user.id, id);
    }

    // ========================
    // ORDER ENDPOINTS
    // ========================

    @Get('orders')
    findAllOrders(@Req() req) {
        return this.sellerOrderService.findAll(req.user.id);
    }

    @Patch('orders/items/:id/approve')
    approveOrderItem(
        @Req() req,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.sellerOrderService.approveOrderItem(id, req.user.id);
    }

    @Patch('orders/items/:id/reject')
    rejectOrderItem(
        @Req() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RejectOrderItemDto,
    ) {
        return this.sellerOrderService.rejectOrderItem(id, req.user.id, dto.reason);
    }
}
