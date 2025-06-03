/** npm imports */
import { Module } from '@nestjs/common'

/** local imports */
import { HealthModule } from './health/health.module'

@Module({
  imports: [HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
