/**
 * ⚠️ Temporary service for manual testing only.
 * Will be removed once error handling is validated.
 */

/** npm imports */
import { Query, Resolver } from '@nestjs/graphql'

/** local imports */
import { TestErrorService } from './test-error.service'

@Resolver()
export class TestErrorResolver {
  constructor(private readonly testErrorService: TestErrorService) {}

  @Query(() => String)
  testServiceError(): string {
    return this.testErrorService.simulateError()
  }
}
