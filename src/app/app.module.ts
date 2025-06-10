/** npm imports */
import { join } from 'path'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

/** local imports */
import { HealthModule } from '../health/health.module'
import config from '../config/config'
import { CustomRateLimiterGuard } from '../rate-limit/rate-limit-custom.guard'

const SCHEMA_PATH = join(process.cwd(), 'src/graphql/schema.gql')

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: SCHEMA_PATH,
      sortSchema: true,
      graphiql: false,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
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
