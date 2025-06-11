/** npm imports */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

/** local imports */
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'
import { type AuthResponseWithStatus } from 'src/common/sdk-finance/sdk-finance.interface'
import { LoginResponse } from './interfaces/jwt-payload.interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly sdkFinanceService: SDKFinanceService,
    private readonly jwtService: JwtService,
  ) {}

  async login(login: string, password: string): Promise<LoginResponse | undefined> {
    try {
      console.log('Attempting to login with credentials from auth service: ', { login, password })
      const sdkAuthResponse: AuthResponseWithStatus = await this.sdkFinanceService.authenticateUser(login, password)
      console.log({ sdkAuthResponse })
      if (!sdkAuthResponse || sdkAuthResponse.status !== 200) throw new Error('Failed to authenticate with SDK Finance')

      const { data } = sdkAuthResponse
      console.log('SDK Auth Response Members:', JSON.stringify(data.members, null, 2))

      if (!data.authorizationToken.token) throw new Error('Invalid credentials')

      const user = data.members[0]?.user
      const payload = {
        sub: user.id,
        name: user.name,
        sdkFinanceToken: data.authorizationToken.token,
        sdkFinanceRefreshToken: data.refreshToken.token,
        sdkTokenExpiresAt: data.authorizationToken.expiresAt,
      }

      const accessToken = this.jwtService.sign(payload)
      console.log('Access Token:', accessToken)

      return {
        accessToken,
        sdkFinanceRefreshToken: data.refreshToken.token,
        expiresAt: data.authorizationToken.expiresAt,
      }
    } catch (error) {
      console.error('Error during login:', error)
    }
  }
}
