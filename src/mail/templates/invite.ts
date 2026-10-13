import { renderEmail, type EmailMessage } from './layout.js';

export interface InviteEmailContext {
  firstName: string;
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
}

export function renderInviteEmail(context: InviteEmailContext): EmailMessage {
  const rendered = renderEmail({
    preheader: `${context.inviterName} invited you to join ${context.organizationName} on LaunchDesk.`,
    heading: 'You are invited',
    paragraphs: [
      `Hi ${context.firstName},`,
      `${context.inviterName} invited you to join ${context.organizationName} on LaunchDesk.`,
      'This invitation expires in 7 days.',
    ],
    buttonLabel: 'Accept invitation',
    buttonUrl: context.inviteUrl,
    footer:
      'You received this email because someone invited you to LaunchDesk.',
  });

  return {
    subject: `You're invited to join ${singleLine(context.organizationName)} on LaunchDesk`,
    ...rendered,
  };
}

function singleLine(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
