import { IsString, IsOptional } from 'class-validator';

export class RejectSellerRequestDto {
    @IsString()
    @IsOptional()
    reason?: string;
}
