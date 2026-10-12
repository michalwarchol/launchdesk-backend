import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppException } from '../common/exceptions/app.exception.js';
import { Organization } from './entities/organization.entity.js';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  async updateName(
    organizationId: string,
    name: string,
  ): Promise<{ name: string }> {
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    const trimmed = name.trim();

    if (!trimmed) {
      throw new AppException('nameRequired', HttpStatus.BAD_REQUEST);
    }

    organization.name = trimmed;
    const saved = await this.organizationsRepository.save(organization);

    return { name: saved.name };
  }
}
