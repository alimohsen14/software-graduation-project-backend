import { IsString, IsOptional } from 'class-validator';

export class CreateStoreDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    logo?: string;
}
