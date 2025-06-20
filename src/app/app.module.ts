/** npm imports */
import { join } from 'path'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

/** local imports */
import { HealthModule } from '../health/health.module'
import config from '../config/config'
import { GqlThrottlerGuard } from '../rate-limit/rate-limit-custom.guard'
import { AuthModule } from '../microservices/auth/auth.module'
import { formatGraphQLError } from '../graphql/format-error'
import { TestErrorResolver } from '../../test/test-error/test-error.resolver'
import { TestErrorService } from '../../test/test-error/test-error.service'

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
      context: ({ req, res }) => ({ req, res }),
      formatError: formatGraphQLError,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => {
        return {
          throttlers: [
            {
              ttl: configService.get<number>('RATE_LIMIT_WINDOW_MS') || 60000,
              limit: configService.get<number>('RATE_LIMIT_GLOBAL') || 10,
            },
          ],
        }
      },
    }),
    HealthModule,
    AuthModule,
  ],
  controllers: [],
  providers: [
    TestErrorResolver,
    TestErrorService,
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class AppModule {}
