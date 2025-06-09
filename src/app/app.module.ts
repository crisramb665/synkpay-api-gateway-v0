/** npm imports */
import { join } from 'path'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'

/** local imports */
import { HealthModule } from '../health/health.module'
import config from '../config/config'

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
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
