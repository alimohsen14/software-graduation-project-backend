import { IsString, IsOptional } from 'class-validator';

export class UpdateSellerStoreDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;
}
