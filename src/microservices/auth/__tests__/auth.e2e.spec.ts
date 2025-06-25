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
              apiGatewayAccessToken
              apiGatewayRefreshToken
              expiresAt
            }
          }
        `,
      })

    const loginResponse = response.body.data.login

    expect(loginResponse.apiGatewayAccessToken).toBeDefined()
    expect(loginResponse.apiGatewayRefreshToken).toBeDefined()
    expect(loginResponse.expiresAt).toBeDefined()

    const redisKey = 'auth:session:0196acb4-dfa7-742f-a136-cec716d761dd:access'
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
              apiGatewayAccessToken
              apiGatewayRefreshToken
              expiresAt
            }
          }
        `,
      })

    const accessToken = loginResponse.body.data.login.apiGatewayAccessToken

    //! IMPORTANT: TESTING A TEST ROUTE, SHOULD BE UPDATED WHEN WE'RE GOING TO ADD MORE PROTECTED QUERIES.
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
          query {
            securedQuery2 {
              sdkFinanceAccessToken
            }
          }
        `,
      })

    expect(response.body.data.securedQuery2.sdkFinanceAccessToken).toBeDefined()
  })

  it('should refresh token and reject replayed refresh tokens', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          login(login: "${testUser.login}", password: "${testUser.password}") {
            apiGatewayAccessToken
            apiGatewayRefreshToken
            expiresAt
          }
        }
      `,
      })

    const { apiGatewayRefreshToken } = loginResponse.body.data.login
    expect(apiGatewayRefreshToken).toBeDefined()

    const refreshResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            refreshToken(refreshToken: "${apiGatewayRefreshToken}") {
              apiGatewayAccessToken
              apiGatewayRefreshToken
              expiresAt
            }
          }
      `,
      })

    expect(refreshResponse.body.data.refreshToken.apiGatewayAccessToken).toBeDefined()

    const replayResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          refreshToken(refreshToken: "${apiGatewayRefreshToken}") {
            apiGatewayAccessToken
            apiGatewayRefreshToken
            expiresAt
          }
        }
      `,
      })

    expect(replayResponse.body.errors[0].message).toContain('Invalid or replayed refresh token')
  })

  it('should revoke tokens on logout and prevent future access', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          login(login: "${testUser.login}", password: "${testUser.password}") {
            apiGatewayAccessToken
            apiGatewayRefreshToken
            expiresAt
          }
        }
      `,
      })

    const accessToken = loginResponse.body.data.login.apiGatewayAccessToken

    const logoutResponse = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
          mutation {
            logout
          }
      `,
      })

    expect(logoutResponse.body.data.logout).toBe(true)

    const protectedResponse = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
        query {
          securedQuery2 {
            sdkFinanceAccessToken
          }
        }
      `,
      })

    expect(protectedResponse.body.errors[0].message).toContain('Session has expired or does not exist') //! Fix this error message from the implementation
  })
})
