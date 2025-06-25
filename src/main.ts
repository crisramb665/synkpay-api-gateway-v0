/** npm imports */
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'

/** local imports */
import { AppModule } from './app/app.module'
import { ConfigKey } from './config/enums'
import { getHttpsOptions } from './security/https/httpsConfig'
import { configureHelmet } from './security/helmet/helmetConfig'
import { configureCors } from './security/cors/corsConfig'
import { LoggerService } from './logging/logger.service'

async function bootstrap(): Promise<void> {
  try {
    const enableHttps = process.env.ENABLE_HTTPS === 'true'

    const httpsOptions = getHttpsOptions(enableHttps)
    const app = await NestFactory.create(AppModule, { httpsOptions })

    const configService = app.get(ConfigService)
    const logger = new LoggerService(configService)

    const port: number = configService.get<number>(ConfigKey.PORT) || 5000
    const protocol: 'https' | 'http' = enableHttps ? 'https' : 'http'

    const isProd: boolean = configService.get<string>(ConfigKey.NODE_ENV) === 'production'

    app.use(configureHelmet(isProd))
    app.enableCors(configureCors(configService, isProd))

    await app.listen(port)

    logger.log(`🚀🚀🚀 Application is running on: ${protocol}://localhost:${port}/graphql`)
  } catch (error: unknown) {
    if (error instanceof Error) console.error('Error during bootstrap:', error.message)
    else console.error('Error during bootstrap:', error)

    process.exit(1)
  }
}

void bootstrap()
