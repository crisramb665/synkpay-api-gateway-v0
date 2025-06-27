/** npm imports */
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'
import axios from 'axios'

/** local imports */
import { AppModule } from '../../../app/app.module'

const testUser = {
  login: 'administrator@sdkfinance.tech',
  password: '1',
}

describe('AuthResolver (e2e)', () => {
  let app: INestApplication
  let authProxyServiceAvailable: boolean = true

  beforeAll(async () => {
    try {
      await axios.get('http://localhost:4000/')
    } catch (error) {
      authProxyServiceAvailable = false
      console.warn('⚠️ Auth service is offline, skipping related tests: ', error)
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should login and return a JWT + SDK token', async () => {
    if (!authProxyServiceAvailable) return

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            login(login: "${testUser.login}", password: "${testUser.password}") {
              accessToken
              expiresAt
              refreshToken
              status
            }
          }
        `,
      })

    const loginResponse = response.body.data.login

    expect(loginResponse.accessToken).toBeDefined()
    expect(loginResponse.refreshToken).toBeDefined()
    expect(loginResponse.expiresAt).toBeDefined()
  })

  it('should return SDK Finance tokens with valid JWT', async () => {
    if (!authProxyServiceAvailable) return

    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            login(login: "${testUser.login}", password: "${testUser.password}") {
              accessToken
              expiresAt
              refreshToken
              status
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
            securedQuery {
              sdkFinanceAccessToken
            }
          }
        `,
      })

    expect(response.body.data.securedQuery.sdkFinanceAccessToken).toBeDefined()
  })

  it('should refresh token and reject replayed refresh tokens', async () => {
    if (!authProxyServiceAvailable) return
    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          login(login: "${testUser.login}", password: "${testUser.password}") {
            accessToken
            expiresAt
            refreshToken
            status
          }
        }
      `,
      })

    const { refreshToken } = loginResponse.body.data.login
    expect(refreshToken).toBeDefined()

    const refreshResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            refreshToken(refreshToken: "${refreshToken}") {
              accessToken
              expiresAt
              refreshToken
              status
            }
          }
      `,
      })

    expect(refreshResponse.body.data.refreshToken.accessToken).toBeDefined()

    const replayResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          refreshToken(refreshToken: "${refreshToken}") {
            accessToken
            expiresAt
            refreshToken
            status
          }
        }
      `,
      })

    expect(replayResponse.body.errors[0].message).toContain('Request failed with status code 401')
  })

  it('should revoke tokens on logout and prevent future access', async () => {
    if (!authProxyServiceAvailable) return
    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          login(login: "${testUser.login}", password: "${testUser.password}") {
            accessToken
            expiresAt
            refreshToken
            status
          }
        }
      `,
      })

    const accessToken = loginResponse.body.data.login.accessToken

    const logoutResponse = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
          mutation {
            logout {
              revoked
              status
            }
          }
      `,
      })

    expect(logoutResponse.body.data.logout.revoked).toBe(true)

    const protectedResponse = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
        query {
          securedQuery {
            sdkFinanceAccessToken
          }
        }
      `,
      })

    expect(protectedResponse.body.errors[0].message).toContain('Session has expired or does not exist') //! Fix this error message from the implementation
  })
})
