import { InitialSchema1700000000000 } from './1700000000000-InitialSchema.js';
import { OrganizationScope1700000001000 } from './1700000001000-OrganizationScope.js';
import { AddOwnerRole1700000002000 } from './1700000002000-AddOwnerRole.js';
import { PromoteEarliestAdminToOwner1700000003000 } from './1700000003000-PromoteEarliestAdminToOwner.js';
import { AssignmentStepCompletions1700000004000 } from './1700000004000-AssignmentStepCompletions.js';
import { AssignmentStepNotes1700000005000 } from './1700000005000-AssignmentStepNotes.js';
import { AssignmentNotificationEmails1700000006000 } from './1700000006000-AssignmentNotificationEmails.js';

export const migrations = [
  InitialSchema1700000000000,
  OrganizationScope1700000001000,
  AddOwnerRole1700000002000,
  PromoteEarliestAdminToOwner1700000003000,
  AssignmentStepCompletions1700000004000,
  AssignmentStepNotes1700000005000,
  AssignmentNotificationEmails1700000006000,
];
