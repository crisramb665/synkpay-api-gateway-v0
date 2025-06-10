/** npm imports */
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

/** local imports */
import { HealthModule } from './health/health.module'
import config from './config/config'
import { CustomRateLimiterGuard } from './rate-limit/rate-limit-custom.guard'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ([{
        ttl: (configService.get<number>('RATE_LIMIT_WINDOW_SEC') ?? 60), 
        limit: configService.get<number>('RATE_LIMIT_GLOBAL') ?? 10,
      }]),
    }),
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomRateLimiterGuard,
    },
  ],
})
export class AppModule {}
