/** npm imports */
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'

/** local imports */
import { AppModule } from './app/app.module'

async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule)

    const configService = app.get(ConfigService)
    const port = configService.get<number>('PORT') || 5000

    await app.listen(port)
    console.log(`🚀🚀🚀 Application is running on: http://localhost:${port}`)
    console.log(`🚀🚀🚀 Application with GraphQL is running on: http://localhost:${port}/graphql`)
  } catch (error: unknown) {
    if (error instanceof Error) console.error('Error during bootstrap:', error.message)
    else console.error('Error during bootstrap:', error)

    process.exit(1)
  }
}

void bootstrap()
