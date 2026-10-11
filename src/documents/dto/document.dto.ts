import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class DeleteManyDocumentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];
}
