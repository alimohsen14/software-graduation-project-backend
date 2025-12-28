import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @Type(() => Number)
  @IsNumber()
  price: number;

  @IsString()
  image: string;

  @Type(() => Number)
  @IsNumber()
  stock: number;

  @IsString()
  category: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isHot?: boolean;

  @IsString()
  @IsOptional()
  badge?: string;
}
