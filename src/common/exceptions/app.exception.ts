import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    message?: string,
  ) {
    super({ code, message: message ?? code }, status);
  }
}
