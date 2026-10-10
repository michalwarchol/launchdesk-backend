import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssignmentAssignee } from '../assignments/entities/assignment-assignee.entity.js';
import { InviteToken } from '../auth/entities/invite-token.entity.js';
import { MailModule } from '../mail/mail.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, InviteToken, AssignmentAssignee]),
    MailModule,
    StorageModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
