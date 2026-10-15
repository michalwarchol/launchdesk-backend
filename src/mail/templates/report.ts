import { escapeHtml, type EmailMessage } from './layout.js';

export interface ReportEmailContext {
  purpose: 'bug' | 'feature' | 'other';
  description: string;
  reporterEmail: string;
}

const PURPOSE_LABEL = {
  bug: 'Bug report',
  feature: 'Feature request',
  other: 'Other',
} as const;

const PURPOSE_SUBJECT = {
  bug: 'LaunchDesk bug report',
  feature: 'LaunchDesk feature request',
  other: 'LaunchDesk report',
} as const;

export function renderReportEmail(context: ReportEmailContext): EmailMessage {
  const purposeLabel = PURPOSE_LABEL[context.purpose];
  const subject = PURPOSE_SUBJECT[context.purpose];
  const heading = escapeHtml(subject);
  const description = escapeHtml(context.description).replaceAll('\n', '<br>');
  const reporterEmail = escapeHtml(context.reporterEmail);
  const purpose = escapeHtml(purposeLabel);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f4ef;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f4ef;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:28px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#1c1f26;">LaunchDesk</td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:32px;font-weight:bold;color:#1c1f26;">${heading}</td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#1c1f26;">Purpose: ${purpose}</td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#1c1f26;">From: ${reporterEmail}</td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#1c1f26;">${description}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    '',
    `Purpose: ${purposeLabel}`,
    `From: ${context.reporterEmail}`,
    '',
    context.description,
  ].join('\n');

  return { subject, html, text };
}
