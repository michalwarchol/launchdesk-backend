import { Body, Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('organizations')
@ApiBearerAuth()
@Roles(UserRole.Owner)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Patch('me')
  update(@CurrentUser() user: User, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.updateName(user.organizationId, dto.name);
  }
}
