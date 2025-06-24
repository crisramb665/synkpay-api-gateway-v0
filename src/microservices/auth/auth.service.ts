/** npm imports */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

/** local imports */
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'
import { type AuthResponseWithStatus } from '../../common/sdk-finance/sdk-finance.interface'
import { type JwtPayload, type LoginResponse } from './interfaces/jwt-payload.interface'
import { RedisService } from '../../common/redis/redis.service'
import { hashJwt } from './utils/utils'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'
import { LoggerService } from '../../logging/logger.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly sdkFinanceService: SDKFinanceService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  public async login(login: string, password: string): Promise<LoginResponse | undefined> {
    try {
      const sdkAuthResponse: AuthResponseWithStatus = await this.sdkFinanceService.authenticateUser(login, password)
      if (!sdkAuthResponse || sdkAuthResponse.status !== 200)
        throw new CustomGraphQLError('Failed to authenticate with SDK Finance', sdkAuthResponse.status)

      const { data } = sdkAuthResponse
      if (!data.authorizationToken.token)
        throw new CustomGraphQLError('Invalid login credentials. Authentication required', sdkAuthResponse.status)

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
      const accessTokenHash = hashJwt(accessToken)

      const redisKey = `session:${userId}`

      await this.redisService.setValue(
        redisKey,
        {
          sdkFinanceToken: data.authorizationToken.token,
          sdkFinanceRefreshToken: data.refreshToken.token,
          sdkFinanceTokenExpiresAt: expiresAt,
          jwtHash: accessTokenHash,
        },
        expiresIn,
      )

      return {
        accessToken,
        sdkFinanceRefreshToken: data.refreshToken.token,
        expiresAt: data.authorizationToken.expiresAt,
      }
    } catch (error: any) {
      this.logger.error('Error during login', error.stack, {
        type: 'event',
        method: 'login',
      })

      throw error
    }
  }

  public async getSdkFinanceToken(user: JwtPayload) {
    const redisKey = `session:${user.sub}`

    const tokenValue = await this.redisService.getValue(redisKey)

    //! This is not a server error, need to fix this with refresh token implementation
    if (!tokenValue)
      throw new CustomGraphQLError('SDK Finance session not initialized. Please authenticate first.', 401)

    return JSON.parse(tokenValue) as { sdkFinanceToken: string; sdkFinanceRefreshToken: string }
  }
}
