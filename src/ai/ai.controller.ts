/* eslint-disable */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AskDto } from './dto/ask.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}


  @Post('ask')
  async ask(@Body() dto: AskDto, @Req() req: any) {
    const userId = req.user.id;
    
    return this.aiService.ask(dto.message, dto.lang, userId, dto.chatId);
  }


  @Get('chats')
  async getChats(@Req() req: any) {
    const userId = req.user.id;
    return this.aiService.getAllChats(userId);
  }

  @Get(':id/messages')
  async getChatMessages(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.aiService.getChatMessages(Number(id), userId);
  }

  @Delete(':id')
  async deleteChat(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.aiService.deleteChat(Number(id), userId);
  }
}
