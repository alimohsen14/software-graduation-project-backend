import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateProductReportDto } from './dto/create-product-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminGuard } from '../auth/admin.guard';
import { UserGuard } from '../auth/user.guard';

@Controller()
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Post('reports/product')
    @UseGuards(JwtAuthGuard, UserGuard)
    async createReport(@Req() req: any, @Body() dto: CreateProductReportDto) {
        return this.reportsService.createReport(req.user, dto);
    }

    @Get('admin/reports')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getAllReports() {
        return this.reportsService.getAllReports();
    }

    @Patch('admin/reports/:id/status')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateReportStatusDto,
    ) {
        return this.reportsService.updateStatus(id, dto.status);
    }
}
