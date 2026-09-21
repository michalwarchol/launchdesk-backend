import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: this.config.get<boolean>('SMTP_SECURE'),
      auth:
        this.config.get<string>('SMTP_USER')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASSWORD'),
            }
          : undefined,
    });
  }

  async sendInviteEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const inviteUrl = `${frontendUrl}/invite/accept?token=${token}`;

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM'),
      to: email,
      subject: 'You have been invited to LaunchDesk',
      text: `You have been invited to LaunchDesk. Accept your invitation here: ${inviteUrl}`,
      html: `<p>You have been invited to LaunchDesk.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM'),
      to: email,
      subject: 'Reset your LaunchDesk password',
      text: `Reset your password here: ${resetUrl}`,
      html: `<p>Reset your password by clicking the link below.</p><p><a href="${resetUrl}">Reset password</a></p>`,
    });
  }
}
