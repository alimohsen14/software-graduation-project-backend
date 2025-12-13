/* eslint-disable */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Provider, Gender, User } from '@prisma/client';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ----------------------------------------------------
  // 🔹 SIGNUP (Normal)
  // ----------------------------------------------------
  async signup(dto: SignUpDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new BadRequestException('Email already registered');

    const hashedPassword = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : null;

    const normalizedGender =
      dto.gender?.toUpperCase() === 'FEMALE' ? Gender.FEMALE : Gender.MALE;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        country: dto.country ?? '',
        age: dto.age ?? 0,
        gender: normalizedGender,
        provider: Provider.LOCAL,
      },
    });

    const tokens = await this.generateTokens(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return { message: 'Signup successful', user, tokens };
  }

  // ----------------------------------------------------
  // 🔹 LOGIN (Normal)
  // ----------------------------------------------------
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new BadRequestException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password ?? '');
    if (!isMatch) throw new BadRequestException('Invalid credentials');
    const tokens = await this.generateTokens(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return { message: 'Login successful', user, tokens };
  }

  // ----------------------------------------------------
  // 🔹 GOOGLE LOGIN (OAuth)
  // ----------------------------------------------------
  async googleLogin(code: string) {
    const client_id = this.config.get<string>('GOOGLE_CLIENT_ID')!;
    const client_secret = this.config.get<string>('GOOGLE_CLIENT_SECRET')!;
    const redirect_uri = this.config.get<string>('GOOGLE_REDIRECT_URI')!;

    // 1️⃣ Get tokens from Google
    const tokenRes = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id,
        client_secret,
        redirect_uri,
        grant_type: 'authorization_code',
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token } = tokenRes.data;

    if (!access_token)
      throw new BadRequestException('Google login failed: token missing');

    // 2️⃣ Get user info
    const userInfoRes = await axios.get<GoogleUserInfo>(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    const { email, name, id: googleId } = userInfoRes.data;

    if (!email) throw new BadRequestException('Google account has no email');

    // 3️⃣ Find or create user
    let user = await this.prisma.user.findUnique({ where: { email } });
    let isNewUser = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: name ?? 'Google User',
          email,
          password: null,
          provider: Provider.GOOGLE,
          providerId: googleId,
          age: 0,
          country: '',
          gender: Gender.MALE,
        },
      });
      isNewUser = true;
    }

    const tokens = await this.generateTokens(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return { isNewUser, user, tokens };
  }

  // ----------------------------------------------------
  // 🔹 COMPLETE GOOGLE SIGNUP (Finish profile)
  // ----------------------------------------------------
  async completeGoogleSignup(body: {
    token: string;
    name: string;
    age: number;
    gender: 'MALE' | 'FEMALE';
    country?: string;
  }) {
    const { token, name, age, gender, country } = body;

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) throw new BadRequestException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        age,
        country: country ?? '',
        gender: gender === 'FEMALE' ? Gender.FEMALE : Gender.MALE,
      },
    });

    const newTokens = await this.generateTokens(user.id);

    return {
      message: 'Google signup completed',
      user: updated,
      tokens: newTokens,
    };
  }

  // ----------------------------------------------------
  // 🔹 GET USER PROFILE
  // ----------------------------------------------------
  async getUserProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        provider: true,
        age: true,
        gender: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  // ----------------------------------------------------
  // 🔹 UPDATE USER PROFILE
  // ----------------------------------------------------
  async updateUserProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        age: dto.age,
        gender: dto.gender,
        country: dto.country,
      },
      select: {
        id: true,
        name: true,
        email: true,
        provider: true,
        age: true,
        gender: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // ----------------------------------------------------
  // 🔹 CHANGE PASSWORD
  // ----------------------------------------------------
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Get the user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user is a Google user
    if (user.provider === Provider.GOOGLE) {
      throw new BadRequestException('Google users cannot change password');
    }

    // Verify old password
    if (!user.password) {
      throw new BadRequestException('Password not set for this user');
    }
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid current password');
    }

    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  // ----------------------------------------------------
  // 🔹 REFRESH TOKEN
  // ----------------------------------------------------
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      return {
        accessToken: this.jwtService.sign(
          { id: payload.id },
          { expiresIn: '15m' },
        ),
      };
    } catch {
      throw new BadRequestException('Invalid refresh token');
    }
  }

  // ----------------------------------------------------
  // 🔹 LOGOUT
  // ----------------------------------------------------
  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logout successful' };
  }

  // ----------------------------------------------------
  // 🔹 FORGOT PASSWORD
  // ----------------------------------------------------
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new BadRequestException('User with this email not found');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    await this.mailService.sendPasswordReset(email, token);

    return { message: 'Password reset email sent successfully' };
  }

  // ----------------------------------------------------
  // 🔹 RESET PASSWORD
  // ----------------------------------------------------
  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired token');

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password reset successful' };
  }

  // ----------------------------------------------------
  // 🔹 TOKEN GENERATOR
  // ----------------------------------------------------
  private async generateTokens(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isSeller: true, isAdmin: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const payload = {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }
}
