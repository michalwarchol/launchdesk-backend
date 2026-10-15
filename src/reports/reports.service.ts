import { Injectable } from '@nestjs/common';

import { MailService } from '../mail/mail.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly mailService: MailService) {}

  create(reporterEmail: string, dto: CreateReportDto): Promise<void> {
    return this.mailService.sendReportEmail({
      purpose: dto.purpose,
      description: dto.description,
      reporterEmail,
    });
  }
}
