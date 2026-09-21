import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppException } from '../common/exceptions/app.exception.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
  parseSort,
  PaginationQueryDto,
} from '../common/dto/pagination.dto.js';
import { StorageService } from '../storage/storage.service.js';
import { UploadedFile } from '../common/types/uploaded-file.js';
import { User } from '../users/entities/user.entity.js';
import { UpdateDocumentDto } from './dto/document.dto.js';
import { DocumentResponseDto } from './dto/document-response.dto.js';
import { Document } from './entities/document.entity.js';
import {
  getDocumentType,
  getExtension,
  isAcceptedExtension,
} from './utils/file-meta.js';

const DOCUMENT_SORT_KEYS = ['name', 'type', 'size', 'createdAt'] as const;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<DocumentResponseDto>> {
    const sort = parseSort(query.sort, DOCUMENT_SORT_KEYS);
    const qb = this.documentsRepository.createQueryBuilder('document');

    qb.orderBy(
      sort ? `document.${sort.key}` : 'document.createdAt',
      sort?.direction ?? 'DESC',
    );

    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);

    const [documents, total] = await qb.getManyAndCount();

    return {
      data: documents.map((document) => this.toResponse(document)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findOne(id: string): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findOne({ where: { id } });

    if (!document) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    return this.toResponse(document);
  }

  async upload(files: UploadedFile[], user: User): Promise<DocumentResponseDto[]> {
    const saved: Document[] = [];

    for (const file of files) {
      const extension = getExtension(file.originalname);

      if (!isAcceptedExtension(extension)) {
        throw new AppException('invalidFileType', HttpStatus.BAD_REQUEST);
      }

      const s3Key = await this.storageService.uploadObject(
        file.buffer,
        file.mimetype,
        extension,
      );

      const document = await this.documentsRepository.save(
        this.documentsRepository.create({
          name: file.originalname,
          type: getDocumentType(extension),
          extension,
          size: String(file.size),
          mimeType: file.mimetype,
          s3Key,
          uploadedById: user.id,
        }),
      );

      saved.push(document);
    }

    return saved.map((document) => this.toResponse(document));
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findOne({ where: { id } });

    if (!document) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    document.name = dto.name.trim();
    const saved = await this.documentsRepository.save(document);
    return this.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const document = await this.documentsRepository.findOne({ where: { id } });

    if (!document) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    await this.storageService.deleteObject(document.s3Key);
    await this.documentsRepository.remove(document);
  }

  async getDownloadUrl(id: string): Promise<string> {
    const document = await this.documentsRepository.findOne({ where: { id } });

    if (!document) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    return this.storageService.getPresignedDownloadUrl(document.s3Key);
  }

  toResponse(document: Document): DocumentResponseDto {
    return {
      id: document.id,
      name: document.name,
      type: document.type,
      extension: document.extension,
      size: Number(document.size),
      createdAt: document.createdAt.toISOString().slice(0, 10),
    };
  }
}
