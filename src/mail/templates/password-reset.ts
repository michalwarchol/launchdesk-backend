import { renderEmail, type EmailMessage } from './layout.js';

export interface PasswordResetEmailContext {
  firstName: string;
  resetUrl: string;
}

export function renderPasswordResetEmail(
  context: PasswordResetEmailContext,
): EmailMessage {
  const rendered = renderEmail({
    preheader: 'Reset your LaunchDesk password. This link expires in 1 hour.',
    heading: 'Reset your password',
    paragraphs: [
      `Hi ${context.firstName},`,
      'We received a request to reset the password for your LaunchDesk account.',
      'This link expires in 1 hour. If you did not request a reset, you can ignore this email.',
    ],
    buttonLabel: 'Reset password',
    buttonUrl: context.resetUrl,
    footer:
      'You received this email because a password reset was requested for your LaunchDesk account.',
  });

  return {
    subject: 'Reset your LaunchDesk password',
    ...rendered,
  };
}
