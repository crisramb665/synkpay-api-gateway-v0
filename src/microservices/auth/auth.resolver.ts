/** npm imports */
import { UseGuards } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

/** local imports */
import { AuthService } from './auth.service'
import { GqlAuthGuard } from './guards/jwt-auth.guard'
import { LoginResponseDto } from './dto/login-response.dto'

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => LoginResponseDto)
  async login(@Args('login') login: string, @Args('password') password: string): Promise<LoginResponseDto> {
    try {
      console.log('login from mutation: ', { login, password })
      const result = await this.authService.login(login, password)
      if (!result || !result.accessToken) throw new Error('Login failed. Please check your credentials and try again.')

      return result
    } catch (error) {
      console.error('Error during login:', error)
      throw new Error('Login failed. Please check your credentials and try again.')
    }
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  //TODO: Remove this later, it's just for testing purposes
  securedQuery(): string {
    return 'This is a secured query that requires authentication.'
  }
}
