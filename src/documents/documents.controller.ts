import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Redirect,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UploadedFile } from '../common/types/uploaded-file.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination.dto.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { DocumentsService } from './documents.service.js';
import { UpdateDocumentDto } from './dto/document.dto.js';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.documentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.Admin)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
  upload(
    @UploadedFiles() files: UploadedFile[],
    @CurrentUser() user: User,
  ) {
    return this.documentsService.upload(files ?? [], user);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.documentsService.remove(id);
  }

  @Get(':id/download')
  @Redirect()
  async download(@Param('id') id: string) {
    const url = await this.documentsService.getDownloadUrl(id);
    return { url, statusCode: 302 };
  }
}
