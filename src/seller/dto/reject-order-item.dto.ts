import { IsString, MinLength } from 'class-validator';

export class RejectOrderItemDto {
    @IsString()
    @MinLength(3, { message: 'Rejection reason must be at least 3 characters long' })
    reason: string;
}
