/** npm imports */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

/** local imports */
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly sdkFinanceService: SDKFinanceService,
    private readonly jwtService: JwtService,
  ) {}

  async login(login: string, password: string) {
    try {
      const sdkAuthResponse = await this.sdkFinanceService.authenticateUser(login, password)

      if (!sdkAuthResponse || !sdkAuthResponse.authorizationToken?.token) throw new Error('Invalid credentials')

      const user = sdkAuthResponse.members[0]?.user
      const payload = {
        sub: user.id,
        name: user.name,
        sdkToken: sdkAuthResponse.authorizationToken.token,
      }

      const accessToken = this.jwtService.sign(payload)

      return {
        accessToken,
        sdkRefreshToken: sdkAuthResponse.refreshToken.token,
        expiresAt: sdkAuthResponse.authorizationToken.expiresAt,
      }
    } catch (error) {
      console.error('Error during login:', error)
    }
  }
}
