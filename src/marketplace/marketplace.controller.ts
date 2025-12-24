/* eslint-disable */
import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceQueryDto } from './dto/marketplace-query.dto';

@Controller('marketplace')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) { }

    // =========================
    // Public: get all products
    // =========================
    @Get('products')
    findAllProducts(@Query() query: MarketplaceQueryDto) {
        return this.marketplaceService.findAllProducts(query);
    }

    // =========================
    // Public: get categories
    // =========================
    @Get('categories')
    getCategories() {
        return this.marketplaceService.getCategories();
    }
}
