/** npm imports */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'

/** local imports */
import { ConfigKey } from '../../config/enums'
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'
import type { AuthResponseWithStatus } from '../../common/sdk-finance/sdk-finance.interface'
import type { RefreshTokenResponse, JwtPayload, LoginResponse } from './interfaces/jwt-payload.interface'
import { RedisService } from '../../common/redis/redis.service'
import { hashJwt } from './utils/utils'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'
import type { RefreshValue, SessionValue } from './interfaces/service.interface'
import { LoggerService } from '../../logging/logger.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sdkFinanceService: SDKFinanceService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  public async getTokens(login: string, password: string): Promise<LoginResponse | undefined> {
    try {
      const { data, status } = await this.sdkFinanceService.authenticateUser(login, password)
      if (status !== 200) throw new CustomGraphQLError('Failed to authenticate with SDK Finance', status)

      if (!data.authorizationToken.token) throw new CustomGraphQLError('Invalid credentials', status)

      const user = data.members[0]?.user
      const { id: userId, name, profileOrganizationId } = user

      const payload: JwtPayload = {
        sub: userId,
        name,
        profileOrganizationId,
      }

      const now = Date.now()
      const sdkRefreshExpiresAtMs = new Date(data.refreshToken.expiresAt).getTime()

      const { apiGatewayAccessToken, apiGatewayRefreshToken } = this.generateApiGatewayTokens(
        payload,
        sdkRefreshExpiresAtMs - now,
      )

      await this.persistTokensToRedis(
        userId,
        {
          token: data.authorizationToken.token,
          expiresAt: data.authorizationToken.expiresAt,
        },
        {
          token: data.refreshToken.token,
          expiresAt: data.refreshToken.expiresAt,
        },
        apiGatewayAccessToken,
        apiGatewayRefreshToken,
      )

      return {
        apiGatewayAccessToken,
        apiGatewayRefreshToken,
        expiresAt: data.authorizationToken.expiresAt,
      }
    } catch (error: any) {
      this.logger.error('Error during login', error.stack, {
        type: 'event',
        method: 'login',
      })

      throw error
      throw new CustomGraphQLError('Login failed. Please check your credentials and try again.', 401, false, true)
    }
  }

  //TODO: FIX ERROR CODES
  public async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(refreshToken, {
        publicKey: this.configService.get<string>(ConfigKey.JWT_PUBLIC_KEY_DEV),
      })

      const { sub: userId, name, profileOrganizationId, jti } = decoded
      if (!userId || !jti) throw new CustomGraphQLError('Invalid refresh token', 400, false)

      const baseKey = this.getBaseRedisKey(userId)
      const redisSessionKey = `${baseKey}:access`
      const redisRefreshKey = `${baseKey}:refresh`

      const storedRefresh = this.safeParse<RefreshValue>(await this.redisService.getValue(redisRefreshKey))
      if (
        !storedRefresh ||
        storedRefresh.jwtRefreshHash !== hashJwt(refreshToken) ||
        storedRefresh.jwtRefreshJtiHash !== hashJwt(jti)
      ) {
        throw new CustomGraphQLError('Invalid or replayed refresh token', 401)
      }

      const session = this.safeParse<SessionValue>(await this.redisService.getValue(redisSessionKey))
      if (!session) throw new CustomGraphQLError('No SDK Finance session found', 401)

      let { sdkFinanceToken, sdkFinanceTokenExpiresAt } = session
      let { sdkFinanceRefreshToken, sdkFinanceRefreshTokenExpiresAt } = storedRefresh

      const now = Date.now()
      if (new Date(sdkFinanceTokenExpiresAt).getTime() <= Date.now()) {
        const refreshed: AuthResponseWithStatus = await this.sdkFinanceService.refreshToken(sdkFinanceRefreshToken)

        if (!refreshed.data.authorizationToken.token)
          throw new CustomGraphQLError('Failed to refresh SDK Finance token', refreshed.status)

        sdkFinanceToken = refreshed.data.authorizationToken.token
        sdkFinanceTokenExpiresAt = refreshed.data.authorizationToken.expiresAt
        sdkFinanceRefreshToken = refreshed.data.refreshToken.token
        sdkFinanceRefreshTokenExpiresAt = refreshed.data.refreshToken.expiresAt
      }

      const payload: JwtPayload = {
        sub: userId,
        name,
        profileOrganizationId,
      }

      const { apiGatewayAccessToken, apiGatewayRefreshToken } = this.generateApiGatewayTokens(
        payload,
        new Date(sdkFinanceRefreshTokenExpiresAt).getTime() - now,
      )

      await this.persistTokensToRedis(
        userId,
        {
          token: sdkFinanceToken,
          expiresAt: sdkFinanceTokenExpiresAt,
        },
        {
          token: sdkFinanceRefreshToken,
          expiresAt: sdkFinanceRefreshTokenExpiresAt,
        },
        apiGatewayAccessToken,
        apiGatewayRefreshToken,
      )

      return {
        apiGatewayAccessToken,
        apiGatewayRefreshToken,
        expiresAt: sdkFinanceTokenExpiresAt,
      }
    } catch (error: any) {
      this.logger.error('Error refreshing token', error.stack, {
        type: 'event',
        method: 'refreshToken',
      })
      throw new CustomGraphQLError('Invalid or replayed refresh token', 401)
    }
  }

  public async getSdkFinanceTokens(
    userId: string,
  ): Promise<{ sdkFinanceAccessToken: string; sdkFinanceRefreshToken: string }> {
    const baseKey = this.getBaseRedisKey(userId)
    const redisSessionKey = `${baseKey}:access`
    const redisRefreshKey = `${baseKey}:refresh`

    const [sessionValue, refreshValue] = await Promise.all([
      this.safeParse<SessionValue>(await this.redisService.getValue(redisSessionKey)),
      this.safeParse<RefreshValue>(await this.redisService.getValue(redisRefreshKey)),
    ])

    if (!sessionValue || !refreshValue) throw new CustomGraphQLError('No SDK Finance session found', 401)

    return {
      sdkFinanceAccessToken: sessionValue.sdkFinanceToken,
      sdkFinanceRefreshToken: refreshValue.sdkFinanceRefreshToken,
    }
  }

  private generateApiGatewayTokens(
    payload: JwtPayload,
    refreshTokenExpiresIn: number,
  ): {
    apiGatewayAccessToken: string
    apiGatewayRefreshToken: string
  } {
    const accessToken = this.jwtService.sign(payload)

    const refreshPayload = {
      ...payload,
      jti: randomUUID(),
    }

    const refreshToken = this.jwtService.sign(refreshPayload, {
      privateKey: this.configService.get<string>(ConfigKey.JWT_PRIVATE_KEY_DEV),
      expiresIn: refreshTokenExpiresIn,
      algorithm: 'RS256',
    })

    return { apiGatewayAccessToken: accessToken, apiGatewayRefreshToken: refreshToken }
  }

  public async revokeTokens(userId: string): Promise<boolean> {
    try {
      const { sdkFinanceAccessToken } = await this.getSdkFinanceTokens(userId)

      const authenticatedUser = this.sdkFinanceService.withToken(sdkFinanceAccessToken)
      await authenticatedUser.deleteAccessTokenAndLogout()

      const baseKey = this.getBaseRedisKey(userId)
      const redisSessionKey = `${baseKey}:access`
      const redisRefreshKey = `${baseKey}:refresh`

      await Promise.all([
        await this.redisService.deleteValue(redisSessionKey),
        await this.redisService.deleteValue(redisRefreshKey),
      ])

      return true
    } catch (error: any) {
      this.logger.error('Error revoking tokens', error.stack, {
        method: 'revokeTokens',
        type: 'event',
      })
      return false
    }
  }

  private async persistTokensToRedis(
    userId: string,
    access: { token: string; expiresAt: string },
    refresh: { token: string; expiresAt: string },
    jwtAccessToken: string,
    jwtRefreshToken: string,
  ): Promise<void> {
    const baseKey = this.getBaseRedisKey(userId)
    const now = Date.now()

    const refreshDecoded = this.jwtService.verify<JwtPayload>(jwtRefreshToken, {
      publicKey: this.configService.get<string>(ConfigKey.JWT_PUBLIC_KEY_DEV),
    })
    const jti = refreshDecoded.jti
    const jtiHash = jti ? hashJwt(jti) : null

    await this.redisService.setValue(
      `${baseKey}:access`,
      {
        sdkFinanceToken: access.token,
        sdkFinanceTokenExpiresAt: access.expiresAt,
        jwtHash: hashJwt(jwtAccessToken),
      },
      new Date(access.expiresAt).getTime() - now,
    )

    await this.redisService.setValue(
      `${baseKey}:refresh`,
      {
        sdkFinanceRefreshToken: refresh.token,
        sdkFinanceRefreshTokenExpiresAt: refresh.expiresAt,
        jwtRefreshHash: hashJwt(jwtRefreshToken),
        jwtRefreshJtiHash: jtiHash,
      },
      new Date(refresh.expiresAt).getTime() - now,
    )
  }

  private getBaseRedisKey(userId: string): string {
    return `auth:session:${userId}`
  }

  private safeParse<T = any>(value: string | null): T | null {
    try {
      return value ? (JSON.parse(value) as T) : null
    } catch (err) {
      this.logger.error('Failed to parse JSON from Redis', err.message || err)
      return null
    }
  }
}
