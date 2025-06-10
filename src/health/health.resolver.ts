/** npm imports */
import { ConfigService } from '@nestjs/config'
import { Query, Resolver } from '@nestjs/graphql'

@Resolver()
export class HealthResolver {
  constructor(private readonly configService: ConfigService) {}

  // @Throttle()
  @Query(() => String)
  getHealth(): string {
    return `OK from graphQL: ${this.configService.get('PORT')}`
  }
}
