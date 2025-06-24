/** npm imports */
import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

/** local imports */
import { AuthService } from '../auth.service'
import { RedisService } from '../../../common/redis/redis.service'
import { SDKFinanceService } from '../../../common/sdk-finance/sdk-finance.service'
import type { AuthResponse } from '../../../common/sdk-finance/sdk-finance.interface'
import { hashJwt } from '../utils/utils'
import { CustomGraphQLError } from '../../../common/errors/custom-graphql.error'
import { LoggerService } from '../../../logging/logger.service'

describe('AuthService', () => {
  let authService: AuthService
  let redisService: RedisService
  let sdkFinanceService: SDKFinanceService
  let jwtService: JwtService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_PUBLIC_KEY_DEV') return 'mockPublicKey'
              if (key === 'JWT_PRIVATE_KEY_DEV') return 'mockPrivateKey'
              return null
            }),
          },
        },
        {
          provide: SDKFinanceService,
          useValue: {
            authenticateUser: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            setValue: jest.fn(),
            getValue: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
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

    authService = module.get(AuthService)
    sdkFinanceService = module.get(SDKFinanceService)
    jwtService = module.get(JwtService)
    redisService = module.get(RedisService)
  })

  it('should login and set session and refresh in Redis', async () => {
    const mockLogin = 'user@test.com'
    const mockPassword = 'password123'

    const mockJwt = 'signed-jwt'
    const mockJwtRefresh = 'signed-jwt-refresh'

    const mockedUserId = 'user123'
    const mockedUserName = 'John Doe'
    const mockedOrganizationId = 'org-123'

    const mockSdkToken = 'sdk-token'
    const mockSdkRefresh = 'sdk-refresh'
    const mockExpiresAt = new Date(Date.now() + 60_000).toISOString()
    const mockRefreshExpiresAt = new Date(Date.now() + 70_000).toISOString()

    const mockAuthResponseWithStatus = {
      status: 200,
      data: {
        action: 'login',
        authorizationToken: {
          expiresAt: mockExpiresAt,
          token: mockSdkToken,
        },
        refreshToken: {
          expiresAt: mockRefreshExpiresAt,
          token: mockSdkRefresh,
        },
        members: [
          {
            organization: {
              id: 'org-123',
              type: 'business',
              name: 'Acme Inc.',
              organizationStatus: 'active',
              contract_info: {
                id: 'contract-456',
                personType: 'legal',
                name: 'Acme Corporation',
              },
            },
            permissions: ['read:data', 'write:data', 'admin:settings'],
            role: 'admin',
            token: {
              expiresAt: '2023-12-31T23:59:59Z',
              token: '..SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5e',
            },
            refreshToken: {
              expiresAt: '2024-01-31T23:59:59Z',
              token: '..SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5f',
            },
            user: {
              id: mockedUserId,
              name: mockedUserName,
              profileOrganizationId: mockedOrganizationId,
            },
          },
        ],
        maskedPhoneNumber: '+1*******1234',
      },
    }

    jest.spyOn(sdkFinanceService, 'authenticateUser').mockResolvedValue(mockAuthResponseWithStatus)
    jest.spyOn(jwtService, 'sign').mockImplementation((payload) => ((payload as any)?.jti ? mockJwtRefresh : mockJwt))
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      return {
        sub: mockedUserId,
        name: mockedUserName,
        profileOrganizationId: mockedOrganizationId,
        jti: 'mock-jti-id',
      }
    })
    jest.spyOn(redisService, 'setValue').mockResolvedValue(undefined)

    const result = await authService.getTokens(mockLogin, mockPassword)

    expect(result).toEqual({
      apiGatewayAccessToken: mockJwt,
      apiGatewayRefreshToken: mockJwtRefresh,
      expiresAt: mockExpiresAt,
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(redisService.setValue).toHaveBeenCalledWith(
      `auth:session:${mockedUserId}:access`,
      expect.objectContaining({
        sdkFinanceToken: mockSdkToken,
        sdkFinanceTokenExpiresAt: mockExpiresAt,
        jwtHash: expect.any(String),
      }),
      expect.any(Number),
    )
  })

  it('should throw if SDK authentication fails (non-200 status)', async () => {
    jest.spyOn(sdkFinanceService, 'authenticateUser').mockResolvedValue({
      status: 401,
      data: null as unknown as AuthResponse,
    })

    await expect(authService.getTokens('user@test.com', 'bad-password')).rejects.toMatchObject({
      message: 'Login failed. Please check your credentials and try again.',
      extensions: {
        code: 401,
        success: false,
        timestamp: expect.any(String),
      },
    })
  })

  it('should throw if SDK response is missing authorizationToken.token', async () => {
    const mockAuthResponseWithStatus = {
      status: 200,
      data: {
        action: 'login',
        authorizationToken: {
          expiresAt: '',
          token: '',
        },
        refreshToken: {
          expiresAt: '2024-01-31T23:59:59Z',
          token: '',
        },
        members: [
          {
            organization: {
              id: 'org-123',
              type: 'business',
              name: 'Acme Inc.',
              organizationStatus: 'active',
              contract_info: {
                id: 'contract-456',
                personType: 'legal',
                name: 'Acme Corporation',
              },
            },
            permissions: ['read:data', 'write:data', 'admin:settings'],
            role: 'admin',
            token: {
              expiresAt: '2023-12-31T23:59:59Z',
              token: '..SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5e',
            },
            refreshToken: {
              expiresAt: '2024-01-31T23:59:59Z',
              token: '..SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5f',
            },
            user: {
              id: '',
              name: 'John Doe',
              profileOrganizationId: 'org-123',
            },
          },
        ],
        maskedPhoneNumber: '+1*******1234',
      },
    }
    jest.spyOn(sdkFinanceService, 'authenticateUser').mockResolvedValue(mockAuthResponseWithStatus)

    await expect(authService.getTokens('user@test.com', 'bad-password')).rejects.toMatchObject({
      message: 'Login failed. Please check your credentials and try again.',
      extensions: {
        code: 401,
        success: false,
        timestamp: expect.any(String),
      },
    })
  })

  it('should throw CustomGraphQLError when SDKFinanceService fails', async () => {
    jest.spyOn(sdkFinanceService, 'authenticateUser').mockRejectedValue(new CustomGraphQLError('SDK down', 502))

    await expect(authService.getTokens('user@test.com', 'password')).rejects.toMatchObject({
      message: 'Login failed. Please check your credentials and try again.',
      extensions: {
        code: 401,
        success: false,
        timestamp: expect.any(String),
      },
    })
  })

  it('should rotate tokens on refresh and persist them in Redis', async () => {
    const userId = 'user123'
    const name = 'John'
    const profileOrganizationId = 'org-123'
    const mockedJti = 'jti-abc-123'

    const decodedPayload = { sub: userId, name, profileOrganizationId, jti: mockedJti }
    const mockAccessToken = 'access-jwt'
    const mockRefreshToken = 'refresh-jwt'

    const mockSdkAccessToken = 'sdk-token'
    const mockSdkAccessExpiresAt = new Date(Date.now() + 60_000).toISOString()
    const mockSdkRefreshToken = 'sdk-refresh'
    const mockSdkRefreshExpiresAt = new Date(Date.now() + 120_000).toISOString()

    jest.spyOn(jwtService, 'verify').mockReturnValue(decodedPayload)
    jest.spyOn(redisService, 'getValue').mockImplementation((key: string) => {
      if (key.includes('refresh')) {
        return Promise.resolve(
          JSON.stringify({
            jwtRefreshJtiHash: hashJwt(mockedJti),
            jwtRefreshHash: hashJwt(mockRefreshToken),
            sdkFinanceRefreshToken: mockSdkRefreshToken,
            sdkFinanceRefreshTokenExpiresAt: mockSdkRefreshExpiresAt,
          }),
        )
      }
      if (key.includes('access')) {
        return Promise.resolve(
          JSON.stringify({
            sdkFinanceToken: mockSdkAccessToken,
            sdkFinanceTokenExpiresAt: mockSdkAccessExpiresAt,
          }),
        )
      }
      return Promise.resolve(null)
    })

    jest.spyOn(jwtService, 'sign').mockReturnValueOnce(mockAccessToken).mockReturnValueOnce(mockRefreshToken)

    const refreshResult = await authService.refreshToken(mockRefreshToken)

    expect(refreshResult).toEqual({
      apiGatewayAccessToken: mockAccessToken,
      apiGatewayRefreshToken: mockRefreshToken,
      expiresAt: mockSdkAccessExpiresAt,
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(redisService.setValue).toHaveBeenCalledTimes(2)
  })

  it('should throw if refresh token is invalid or replayed', async () => {
    const mockRefreshToken = 'invalid-refresh-token'
    const mockDecoded = {
      sub: 'user123',
      name: 'John Doe',
      profileOrganizationId: 'org-123',
      jti: 'fake-jti',
    }

    jest.spyOn(jwtService, 'verify').mockReturnValue(mockDecoded)
    jest.spyOn(redisService, 'getValue').mockImplementation((key: string) => {
      if (key.endsWith(':refresh')) {
        return Promise.resolve(
          JSON.stringify({
            sdkFinanceRefreshToken: 'some-token',
            sdkFinanceRefreshTokenExpiresAt: new Date(Date.now() + 10000).toISOString(),
            jwtRefreshHash: 'wrong-hash',
            jwtRefreshJtiHash: 'wrong-jti-hash',
          }),
        )
      }

      return Promise.resolve(null)
    })

    await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow('Unauthorized or expired refresh token')
  })
})
