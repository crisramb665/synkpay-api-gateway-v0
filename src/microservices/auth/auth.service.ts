/** npm imports */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

/** local imports */
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'
import { type AuthResponseWithStatus } from '../../common/sdk-finance/sdk-finance.interface'
import { type JwtPayload, type LoginResponse } from './interfaces/jwt-payload.interface'
import { RedisService } from '../../common/redis/redis.service'
import { hashJwt } from './utils/utils'

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
      const sdkAuthResponse: AuthResponseWithStatus = await this.sdkFinanceService.authenticateUser(login, password)
      if (!sdkAuthResponse || sdkAuthResponse.status !== 200) throw new Error('Failed to authenticate with SDK Finance')

      const { data } = sdkAuthResponse
      console.log({ data })
      if (!data.authorizationToken.token) throw new Error('Invalid credentials')

      const user = data.members[0]?.user
      const { id: userId, name, profileOrganizationId } = user

      const now = Date.now()
      const sdkTokenExpiresAt = data.authorizationToken.expiresAt
      const sdkTokenExpiresAtInMs = new Date(sdkTokenExpiresAt).getTime()
      const sdkTokenExpiresIn = sdkTokenExpiresAtInMs - now //! 5 hours

      const sdkRefreshTokenExpiresAt = data.refreshToken.expiresAt
      const sdkRefreshTokenExpiresAtInMs = new Date(sdkRefreshTokenExpiresAt).getTime()
      const sdkRefreshTokenExpiresIn = sdkRefreshTokenExpiresAtInMs - now //! 24 hours
      console.log({ sdkTokenExpiresIn, sdkRefreshTokenExpiresIn })

      const payload: JwtPayload = {
        sub: userId,
        name,
        profileOrganizationId,
      }

      const { apiGatewayAccessToken, apiGatewayRefreshToken } = this.generateApiGatewayTokens(
        payload,
        sdkRefreshTokenExpiresIn,
      )
      const accessTokenHash = hashJwt(apiGatewayAccessToken)
      const refreshTokenHash = hashJwt(apiGatewayRefreshToken)

      const baseKey = `auth:session:${userId}`

      await this.redisService.setValue(
        `${baseKey}:access`,
        {
          sdkFinanceToken: data.authorizationToken.token,
          // sdkFinanceRefreshToken: data.refreshToken.token,
          sdkFinanceTokenExpiresAt: sdkTokenExpiresAt,
          jwtHash: accessTokenHash,
          // jwtRefreshHash: refreshTokenHash,
        },
        sdkTokenExpiresIn,
      )

      await this.redisService.setValue(
        `${baseKey}:refresh`,
        {
          // sdkFinanceToken: data.authorizationToken.token,
          sdkFinanceRefreshToken: data.refreshToken.token,
          sdkFinanceRefreshTokenExpiresAt: sdkRefreshTokenExpiresAt,
          // jwtHash: accessTokenHash,
          jwtRefreshHash: refreshTokenHash,
        },
        sdkRefreshTokenExpiresIn,
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

  public async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.decode<JwtPayload>(refreshToken)
      // this.jwtService.verify(refreshToken,{})
      console.log({ decoded })
      if (!decoded?.sub) throw new Error('Invalid refresh token')

      const userId = decoded.sub
      const redisKeyForRefresh = `auth:session:${userId}:refresh`
      const session = await this.redisService.getValue(redisKeyForRefresh)
      if (!session) throw new Error('Refresh session not found')

      const { sdkFinanceRefreshToken, jwtRefreshHash } = JSON.parse(session)
      console.log({ sdkFinanceRefreshToken, jwtRefreshHash })
      const currentHash = hashJwt(refreshToken)

      if (currentHash !== jwtRefreshHash) throw new Error('Refresh token has been revoked or is invalid')
    } catch (error: any) {
      console.error('Error refreshing token:', error)
      throw new Error('Unauthorized or expired refresh token')
    }
  }

  public async getSdkFinanceToken(user: JwtPayload) {
    const redisKey = `auth:session:${user.sub}:access`

    const tokenValue = await this.redisService.getValue(redisKey)
    console.log({ tokenValue })

    //! This is not a server error, need to fix this with refresh token implementation
    if (!tokenValue) throw new Error('SDK Finance tokens not generated for this user.')

    return JSON.parse(tokenValue) as { sdkFinanceToken: string; sdkFinanceRefreshToken: string }
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
      privateKey: this.configService.get<string>('JWT_PRIVATE_KEY_REFRESH_DEV'), //TODO: need to use an enum for this kind of config service calls
      expiresIn: refreshTokenExpiresIn,
      algorithm: 'RS256',
    })

    return { apiGatewayAccessToken: accessToken, apiGatewayRefreshToken: refreshToken }
  }
}
