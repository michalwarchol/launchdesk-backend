export interface EmailLayout {
  preheader: string;
  heading: string;
  paragraphs: string[];
  buttonLabel: string;
  buttonUrl: string;
  footer: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

export interface EmailMessage extends RenderedEmail {
  subject: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderEmail(layout: EmailLayout): RenderedEmail {
  const heading = escapeHtml(layout.heading);
  const buttonLabel = escapeHtml(layout.buttonLabel);
  const buttonUrl = escapeHtml(layout.buttonUrl);
  const paragraphs = layout.paragraphs
    .map(
      (paragraph) =>
        `<tr><td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#1c1f26;">${escapeHtml(paragraph)}</td></tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f4ef;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(layout.preheader)}</div>
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
          ${paragraphs}
          <tr>
            <td style="padding:24px 32px 0;">
              <a href="${buttonUrl}" style="display:inline-block;background-color:#f5c26b;color:#1c1f26;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:20px;text-decoration:none;padding:12px 20px;border-radius:8px;">${buttonLabel}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6b7280;">If the button does not work, copy this link into your browser:<br><a href="${buttonUrl}" style="color:#1c1f26;word-break:break-all;">${buttonUrl}</a></td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #eeeae3;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">${escapeHtml(layout.footer)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    layout.heading,
    '',
    ...layout.paragraphs,
    '',
    `${layout.buttonLabel}: ${layout.buttonUrl}`,
    '',
    layout.footer,
  ].join('\n');

  return { html, text };
}
