import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Directories } from './utils/directories.js';

function buildAttachmentDisposition(filename: string): string {
  const clean = filename.replace(/[\r\n]/g, ' ').trim();
  const asciiFallback = clean.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(clean).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('AWS_S3_BUCKET')!;
    this.client = new S3Client({
      region: this.config.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });
  }

  async uploadObject(
    dir: Directories,
    buffer: Buffer,
    mimeType: string,
    extension: string,
  ): Promise<string> {
    const key = `${dir}/${randomUUID()}.${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return key;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /** Returns `false` when the object is absent from the bucket; other S3 failures are rethrown. */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };

      if (
        err.name === 'NotFound' ||
        err.name === 'NoSuchKey' ||
        err.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }

      throw error;
    }
  }

  async getPresignedDownloadUrl(key: string, filename?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(filename
        ? { ResponseContentDisposition: buildAttachmentDisposition(filename) }
        : {}),
    });

    return getSignedUrl(this.client, command, { expiresIn: 300 });
  }

  /** Returns a presigned URL for a stored key, or `undefined` when there is no key. */
  async resolveDownloadUrl(key: string | null | undefined): Promise<string | undefined> {
    if (!key) return undefined;

    return this.getPresignedDownloadUrl(key);
  }
}
