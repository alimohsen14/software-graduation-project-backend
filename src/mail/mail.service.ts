import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const oAuth2Client = new google.auth.OAuth2(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      'https://developers.google.com/oauthplayground', // redirect URI
    );

    oAuth2Client.setCredentials({
      refresh_token: this.config.get<string>('GOOGLE_REFRESH_TOKEN'),
    });

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: this.config.get<string>('SMTP_USER'),
        clientId: this.config.get<string>('GOOGLE_CLIENT_ID'),
        clientSecret: this.config.get<string>('GOOGLE_CLIENT_SECRET'),
        refreshToken: this.config.get<string>('GOOGLE_REFRESH_TOKEN'),
      },
    });
  }

  async sendPasswordReset(email: string, token: string) {
    const frontend =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    const from =
      this.config.get<string>('MAIL_FROM') ||
      this.config.get<string>('SMTP_USER');

    const resetLink = `${frontend}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: '🔒 Reset your Palestine3D Password',
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.5">
            <h3>Hi ${email}</h3>
            <p>You requested to reset your password for <strong>Palestine 3D</strong>.</p>
            <p>Click below to reset your password (link expires in 10 minutes):</p>
            <a href="${resetLink}" style="display:inline-block;background:#1976d2;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
              Reset Password
            </a>
            <p style="margin-top:1rem;color:#666">If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
      console.log('✅ Email sent successfully');
    } catch (err) {
      console.error('❌ Email send error:', err);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
