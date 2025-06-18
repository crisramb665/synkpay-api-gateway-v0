/** npm imports */
import { UseGuards } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'

/** local imports */
import { AuthService } from './auth.service'
import { GqlAuthGuard } from './guards/jwt-auth.guard'
import { LoginResponseDto } from './dto/login-response.dto'
import { SdkFinanceTokenResponseDto } from './dto/sdk-finance-token-response.dto'
import { parseExpirationTime } from './utils/utils'
import { ContextReq } from './interfaces/jwt-payload.interface'
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto'
import { CustomGraphQLError } from 'src/common/errors/custom-graphql.error'

@Resolver()
export class AuthResolver {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Mutation(() => LoginResponseDto)
  async login(
    @Args('login') login: string,
    @Args('password') password: string,
    @Context() context: { res: Response },
  ): Promise<LoginResponseDto> {
    try {
      const result = await this.authService.login(login, password)
      if (!result || !result.apiGatewayAccessToken)
        throw new Error('Login failed. Please check your credentials and try again.')

      context.res.cookie('refreshToken', result.apiGatewayRefreshToken, {
        httpOnly: this.configService.get<string>('NODE_ENV') === 'production',
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'none', //TODO Checking if must be 'strict' on prod
        maxAge: parseExpirationTime(this.configService.get<string>('JWT_EXPIRE_TIME') ?? '24h'),
      })

      return result
    } catch (error) {
      console.error('Error during login:', error)
      throw new Error('Login failed. Please check your credentials and try again.')
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

    context?.res.cookie('refreshToken', result.apiGatewayRefreshToken, {
      httpOnly: this.configService.get<string>('NODE_ENV') === 'production',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'none', //TODO Checking if must be 'strict' on prod
      maxAge: parseExpirationTime(this.configService.get<string>('JWT_EXPIRE_TIME') ?? '24h'),
    })

    return result
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
      const { sdkFinanceToken: sdkFinanceTokenAccessToken } = await this.authService.getSdkFinanceTokens(user)

      return { sdkFinanceTokenAccessToken }
    } catch (error: any) {
      //! This is not a server error, need to fix this with refresh token implementation
      throw new Error('SDK Finance has expired or was revoked. Please re-authenticate', error)
    }
  }
}
