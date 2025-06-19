/** npm imports */
import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'

/** local imports */
import { AuthService } from '../auth.service'
import { RedisService } from '../../../common/redis/redis.service'
import { SDKFinanceService } from '../../../common/sdk-finance/sdk-finance.service'
import { type AuthResponse } from '../../../common/sdk-finance/sdk-finance.interface'

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
          },
        },
      ],
    }).compile()

    authService = module.get(AuthService)
    sdkFinanceService = module.get(SDKFinanceService)
    jwtService = module.get(JwtService)
    redisService = module.get(RedisService)
  })

  it('should login and set session in Redis', async () => {
    const mockLogin = 'user@test.com'
    const mockPassword = 'password123'

    const mockJwt = 'signed-jwt'

    const mockedUserId = 'user123'
    const mockSdkToken = 'sdk-token'
    const mockRefresh = 'sdk-refresh'
    const mockExpiresAt = new Date(Date.now() + 60_000).toISOString()

    const mockAuthResponseWithStatus = {
      status: 200,
      data: {
        action: 'login',
        authorizationToken: {
          expiresAt: mockExpiresAt,
          token: mockSdkToken,
        },
        refreshToken: {
          expiresAt: '2024-01-31T23:59:59Z',
          token: mockRefresh,
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
              name: 'John Doe',
              profileOrganizationId: 'org-123',
            },
          },
        ],
        maskedPhoneNumber: '+1*******1234',
      },
    }

    jest.spyOn(sdkFinanceService, 'authenticateUser').mockResolvedValue(mockAuthResponseWithStatus)
    jest.spyOn(jwtService, 'sign').mockReturnValue(mockJwt)
    jest.spyOn(redisService, 'setValue').mockResolvedValue(undefined)

    const result = await authService.getTokens(mockLogin, mockPassword)

    expect(result).toEqual({
      accessToken: mockJwt,
      sdkFinanceRefreshToken: mockRefresh,
      expiresAt: mockExpiresAt,
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(redisService.setValue).toHaveBeenCalledWith(
      `session:${mockedUserId}`,
      expect.objectContaining({
        sdkFinanceToken: mockSdkToken,
        sdkFinanceRefreshToken: mockRefresh,
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

    const result = await authService.getTokens('user@test.com', 'bad-password')
    expect(result).toBeUndefined()
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

    const result = await authService.getTokens('user@test.com', 'password')
    expect(result).toBeUndefined()
  })

  it('should handle SDKFinanceService throwing an error', async () => {
    jest.spyOn(sdkFinanceService, 'authenticateUser').mockRejectedValue(new Error('SDK down'))

    const result = await authService.getTokens('user@test.com', 'password')
    expect(result).toBeUndefined()
  })
})
