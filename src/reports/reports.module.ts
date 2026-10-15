import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [MailModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
