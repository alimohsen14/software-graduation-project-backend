import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductReportDto {
    @IsNotEmpty()
    @IsString()
    productId: string;

    @IsNotEmpty()
    @IsString()
    message: string;
}
