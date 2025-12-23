/* eslint-disable */
import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // User: create order
  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.id;
    return this.orderService.create(userId, createOrderDto);
  }

  // Admin: get all orders
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async getAllOrders() {
    return this.orderService.findAll();
  }
}
