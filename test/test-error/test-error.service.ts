/**
 * ⚠️ Temporary service for manual testing only.
 * Will be removed once error handling is validated.
 */

/** npm imports */
import { Injectable } from '@nestjs/common'

/** graphql imports */
import { CustomGraphQLError } from '../../src/common/errors/custom-graphql.error'

@Injectable()
export class TestErrorService {
  simulateError(): string {
    throw new CustomGraphQLError('Simulated error from TestErrorService', 400, false, true)
  }
}
