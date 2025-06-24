/** npm imports */
import { INestApplication, MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

/** local imports */
import { RequestValidatorMiddleware } from '../middleware/request-validator.middleware'
import * as express from 'express'

@Module({})
class TestMiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestValidatorMiddleware).forRoutes('*')
  }
}

describe('RequestValidatorMiddleware', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestMiddlewareModule],
    }).compile()

    app = moduleRef.createNestApplication()
    // Add a test route for checking middleware behavior
    app.use('/graphql', express.json(), (req, res) => {
      res.status(200).json({ message: 'OK' })
    })

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should allow a valid request', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer token')
      .send({ query: 'hello' })
      .expect(200)
  })

  it('should block large payloads', () => {
    const largePayload = 'x'.repeat(1024 * 101)

    return request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send({ data: largePayload })
      .expect(400)
  })

  it('should block suspicious content in body', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send({ query: 'db.users.find({ "$ne": null })' })
      .expect(400)
  })

  it('should block disallowed headers', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .set('X-Forwarded-For', '1.2.3.4')
      .send({ query: 'hello' })
      .expect(400)
  })
})
