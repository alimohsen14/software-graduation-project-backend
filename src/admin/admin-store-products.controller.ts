
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    UseGuards,
    ParseIntPipe,
    NotFoundException,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductManagementService } from 'src/product/product-management.service';
import { ProductImportService } from 'src/product/product-import.service';
import { StoreService } from 'src/store/store.service';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('admin/store/products')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStoreProductsController {
    constructor(
        private readonly productManagementService: ProductManagementService,
        private readonly productImportService: ProductImportService,
        private readonly storeService: StoreService,
    ) { }

    private async getAdminStoreId(): Promise<number> {
        const store = await this.storeService.getOfficialStoreSafe();
        return store.id;
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    async importProducts(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Validate extension
        if (!file.originalname.match(/\.(xlsx)$/)) {
            throw new BadRequestException('Only .xlsx files are allowed');
        }

        const storeId = await this.getAdminStoreId();
        return this.productImportService.importProducts(storeId, file);
    }

    @Get()
    async findAll() {
        const storeId = await this.getAdminStoreId();
        return this.productManagementService.findAll(storeId);
    }

    @Get('stock-alerts')
    async findLowStockProducts() {
        const storeId = await this.getAdminStoreId();
        return this.productManagementService.getLowStockProducts(storeId);
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const storeId = await this.getAdminStoreId();
        return this.productManagementService.findOne(storeId, id);
    }

    @Post()
    async create(@Body() dto: CreateProductDto) {
        const storeId = await this.getAdminStoreId();
        return this.productManagementService.create(storeId, dto);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductDto,
    ) {
        const storeId = await this.getAdminStoreId();
        return this.productManagementService.update(storeId, id, dto);
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        const storeId = await this.getAdminStoreId();
        return this.productManagementService.remove(storeId, id);
    }
}
