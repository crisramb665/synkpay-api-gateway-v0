/** npm imports */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

/** local imports */
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'
import { type AuthResponseWithStatus } from '../../common/sdk-finance/sdk-finance.interface'
import { RefreshTokenResponse, type JwtPayload, type LoginResponse } from './interfaces/jwt-payload.interface'
import { RedisService } from '../../common/redis/redis.service'
import { hashJwt } from './utils/utils'
import { CustomGraphQLError } from 'src/common/errors/custom-graphql.error'

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sdkFinanceService: SDKFinanceService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  public async login(login: string, password: string): Promise<LoginResponse | undefined> {
    try {
      const { data, status } = await this.sdkFinanceService.authenticateUser(login, password)
      if (status !== 200) throw new Error('Failed to authenticate with SDK Finance')

      if (!data.authorizationToken.token) throw new Error('Invalid credentials')

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
        payload.sub,
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
    } catch (error) {
      console.error('Error during login:', error)
    }
  }

  //TODO: FIX ERROR CODES
  public async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(refreshToken, {
        publicKey: this.configService.get<string>('JWT_PUBLIC_KEY_DEV'),
      })

      const { sub: userId, name, profileOrganizationId } = decoded
      if (!userId) throw new CustomGraphQLError('Invalid refresh token', 400, false)

      const baseKey = this.getBaseRedisKey(userId)
      const redisSessionKey = `${baseKey}:access`
      const redisRefreshKey = `${baseKey}:refresh`

      const storedRefresh = await this.safeParse(await this.redisService.getValue(redisRefreshKey))
      if (!storedRefresh || storedRefresh.jwtRefreshHash !== hashJwt(refreshToken))
        throw new CustomGraphQLError('Invalid or missing refresh token', 401)

      const session = await this.safeParse(await this.redisService.getValue(redisSessionKey))
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
      console.error('Error refreshing token:', error)
      throw new Error('Unauthorized or expired refresh token')
    }
  }

  public async getSdkFinanceTokens(user: JwtPayload) {
    const redisSessionKey = `auth:session:${user.sub}:access`
    const redisRefreshKey = `auth:session:${user.sub}:refresh`

    const sessionValue = await this.redisService.getValue(redisSessionKey)
    const refreshValue = await this.redisService.getValue(redisRefreshKey)
    console.log({ sessionValue, refreshValue }) //TODO: Fix this later

    return JSON.parse(sessionValue!) as { sdkFinanceToken: string }
  }

  private generateApiGatewayTokens(
    payload: JwtPayload,
    refreshTokenExpiresIn: number,
  ): {
    apiGatewayAccessToken: string
    apiGatewayRefreshToken: string
  } {
    const accessToken = this.jwtService.sign(payload)
    const refreshToken = this.jwtService.sign(payload, {
      privateKey: this.configService.get<string>('JWT_PRIVATE_KEY_DEV'), //TODO: need to use an enum for this kind of config service calls
      expiresIn: refreshTokenExpiresIn,
      algorithm: 'RS256',
    })

    return { apiGatewayAccessToken: accessToken, apiGatewayRefreshToken: refreshToken }
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
      },
      new Date(refresh.expiresAt).getTime() - now,
    )
  }

  private getBaseRedisKey(userId: string) {
    return `auth:session:${userId}`
  }

  private safeParse<T = any>(value: string | null): T | null {
    try {
      return value ? (JSON.parse(value) as T) : null
    } catch (err) {
      console.warn('Failed to parse JSON from Redis', err)
      return null
    }
  }
}
