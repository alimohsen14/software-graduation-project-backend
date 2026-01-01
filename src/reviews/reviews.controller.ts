import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('products/:productId/reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    // ========================
    // PUBLIC
    // ========================

    @Get()
    findAll(@Param('productId', ParseIntPipe) productId: number) {
        return this.reviewsService.findAll(productId);
    }

    // ========================
    // AUTH REQUIRED
    // ========================

    @UseGuards(JwtAuthGuard)
    @Post()
    create(
        @Req() req,
        @Param('productId', ParseIntPipe) productId: number,
        @Body() dto: CreateReviewDto,
    ) {
        return this.reviewsService.create(req.user.id, productId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('my')
    update(
        @Req() req,
        @Param('productId', ParseIntPipe) productId: number,
        @Body() dto: UpdateReviewDto,
    ) {
        return this.reviewsService.updateMyReview(req.user.id, productId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('my')
    remove(
        @Req() req,
        @Param('productId', ParseIntPipe) productId: number,
    ) {
        return this.reviewsService.removeMyReview(req.user.id, productId);
    }
}
