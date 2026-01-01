import { Controller, Post, Body, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('mock')
    async createMockPayment(
        @Req() req,
        @Body('orderId', ParseIntPipe) orderId: number,
    ) {
        return this.paymentService.createMockPayment(req.user.id, orderId);
    }
}
