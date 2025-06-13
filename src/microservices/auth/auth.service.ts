/** npm imports */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

/** local imports */
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'
import { type AuthResponseWithStatus } from '../../common/sdk-finance/sdk-finance.interface'
import { type JwtPayload, type LoginResponse } from './interfaces/jwt-payload.interface'
import { RedisService } from '../../common/redis/redis.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly sdkFinanceService: SDKFinanceService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  public async login(login: string, password: string): Promise<LoginResponse | undefined> {
    try {
      const sdkAuthResponse: AuthResponseWithStatus = await this.sdkFinanceService.authenticateUser(login, password)
      if (!sdkAuthResponse || sdkAuthResponse.status !== 200) throw new Error('Failed to authenticate with SDK Finance')

      const { data } = sdkAuthResponse
      if (!data.authorizationToken.token) throw new Error('Invalid credentials')

      const user = data.members[0]?.user
      const { id: userId, name, profileOrganizationId } = user

      const expiresAt = data.authorizationToken.expiresAt
      const expiresAtInMs = new Date(expiresAt).getTime()
      const now = Date.now()
      const expiresIn = expiresAtInMs - now

      const payload = {
        sub: userId,
        name,
        profileOrganizationId,
      }

      const accessToken = this.jwtService.sign(payload)

      const redisKey = `sdkFinanceToken:${userId}`
      await this.redisService.setValue(
        redisKey,
        {
          sdkFinanceToken: data.authorizationToken.token,
          sdkFinanceRefreshToken: data.refreshToken.token,
        },
        expiresIn,
      )

      return {
        accessToken,
        sdkFinanceRefreshToken: data.refreshToken.token,
        expiresAt: data.authorizationToken.expiresAt,
      }
    } catch (error) {
      console.error('Error during login:', error)
    }
  }

  public async getSdkFinanceToken(user: JwtPayload) {
    const redisKey = `sdkFinanceToken:${user.sub}`

    const tokenValue = await this.redisService.getValue(redisKey)
    if (!tokenValue) throw new Error('SDK Finance tokens not generated for this user.')

    return JSON.parse(tokenValue) as { sdkFinanceToken: string; sdkFinanceRefreshToken: string }
  }
}
