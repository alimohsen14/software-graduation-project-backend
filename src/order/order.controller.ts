/* eslint-disable */
import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  // ========================
  // USER ENDPOINTS
  // ========================

  /**
   * User: create a new order
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.id;
    return this.orderService.create(userId, createOrderDto);
  }

  // ========================
  // ADMIN ENDPOINTS
  // ========================

  /**
   * Admin: get all orders
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async getAllOrders() {
    return this.orderService.findAll();
  }

  /**
   * Admin: get all pending orders (adminStatus = ADMIN_PENDING)
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('pending')
  async getPendingOrders() {
    return this.orderService.findAllPending();
  }

  /**
   * Admin: approve an order
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/approve')
  async approveOrder(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.approveOrder(id);
  }

  /**
   * Admin: reject an order (requires rejectionReason)
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/reject')
  async rejectOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectOrderDto: RejectOrderDto,
  ) {
    return this.orderService.rejectOrder(id, rejectOrderDto.rejectionReason);
  }
}
