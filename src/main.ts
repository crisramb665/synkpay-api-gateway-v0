/** npm imports */
import { join } from 'path'
import { readFileSync } from 'fs'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'

/** local imports */
import { AppModule } from './app/app.module'
import { ConfigKey } from './config/enums'
import corsConfig from './security/cors/corsConfig'
import { LoggerService } from './logging/logger.service'

async function bootstrap(): Promise<void> {
  try {
    const enableHttps = process.env.ENABLE_HTTPS === 'true'
    const certPath = join(process.cwd(), 'cert', 'cert.pem')
    const keyPath = join(process.cwd(), 'cert', 'key.pem')

    const httpsOptions = enableHttps
      ? {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        }
      : undefined

    const app = await NestFactory.create(AppModule, {
      httpsOptions,
    })

    const configService = app.get(ConfigService)
    const logger = new LoggerService(configService)
    const port: number = configService.get<number>(ConfigKey.PORT) || 5000
    const protocol: 'https' | 'http' = enableHttps ? 'https' : 'http'

    const isProd: boolean = configService.get<string>(ConfigKey.NODE_ENV) === 'production'
    const corsOrigin: string = configService.get<string>(ConfigKey.CORS_ORIGIN) || '*'

    app.use(
      helmet({
        crossOriginEmbedderPolicy: isProd,
        crossOriginResourcePolicy: { policy: isProd ? 'same-site' : 'cross-origin' },
        contentSecurityPolicy: isProd
          ? {
              directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'apollo-server-landing-page.cdn.apollographql.com'],
                scriptSrc: ["'self'", 'https:', "'unsafe-inline'"],
                manifestSrc: ["'self'", 'apollo-server-landing-page.cdn.apollographql.com'],
                frameSrc: ["'self'", 'sandbox.embed.apollographql.com'],
              },
            }
          : false, //! We are disabling CSP in development for easier debugging
      }),
    )

    app.enableCors({
      origin: corsConfig(corsOrigin),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept, Authorization',
      preflightContinue: false,
      optionsSuccessStatus: 204,
      credentials: true,
      maxAge: isProd ? 86400 : undefined, //! 1 day in seconds for production
    })

    await app.listen(port)

    logger.log(`🚀🚀🚀 Application is running on: ${protocol}://localhost:${port}`)
    logger.log(`🚀🚀🚀 Application with GraphQL is running on: ${protocol}://localhost:${port}/graphql`)
  } catch (error: unknown) {
    if (error instanceof Error) console.error('Error during bootstrap:', error.message)
    else console.error('Error during bootstrap:', error)

    process.exit(1)
  }
}

void bootstrap()
