import { renderEmail, type EmailMessage } from './layout.js';

export interface WelcomeEmailContext {
  firstName: string;
  organizationName: string;
  loginUrl: string;
}

export function renderWelcomeEmail(context: WelcomeEmailContext): EmailMessage {
  const rendered = renderEmail({
    preheader: `${context.organizationName} is ready on LaunchDesk.`,
    heading: 'Welcome to LaunchDesk',
    paragraphs: [
      `Hi ${context.firstName},`,
      `${context.organizationName} is ready on LaunchDesk. Sign in to start setting up your workspace.`,
    ],
    buttonLabel: 'Go to LaunchDesk',
    buttonUrl: context.loginUrl,
    footer: 'You received this email because you created a LaunchDesk account.',
  });

  return {
    subject: 'Welcome to LaunchDesk',
    ...rendered,
  };
}
