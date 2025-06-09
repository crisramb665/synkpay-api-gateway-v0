/** npm imports */
import { readFileSync } from 'fs'
import { join } from 'path'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

/** local imports */
import { AppModule } from './app/app.module'

async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule)

    const configService = app.get(ConfigService)
    const swaggerPath = configService.get<string>('SWAGGER_PATH') || 'api/docs'
    const port = configService.get<number>('PORT') || 5000

    const packageJsonReference = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as {
      version: string
    }

    //TODO: Add bearerAuth method once JWT authentication is implemented
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Synk Pay API Gateway')
      .setDescription('API Gateway to interact with Synk Pay microservices')
      .setVersion(packageJsonReference.version)
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup(swaggerPath, app, document)
    console.log(`Swagger documentation available at: http://localhost:${port}/${swaggerPath}`)

    await app.listen(port)
    console.log(`🚀🚀🚀 Application is running on: http://localhost:${port}`)
  } catch (error: unknown) {
    if (error instanceof Error) console.error('Error during bootstrap:', error.message)
    else console.error('Error during bootstrap:', error)

    process.exit(1)
  }
}

void bootstrap()
