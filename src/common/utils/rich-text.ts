export function isRichTextBlank(html: string | undefined | null): boolean {
  if (!html) return true;

  const withoutTags = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '')
    .replace(/\s+/g, '');

  return withoutTags.length === 0;
}
