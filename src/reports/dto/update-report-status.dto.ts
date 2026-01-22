import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateReportStatusDto {
    @IsNotEmpty()
    @IsEnum(['PENDING', 'RESOLVED'])
    status: 'PENDING' | 'RESOLVED';
}
