// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'; // استورد JwtModuleOptions
import { JwtStrategy } from './jwt.strategy';
import { MailService } from 'src/mail/mail.service'; // استيراد MailService
import { ConfigModule, ConfigService } from '@nestjs/config'; // استيراد ConfigModule و ConfigService

@Module({
  imports: [
    ConfigModule, // يجب استيراد ConfigModule هنا
    JwtModule.registerAsync({
      imports: [ConfigModule], // يجب استيراد ConfigModule هنا أيضاً
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
          throw new Error(
            'JWT_ACCESS_SECRET is not defined in environment variables',
          );
        }

        const expiresInString = configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
        );
        if (!expiresInString) {
          throw new Error(
            'JWT_ACCESS_EXPIRES_IN is not defined in environment variables',
          );
        }
        const expiresIn = parseInt(expiresInString, 10);
        if (isNaN(expiresIn)) {
          throw new Error('JWT_ACCESS_EXPIRES_IN must be a number (seconds)');
        }

        return {
          secret: secret,
          signOptions: {
            expiresIn: expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, MailService], // أضف MailService هنا
  exports: [AuthService, MailService], // قم بتصديره إذا أردت استخدامه في وحدات أخرى
})
export class AuthModule {}
