/** npm imports */
import { ConfigService } from '@nestjs/config'
import { Query, Resolver } from '@nestjs/graphql'

/** local imports */
import { ConfigKey } from '../config/enums'

@Resolver()
export class HealthResolver {
  constructor(private readonly configService: ConfigService) {}

  @Query(() => String)
  getHealth(): string {
    return `OK from graphQL: ${this.configService.get<number>(ConfigKey.PORT)}`
  }
}
