/** npm imports */
import { HttpStatus, Injectable } from '@nestjs/common'

/** local imports */
import { ErrorService } from '../common/services/error.service';

@Injectable()
export class AppService {
  constructor(private readonly errorService: ErrorService) {}
  
  getHello(): string {
    return 'Hello World!'
  }

 /**
 * ❗ Temporary method to test centralized error handling
 * Used in GraphQL query `testServiceError`
 */
  simulateServiceError(): string {
    throw this.errorService.createError(
      'Simulated error from AppService',
      HttpStatus.BAD_REQUEST,
    );
  }
}
