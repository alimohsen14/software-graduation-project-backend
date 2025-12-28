import { IsString, IsOptional } from 'class-validator';

export class CreateSellerRequestDto {
    @IsString()
    storeName: string;

    @IsString()
    @IsOptional()
    storeImage?: string;

    @IsString()
    @IsOptional()
    message?: string;

    @IsString()
    @IsOptional()
    productType?: string;

    @IsString()
    @IsOptional()
    region?: string;
}
