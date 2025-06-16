/** npm imports */
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

/** local imports */
import { AppModule } from '../../../app/app.module'
import { RedisService } from '../../../common/redis/redis.service'

const testUser = {
  login: 'administrator@sdkfinance.tech',
  password: '1',
}

describe('AuthResolver (e2e)', () => {
  let app: INestApplication
  let redisService: RedisService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())

    await app.init()

    redisService = moduleFixture.get<RedisService>(RedisService)
  })

  afterAll(async () => {
    await app.close()
  })

  it('should login and return a JWT + SDK token', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            login(login: "${testUser.login}", password: "${testUser.password}") {
              accessToken
              expiresAt
            }
          }
        `,
      })

    const loginResponse = response.body.data.login

    expect(loginResponse.accessToken).toBeDefined()
    expect(loginResponse.expiresAt).toBeDefined()

    const redisKey = 'session:0196acb4-dfa7-742f-a136-cec716d761dd'
    const redisValue = await redisService.getValue(redisKey)
    expect(redisValue).not.toBeNull()
  })

  it('should return SDK Finance tokens with valid JWT', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            login(login: "${testUser.login}", password: "${testUser.password}") {
              accessToken
            }
          }
        `,
      })

    const accessToken = loginResponse.body.data.login.accessToken

    //! IMPORTANT: TESTING A TEST ROUTE, SHOULD BE UPDATED WHEN WE'RE GOING TO ADD MORE PROTECTED QUERIES.
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
        query {
        securedQuery2 {
            sdkFinanceTokenAccessToken
            sdkFinanceRefreshToken
          }
        }
        `,
      })

    expect(response.body.data.securedQuery2.sdkFinanceTokenAccessToken).toBeDefined()
  })
})
