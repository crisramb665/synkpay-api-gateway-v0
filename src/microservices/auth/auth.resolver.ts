/** npm imports */
import { UseGuards } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'

/** local imports */
import { AuthService } from './auth.service'
import { GqlAuthGuard } from './guards/jwt-auth.guard'
import { LoginResponseDto } from './dto/login-response.dto'
import { type ContextReq } from './interfaces/jwt-payload.interface'
import { SdkFinanceTokenResponseDto } from './dto/sdk-finance-token-response.dto'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'
import { LoggerService } from '../../logging/logger.service'

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  @Mutation(() => LoginResponseDto)
  async login(@Args('login') login: string, @Args('password') password: string): Promise<LoginResponseDto> {
    try {
      const result = await this.authService.login(login, password)
      if (!result || !result.accessToken)
        throw new CustomGraphQLError('Invalid login credentials. Authentication required.', 401)

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
      const { sdkFinanceToken: sdkFinanceTokenAccessToken, sdkFinanceRefreshToken } =
        await this.authService.getSdkFinanceToken(user)

      return { sdkFinanceTokenAccessToken, sdkFinanceRefreshToken }
    } catch (error: any) {
      //! This is not a server error, need to fix this with refresh token implementation
      const status = error?.response?.status || 500
      throw new CustomGraphQLError('SDK Finance token has expired or was revoked. Please re-authenticate', status) //! This is not a server error
    }
  }
}
