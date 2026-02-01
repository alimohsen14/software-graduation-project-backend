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
  ) { }

  private getCookieOptions() {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }
  @Post('signup')
  async signup(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log(`[Auth] Signup attempt for email: ${dto.email}`);
    const result = await this.authService.signup(dto);
    res.cookie('accessToken', result.tokens.accessToken, this.getCookieOptions());
    console.log(`[Auth] Signup successful for email: ${dto.email}`);

    const { tokens, ...response } = result;
    return response;
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    console.log(`[Auth] Login attempt for email: ${dto.email}`);
    const result = await this.authService.login(dto);
    res.cookie('accessToken', result.tokens.accessToken, this.getCookieOptions());
    console.log(`[Auth] Login successful for email: ${dto.email}`);

    const { tokens, ...response } = result;
    return response;
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
  @Get('me')
  async getMe(@Req() req) {
    const userId = req.user.id;
    const user = await this.authService.getUserProfile(userId);
    return user;
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
  async logout(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    // If user is authenticated via cookie, we can get id from req.user
    // If not, we just clear the cookie anyway
    const userId = req.user?.id;
    if (userId) {
      await this.authService.logout(userId);
    }

    res.clearCookie('accessToken', this.getCookieOptions());
    return { message: 'Logout successful' };
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

    // Set cookie for all users
    res.cookie('accessToken', result.tokens.accessToken, this.getCookieOptions());

    if (result.isNewUser) {
      return res.redirect(
        `${frontend}/signup?google=true&email=${encodeURIComponent(
          result.user.email,
        )}`, // Removed token from URL
      );
    }

    // Redirect without token in URL
    return res.redirect(`${frontend}/google-redirect`);
  }

  @Post('complete-google-signup')
  async completeGoogleSignup(
    @Body()
    body: {
      token: string;
      name: string;
      age: number;
      gender: 'MALE' | 'FEMALE';
      country?: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.completeGoogleSignup(body);

    res.cookie('accessToken', result.tokens.accessToken, this.getCookieOptions());

    const { tokens, ...response } = result;
    return response;
  }
}
