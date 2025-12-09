/* eslint-disable */
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  Res,
  Patch,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('signup')
  signup(@Body() dto: SignUpDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refreshAccessToken(token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Req() req) {
    const userId = req.user.id;
    const user = await this.authService.getUserProfile(userId);
    return { message: 'User profile fetched successfully', user };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile/update')
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    const userId = req.user.id;
    const updatedUser = await this.authService.updateUserProfile(userId, dto);
    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile/password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.id;
    await this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
    return { message: 'Password updated successfully' };
  }

  @Post('logout')
  logout(@Body('userId') userId: number) {
    return this.authService.logout(userId);
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const result = await this.authService.googleLogin(code);

    const frontend =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';

    const token = encodeURIComponent(result.tokens.accessToken);

    if (result.isNewUser) {
      return res.redirect(
        `${frontend}/signup?google=true&email=${encodeURIComponent(
          result.user.email,
        )}&token=${token}`,
      );
    }

    return res.redirect(`${frontend}/google-redirect?token=${token}`);
  }

  @Post('complete-google-signup')
  completeGoogleSignup(
    @Body()
    body: {
      token: string;
      name: string;
      age: number;
      gender: 'MALE' | 'FEMALE';
      country?: string;
    },
  ) {
    return this.authService.completeGoogleSignup(body);
  }
}
