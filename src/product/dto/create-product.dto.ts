import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @IsNumber()
  price: number;

  @IsString()
  image: string;

  @IsNumber()
  stock: number;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  badge?: string;
}
