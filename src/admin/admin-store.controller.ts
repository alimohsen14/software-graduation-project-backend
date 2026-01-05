
import {
    Controller,
    Get,
    Patch,
    Post,
    Body,
    Req,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoreService } from 'src/store/store.service';
import { UpdateStoreDto } from 'src/store/dto/update-store.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import cloudinary from '../config/cloudinary';

@Controller('admin/store')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStoreController {
    constructor(private readonly storeService: StoreService) { }

    private async getAdminStore() {
        return this.storeService.getOfficialStoreSafe();
    }

    @Get()
    async getStore() {
        return this.getAdminStore();
    }

    @Patch()
    async updateStore(@Req() req, @Body() dto: UpdateStoreDto) {
        const store = await this.getAdminStore();
        return this.storeService.update(store.id, req.user.id, true, dto);
    }

    @Post('logo')
    @UseInterceptors(FileInterceptor('file'))
    async uploadLogo(@Req() req, @UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const store = await this.getAdminStore();
        const result = await this.uploadToCloudinary(file, 'store-logos');

        // Update the logo using storeService.updateStoreLogo which uses ownerId.
        // But for Admin store, we might need a version that uses storeId or we can use the ownerId of the admin store.
        return this.storeService.updateStoreLogo(store.ownerId, result.secure_url);
    }

    private async uploadToCloudinary(file: any, folder: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: `palestine3d/${folder}` },
                (error, res) => {
                    if (error) return reject(error);
                    resolve(res);
                },
            );
            uploadStream.end(file.buffer);
        });
    }
}
