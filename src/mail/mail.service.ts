import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

import { renderInviteEmail } from './templates/invite.js';
import type { EmailMessage } from './templates/layout.js';
import { renderPasswordResetEmail } from './templates/password-reset.js';
import {
  renderReportEmail,
  type ReportEmailContext,
} from './templates/report.js';
import { renderWelcomeEmail } from './templates/welcome.js';

export interface InviteEmailDetails {
  firstName: string;
  inviterName: string;
  organizationName: string;
}

export interface PasswordResetEmailDetails {
  firstName: string;
}

export interface WelcomeEmailDetails {
  firstName: string;
  organizationName: string;
}

@Injectable()
export class MailService {
  private readonly transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: this.config.get<boolean>('SMTP_SECURE'),
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASSWORD'),
          }
        : undefined,
    });
  }

  async sendInviteEmail(
    email: string,
    token: string,
    details: InviteEmailDetails,
  ): Promise<void> {
    const inviteUrl = `${this.frontendUrl()}/invite/accept?token=${encodeURIComponent(token)}`;

    await this.send(
      email,
      renderInviteEmail({
        ...details,
        inviteUrl,
      }),
    );
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    details: PasswordResetEmailDetails,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    await this.send(
      email,
      renderPasswordResetEmail({
        firstName: details.firstName,
        resetUrl,
      }),
    );
  }

  async sendWelcomeEmail(
    email: string,
    details: WelcomeEmailDetails,
  ): Promise<void> {
    await this.send(
      email,
      renderWelcomeEmail({
        firstName: details.firstName,
        organizationName: details.organizationName,
        loginUrl: `${this.frontendUrl()}/login`,
      }),
    );
  }

  async sendReportEmail(details: ReportEmailContext): Promise<void> {
    const to = this.config.get<string>('REPORT_EMAIL');

    if (!to) {
      throw new Error('REPORT_EMAIL is not configured');
    }

    await this.send(to, renderReportEmail(details), {
      replyTo: details.reporterEmail,
    });
  }

  private frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? '';
  }

  private async send(
    email: string,
    message: EmailMessage,
    options?: { replyTo?: string },
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM'),
      to: email,
      replyTo: options?.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
