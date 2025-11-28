// src/ai/dto/ask.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['ar', 'en'])
  lang: 'ar' | 'en';

  // ✅ ضيف هذا السطر عشان نستقبل رقم الشات (اختياري)
  @IsOptional()
  @IsNumber()
  chatId?: number;
}
