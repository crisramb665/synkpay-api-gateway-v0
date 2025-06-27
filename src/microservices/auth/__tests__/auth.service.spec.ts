/** npm imports */
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { of } from 'rxjs'

/** local imports */
import { AuthProxyService } from '../auth.service'
import { LoggerService } from '../../../logging/logger.service'

describe('AuthService', () => {
  let authService: AuthProxyService
  let httpService: HttpService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthProxyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AUTH_PROXY_SERVICE_BASE_URL') return 'http://mock-auth-service'
              return null
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            request: jest.fn(),
          },
        },

        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            event: jest.fn(),
          },
        },
      ],
    }).compile()

    authService = module.get(AuthProxyService)
    httpService = module.get(HttpService)
  })

  it('should login and return tokens', async () => {
    const mockLogin = 'user@test.com'
    const mockPassword = 'password123'

    const mockApiResponse: AxiosResponse = {
      data: {
        accessToken: 'accesstokenjwt',
        refreshToken: 'refreshtokenjwt',
        expiresAt: 'datestring',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    }

    jest.spyOn(httpService, 'request').mockReturnValueOnce(of(mockApiResponse))

    const result = await authService.getTokens(mockLogin, mockPassword)
    expect(result).toEqual({
      status: 200,
      data: {
        accessToken: 'accesstokenjwt',
        refreshToken: 'refreshtokenjwt',
        expiresAt: 'datestring',
      },
    })
  })

  it('should refresh tokens and return data', async () => {
    const mockApiResponse: AxiosResponse = {
      data: {
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
        expiresAt: 'newDate',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    }

    jest.spyOn(httpService, 'request').mockReturnValueOnce(of(mockApiResponse))

    const result = await authService.refreshToken('refresh-token-value')

    expect(result).toEqual({
      status: 200,
      data: {
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
        expiresAt: 'newDate',
      },
    })
  })

  it('should revoke tokens successfully', async () => {
    const mockApiResponse: AxiosResponse = {
      data: { status: 200, revoked: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    }

    jest.spyOn(httpService, 'request').mockReturnValueOnce(of(mockApiResponse))

    const result = await authService.revokeTokens('user-id-123')

    expect(result).toEqual({
      status: 200,
      data: { status: 200, revoked: true },
    })
  })

  it('should throw error if base URL is missing', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    }

    expect(() => new AuthProxyService(configService as unknown as ConfigService, httpService)).toThrow(
      'Missing Auth Proxy Service base URL in environment configuration.',
    )
  })
})
