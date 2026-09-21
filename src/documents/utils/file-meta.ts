import { DocumentType } from '../entities/document.entity.js';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']);
const SPREADSHEET_EXTENSIONS = new Set(['xls', 'xlsx', 'csv']);

export const ACCEPTED_EXTENSIONS = [
  'pdf',
  'docx',
  'txt',
  'xls',
  'xlsx',
  'csv',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
];

export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function getDocumentType(extension: string): DocumentType {
  if (IMAGE_EXTENSIONS.has(extension)) {
    return DocumentType.Image;
  }

  if (SPREADSHEET_EXTENSIONS.has(extension)) {
    return DocumentType.Spreadsheet;
  }

  return DocumentType.Text;
}

export function isAcceptedExtension(extension: string): boolean {
  return ACCEPTED_EXTENSIONS.includes(extension);
}
