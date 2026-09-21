import { AssignmentAssignee } from '../assignments/entities/assignment-assignee.entity.js';
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { OAuthExchangeCode } from '../auth/entities/oauth-exchange-code.entity.js';
import { InviteToken } from '../auth/entities/invite-token.entity.js';
import { OAuthAccount } from '../auth/entities/oauth-account.entity.js';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity.js';
import { RefreshToken } from '../auth/entities/refresh-token.entity.js';
import { Document } from '../documents/entities/document.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { TaskStepAttachment } from '../tasks/entities/task-step-attachment.entity.js';
import { TaskStep } from '../tasks/entities/task-step.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { User } from '../users/entities/user.entity.js';

export const entities = [
  Organization,
  User,
  RefreshToken,
  InviteToken,
  PasswordResetToken,
  OAuthAccount,
  OAuthExchangeCode,
  Task,
  TaskStep,
  TaskStepAttachment,
  Document,
  Assignment,
  AssignmentAssignee,
];
