/** npm imports */
import { ConfigService } from '@nestjs/config'
import { Query, Resolver } from '@nestjs/graphql'

/** local imports */
import { AppService } from 'src/app/app.service';

@Resolver()
export class HealthResolver {
  constructor(private readonly configService: ConfigService,
    private readonly appService: AppService,
  ) {}

  @Query(() => String)
  getHealth(): string {
    throw new Error('Simulated error from GraphQL');
  }

   /**
 * ❗ Temporary query to test error handling logic via service
 */
  @Query(() => String)
  testServiceError(): string {
    return this.appService.simulateServiceError();
  }
}
