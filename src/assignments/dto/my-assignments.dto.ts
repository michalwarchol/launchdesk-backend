import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto.js";

export class MyAssignmentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
