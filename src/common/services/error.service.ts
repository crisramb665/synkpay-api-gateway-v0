/** npm imports */
import { Injectable, HttpStatus, HttpException } from '@nestjs/common';

/** local imports */
import { ResponseError } from '../responses/response-error';

@Injectable()
export class ErrorService {
  createError(message: string, status: number = HttpStatus.INTERNAL_SERVER_ERROR): ResponseError {
    return new ResponseError(message, status);
  }

  fromException(exception: unknown): ResponseError {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res['message']) {
        message = Array.isArray(res['message']) ? res['message'][0] : res['message'];
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    return new ResponseError(message, status);
  }
}
