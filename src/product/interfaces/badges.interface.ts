/**
 * Product Badges Interface
 * Defines the structure for product badge states
 */
export interface ProductBadges {
    /** Product is out of stock (stock === 0) - Highest priority */
    isSoldOut: boolean;
    /** Stock is low but available (0 < stock <= threshold) - Warning only */
    isLowStock: boolean;
    /** Product created within last 7 days */
    isNew: boolean;
    /** Manually marked as HOT by admin */
    isHot: boolean;
    /** Sales exceeded threshold in last 30 days */
    isBestSeller: boolean;
}

/**
 * Badge configuration thresholds
 */
export interface BadgeConfig {
    /** Number of days a product is considered NEW (default: 7) */
    newProductDays: number;
    /** Stock threshold for LOW STOCK warning (default: 10) */
    lowStockThreshold: number;
    /** Minimum units sold to qualify as BEST SELLER (default: 200) */
    bestSellerThreshold: number;
    /** Time window in days for best seller calculation (default: 30) */
    bestSellerDays: number;
    /** Minimum units sold in last 24h to qualify as HOT (default: 20) */
    hotSalesThreshold: number;
}
