import { InitialSchema1700000000000 } from './1700000000000-InitialSchema.js';
import { OrganizationScope1700000001000 } from './1700000001000-OrganizationScope.js';
import { AddOwnerRole1700000002000 } from './1700000002000-AddOwnerRole.js';
import { PromoteEarliestAdminToOwner1700000003000 } from './1700000003000-PromoteEarliestAdminToOwner.js';

export const migrations = [
  InitialSchema1700000000000,
  OrganizationScope1700000001000,
  AddOwnerRole1700000002000,
  PromoteEarliestAdminToOwner1700000003000,
];
