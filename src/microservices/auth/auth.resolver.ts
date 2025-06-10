/** npm imports */
import { UseGuards } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

/** local imports */
import { AuthService } from './auth.service'
import { GqlAuthGuard } from './guards/jwt-auth.guard'

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => String)
  async login(@Args('login') login: string, @Args('password') password: string): Promise<string> {
    try {
      const result = await this.authService.login(login, password)
      if (!result || !result.accessToken) throw new Error('Login failed. Please check your credentials and try again.')

      return result.accessToken
    } catch (error) {
      console.error('Error during login:', error)
      throw new Error('Login failed. Please check your credentials and try again.')
    }
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  securedQuery(): string {
    return 'This is a secured query that requires authentication.'
  }
}
