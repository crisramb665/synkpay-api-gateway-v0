/** npm imports */
import { UseGuards } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'

/** local imports */
import { AuthService } from './auth.service'
import { ConfigKey } from '../../config/enums'
import { GqlAuthGuard } from './guards/jwt-auth.guard'
import { LoginResponseDto } from './dto/login-response.dto'
import { SdkFinanceTokenResponseDto } from './dto/sdk-finance-token-response.dto'
import { parseExpirationTime } from './utils/utils'
import { ContextReq } from './interfaces/jwt-payload.interface'
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'
import { LoggerService } from '../../logging/logger.service'

@Resolver()
export class AuthResolver {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  @Mutation(() => LoginResponseDto)
  async login(
    @Args('login') login: string,
    @Args('password') password: string,
    @Context() context: { res: Response },
  ): Promise<LoginResponseDto> {
    try {
      const result = await this.authService.getTokens(login, password)
      if (!result || !result.apiGatewayAccessToken)
       
        throw new CustomGraphQLError('Invalid login credentials. Authentication required.', 401)

      context.res.cookie('refreshToken', result.apiGatewayRefreshToken, {
        httpOnly: this.configService.get<string>(ConfigKey.NODE_ENV) === 'production',
        secure: this.configService.get<string>(ConfigKey.NODE_ENV) === 'production',
        sameSite: 'none', //TODO Checking if must be 'strict' on prod
        maxAge: parseExpirationTime(this.configService.get<string>(ConfigKey.JWT_REFRESH_EXPIRE_TIME) ?? '24h'),
      })

      return result
    } catch (error) {
      this.logger.error('Error during login', (error as Error).stack, {
        operationName: 'login',
        service: 'api-gateway',
        type: 'request',
      })
      throw new CustomGraphQLError('Invalid login credentials. Authentication required.', 401)
    }
  }

  @Mutation(() => RefreshTokenResponseDto)
  async refreshToken(
    @Args('refreshToken', { nullable: true }) inputRefreshToken?: string,
    @Context() context?: { req: Request; res: Response },
  ) {
    const refreshToken = inputRefreshToken || context?.req.cookies.refreshToken
    if (!refreshToken) throw new CustomGraphQLError('No refresh token provided', 401, false, true)

    const result = await this.authService.refreshToken(refreshToken)

    // TODO Must enable CORS to test this in the browser
    context?.res.cookie('refreshToken', result.apiGatewayRefreshToken, {
      httpOnly: this.configService.get<string>(ConfigKey.NODE_ENV) === 'production',
      secure: this.configService.get<string>(ConfigKey.NODE_ENV) === 'production',
      sameSite: 'none', //TODO Checking if must be 'strict' on prod
      maxAge: parseExpirationTime(this.configService.get<string>(ConfigKey.JWT_REFRESH_EXPIRE_TIME) ?? '24h'),
    })

    return result
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async logout(@Context() context: { req: ContextReq; res: Response }) {
    const user = context.req.user
    if (!user) throw new CustomGraphQLError('User not authenticated', 401, false, true)

    try {
      const revoked = await this.authService.revokeTokens(user.sub)
      if (!revoked) throw new CustomGraphQLError('Failed to revoke tokens', 500, false, true)

      context.res.clearCookie('refreshToken', {
        httpOnly: this.configService.get<string>(ConfigKey.NODE_ENV) === 'production',
        secure: this.configService.get<string>(ConfigKey.NODE_ENV) === 'production',
        sameSite: 'none', //TODO Checking if must be 'strict' on prod
      })

      return revoked
    } catch (error) {
      console.error('Error during logout:', error)
      throw new CustomGraphQLError('Logout failed', 500, false, true)
    }
  }

  
  

  //! JUST FOR MANUAL TESTING PURPOSES
  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  //TODO: Remove this later, it's just for testing purposes
  securedQuery(): string {
    return 'This is a secured query that requires authentication.'
  }

  @Query(() => SdkFinanceTokenResponseDto)
  @UseGuards(GqlAuthGuard)
  //TODO: Remove this later, it's just for testing the SDK finance token return
  async securedQuery2(@Context() context: { req: ContextReq }) {
    const user = context.req.user

    try {
      const { sdkFinanceAccessToken } = await this.authService.getSdkFinanceTokens(user.sub)

      return { sdkFinanceAccessToken }
    } catch (error: any) {
      //! This is not a server error, need to fix this with refresh token implementation
      const status = error?.response?.status || 500
      throw new CustomGraphQLError('SDK Finance token has expired or was revoked. Please re-authenticate', status) //! This is not a server error
    }
  }
}
