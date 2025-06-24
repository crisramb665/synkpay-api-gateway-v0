/** npm imports */
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'

/** local imports */
import { AuthResponse, type AuthResponseWithStatus } from './sdk-finance.interface'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'
import { LoggerService } from '../../logging/logger.service'

interface RegistrationParams {
  login: string
  role: string
  legalType: string
  administrator: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}
@Injectable()
export class SDKFinanceService {
  private readonly baseUrl: string | undefined

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = this.configService.get<string>('SDK_FINANCE_BASE_URL')
  }

  async registration({ login, role, legalType, administrator }: RegistrationParams) {
    try {
      if (!this.baseUrl) throw new CustomGraphQLError('Missing SDK Finance base URL in environment configuration.', 500)

      const response = await firstValueFrom(
        this.httpService.post<AuthResponse>(`${this.baseUrl}/v1/registration`, {
          login,
          role,
          legalType,
          administrator,
        }),
      )
      return response.data
    } catch (error: any) {
      const status = error?.response?.status || 502
      const message = error?.response?.data?.message || error?.message || 'Registration with SDK Finance failed.'

      this.logger.error(message, error.stack, {
        method: 'registration',
        type: 'event',
      })

      throw new CustomGraphQLError(message, status)
    }
  }

  async authenticateUser(login: string, password: string): Promise<AuthResponseWithStatus> {
    try {
      if (!this.baseUrl) throw new CustomGraphQLError('Missing SDK Finance base URL in environment configuration.', 500)

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v1/authorization`, { login, password }),
        // Handling errors via external try/catch block instead of catchError inside .pipe()
        // to allow consistent usage of CustomGraphQLError and centralized logging with LoggerService.
      )

      const { status, data } = response
      if (status !== 200)
        throw new CustomGraphQLError(`SDK Finance authentication failed with status code: ${status}`, status)

      return { status, data }
    } catch (error: any) {
      const status = error?.response?.status || 502
      const message = error?.response?.data?.message || error?.message || 'Authentication with SDK Finance failed.'

      this.logger.error(message, error.stack, {
        method: 'authenticateUser',
        type: 'event',
      })

      throw new CustomGraphQLError(message, status)
    }
  }
}
