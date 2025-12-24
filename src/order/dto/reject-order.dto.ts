import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RejectOrderDto {
    @IsString()
    @IsNotEmpty({ message: 'Rejection reason is required' })
    @MinLength(5, { message: 'Rejection reason must be at least 5 characters' })
    rejectionReason: string;
}
