/** npm imports */
import { forwardRef, Module } from '@nestjs/common'

/** local imports */
import { HealthController } from './health.controller'
import { HealthResolver } from './health.resolver'
import { AppModule } from 'src/app/app.module'

@Module({
  imports: [forwardRef(() => AppModule)],
  controllers: [HealthController],
  providers: [HealthResolver],
})
export class HealthModule {}
