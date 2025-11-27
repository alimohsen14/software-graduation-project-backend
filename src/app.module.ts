import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [UsersModule, AuthModule, AiModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
