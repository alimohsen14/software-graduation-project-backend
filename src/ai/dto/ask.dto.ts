import { IsString, IsIn } from 'class-validator';

export class AskDto {
  @IsString()
  message: string;

  @IsString()
  @IsIn(['ar', 'en'])
  lang: 'ar' | 'en';
}
