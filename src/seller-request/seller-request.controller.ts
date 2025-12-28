/* eslint-disable */
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
    ParseIntPipe,
} from '@nestjs/common';
import { SellerRequestService } from './seller-request.service';
import { CreateSellerRequestDto } from './dto/create-seller-request.dto';
import { RejectSellerRequestDto } from './dto/reject-seller-request.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('seller-requests')
export class SellerRequestController {
    constructor(private readonly sellerRequestService: SellerRequestService) { }

    // =========================
    // User: Create seller request
    // =========================
    @UseGuards(JwtAuthGuard)
    @Post()
    createRequest(@Req() req, @Body() dto: CreateSellerRequestDto) {
        return this.sellerRequestService.createRequest(req.user.id, dto);
    }

    // =========================
    // User: Get my request status
    // =========================
    @UseGuards(JwtAuthGuard)
    @Get('my-request')
    getMyRequest(@Req() req) {
        return this.sellerRequestService.getMyRequest(req.user.id);
    }

    // =========================
    // Admin: Get all requests
    // =========================
    @UseGuards(JwtAuthGuard, AdminGuard)
    @Get()
    findAll() {
        return this.sellerRequestService.findAll();
    }

    // =========================
    // Admin: Get pending requests
    // =========================
    @UseGuards(JwtAuthGuard, AdminGuard)
    @Get('pending')
    findAllPending() {
        return this.sellerRequestService.findAllPending();
    }

    // =========================
    // Admin: Get single request
    // =========================
    @UseGuards(JwtAuthGuard, AdminGuard)
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.sellerRequestService.findOne(id);
    }

    // =========================
    // Admin: Approve request
    // =========================
    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post(':id/approve')
    approve(@Param('id', ParseIntPipe) id: number) {
        return this.sellerRequestService.approve(id);
    }

    // =========================
    // Admin: Reject request
    // =========================
    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post(':id/reject')
    reject(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RejectSellerRequestDto,
    ) {
        return this.sellerRequestService.reject(id, dto.reason);
    }
}
