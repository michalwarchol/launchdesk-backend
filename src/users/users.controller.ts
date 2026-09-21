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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination.dto.js';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/user.dto.js';
import { User, UserRole } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user, dto);
  }

  @Post('me/change-password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.Admin)
  create(@CurrentUser() user: User, @Body() dto: CreateUserDto) {
    return this.usersService.create(dto, user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.usersService.remove(id, user.id);
  }

  @Post(':id/resend-invite')
  @Roles(UserRole.Admin)
  @HttpCode(204)
  async resendInvite(@Param('id') id: string) {
    await this.usersService.resendInvite(id);
  }
}
