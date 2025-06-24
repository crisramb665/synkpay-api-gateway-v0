/** npm imports */
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'
import { AxiosRequestConfig, AxiosResponse } from 'axios'

/** local imports */
import {
  AuthResponse,
  type MakeRequestParams,
  type RegistrationParams,
  type AuthResponseWithStatus,
} from './sdk-finance.interface'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'
import { LoggerService } from '../../logging/logger.service'
import { ConfigKey } from '../../config/enums'

@Injectable()
export class SDKFinanceService {
  private readonly baseUrl: string | undefined

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = this.configService.get<string>(ConfigKey.SDK_FINANCE_BASE_URL)
    if (!this.baseUrl) throw new Error('SDK Finance base URL is not defined in the configuration')
  }

  public withToken(accessToken: string): AuthenticatedSDKFinanceClient {
    return new AuthenticatedSDKFinanceClient(this, accessToken)
  }

  public async makeRequest<T>({
    method,
    endpoint,
    data,
    headers,
  }: MakeRequestParams): Promise<{ status: number; data: T }> {
    if (!this.baseUrl) {
      throw new CustomGraphQLError('Missing SDK Finance base URL in environment configuration.', 500)
    }

    try {
      const config: AxiosRequestConfig = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        ...(headers ? { headers } : {}),
      }

      const response: AxiosResponse = await firstValueFrom(this.httpService.request(config))

      const { status, data: responseData } = response
      return { status, data: responseData as T }
    } catch (error: any) {
      const status = error?.response?.status || 500

      this.logger.error(`SDK Finance request failed: ${error?.message || 'Unknown error'}`, error.stack, {
        statusCode: status,
        endpoint,
        method,
        type: 'request',
      })

      throw new CustomGraphQLError(error?.response?.data?.message || 'SDK Finance request failed', status)
    }
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
      return response.data //TODO: Work with OPT validations
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

  async refreshToken(sdkFinanceRefreshToken: string): Promise<AuthResponseWithStatus> {
    return this.makeRequest({
      method: 'put',
      endpoint: '/v1/authorization',
      data: { refreshToken: sdkFinanceRefreshToken },
    })
  }
}

export class AuthenticatedSDKFinanceClient {
  constructor(
    private readonly sdkFinanceService: SDKFinanceService,
    private readonly sdkFinanceAccessToken: string,
  ) {}

  async deleteAccessTokenAndLogout() {
    return this.sdkFinanceService.makeRequest({
      method: 'delete',
      endpoint: '/v1/authorization',
      data: {},
      headers: {
        Authorization: `Bearer ${this.sdkFinanceAccessToken}`,
      },
    })
  }
}
