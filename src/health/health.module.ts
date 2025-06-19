/** npm imports */
import { Module } from '@nestjs/common'

/** local imports */
import { HealthResolver } from './health.resolver'

@Module({
  providers: [HealthResolver],
})
export class HealthModule {}
