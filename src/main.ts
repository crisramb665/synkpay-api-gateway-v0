/** npm imports */
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'

/** local imports */
import { AppModule } from './app/app.module'
import { LoggerService } from './logging/logger.service'

async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule)

    const configService = app.get(ConfigService)
    const logger = new LoggerService(configService)
    const port = configService.get<number>('PORT') || 5000

    await app.listen(port)

    //TODO: must enable CORS for allow cookies from web browser with different credentials

    logger.log(`🚀🚀🚀 Application is running on: http://localhost:${port}`)
    logger.log(`🚀🚀🚀 Application with GraphQL is running on: http://localhost:${port}/graphql`)
  } catch (error: unknown) {
    if (error instanceof Error) console.error('Error during bootstrap:', error.message)
    else console.error('Error during bootstrap:', error)

    process.exit(1)
  }
}

void bootstrap()
