import { Injectable } from '@nestjs/common';
import { BadgeConfig } from './interfaces/badges.interface';

/**
 * Centralized configuration for badge thresholds.
 * Values can be overridden via environment variables.
 */
@Injectable()
export class BadgeConfigService {
    private readonly config: BadgeConfig;

    constructor() {
        this.config = {
            newProductDays: parseInt(process.env.BADGE_NEW_DAYS || '3', 10),
            lowStockThreshold: parseInt(process.env.BADGE_LOW_STOCK_THRESHOLD || '10', 10),
            bestSellerThreshold: parseInt(process.env.BADGE_BEST_SELLER_THRESHOLD || '30', 10),
            bestSellerDays: parseInt(process.env.BADGE_BEST_SELLER_DAYS || '30', 10),
            hotSalesThreshold: parseInt(process.env.BADGE_HOT_SALES_THRESHOLD || '20', 10),
        };
    }

    getConfig(): BadgeConfig {
        return { ...this.config };
    }

    getNewProductDays(): number {
        return this.config.newProductDays;
    }

    getLowStockThreshold(): number {
        return this.config.lowStockThreshold;
    }

    getBestSellerThreshold(): number {
        return this.config.bestSellerThreshold;
    }

    getBestSellerDays(): number {
        return this.config.bestSellerDays;
    }

    getHotSalesThreshold(): number {
        return this.config.hotSalesThreshold;
    }
}
