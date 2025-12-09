import { IsString, IsOptional, MinLength, IsNumber, Min, IsEnum } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Age must be a positive number' })
  age?: number;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE'], { message: 'Gender must be either MALE or FEMALE' })
  gender?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsString()
  country?: string;
}