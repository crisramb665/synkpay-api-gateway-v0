/** npm imports */
import { UseGuards } from '@nestjs/common'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'

/** local imports */
import { AuthService } from './auth.service'
import { GqlAuthGuard } from './guards/jwt-auth.guard'
import { LoginResponseDto } from './dto/login-response.dto'
import { type ContextReq } from './interfaces/jwt-payload.interface'
import { SdkFinanceTokenResponseDto } from './dto/sdk-finance-token-response.dto'

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => LoginResponseDto)
  async login(@Args('login') login: string, @Args('password') password: string): Promise<LoginResponseDto> {
    try {
      const result = await this.authService.login(login, password)
      if (!result || !result.apiGatewayAccessToken)
        throw new Error('Login failed. Please check your credentials and try again.')

      return result
    } catch (error) {
      console.error('Error during login:', error)
      throw new Error('Login failed. Please check your credentials and try again.')
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
      throw new Error('SDK Finance has expired or was revoked. Please re-authenticate', error)
    }
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  async securedQuery3(@Args('refreshToken') refreshToken: string) {
    await this.authService.refreshToken(refreshToken)
    return 'testing refresh'
  }
}
