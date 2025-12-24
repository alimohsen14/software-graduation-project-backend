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
} from '@nestjs/common';
import { SellerProductService } from './seller-product.service';
import { SellerOrderService } from './seller-order.service';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { SellerGuard } from 'src/auth/seller.guard';

@Controller('seller')
@UseGuards(JwtAuthGuard, SellerGuard)
export class SellerController {
    constructor(
        private readonly sellerProductService: SellerProductService,
        private readonly sellerOrderService: SellerOrderService,
    ) { }

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

    @Get('orders/:id')
    findOneOrder(@Req() req, @Param('id', ParseIntPipe) id: number) {
        return this.sellerOrderService.findOne(req.user.id, id);
    }
}
