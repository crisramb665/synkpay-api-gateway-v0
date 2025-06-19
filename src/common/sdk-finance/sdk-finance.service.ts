/** npm imports */
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import { catchError, firstValueFrom } from 'rxjs'
import { AxiosRequestConfig, AxiosResponse } from 'axios'

/** local imports */
import { type AuthResponseWithStatus } from './sdk-finance.interface'

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

interface MakeRequestParams {
  method: 'post' | 'put' | 'get' | 'delete' | 'patch'
  endpoint: string
  data: any
  headers?: Record<string, string>
}

@Injectable()
export class SDKFinanceService {
  private readonly baseUrl: string | undefined

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('SDK_FINANCE_BASE_URL')
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
    if (!this.baseUrl) throw new Error('SDK Finance base URL is not defined')

    try {
      const config: AxiosRequestConfig = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        ...(headers ? { headers } : {}),
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.request(config).pipe(
          catchError((error: any) => {
            throw new Error(`SDK Finance request failed: ${error?.response?.data?.message || error.message || error}`)
          }),
        ),
      )

      const { status, data: responseData } = response
      return { status, data: responseData as T }
    } catch (error) {
      if (error instanceof Error) {
        console.error('SDK Finance error:', error.message)
      } else {
        console.error('SDK Finance unknown error:', error)
      }
      throw error
    }
  }

  async registration({ login, role, legalType, administrator }: RegistrationParams) {
    try {
      if (!this.baseUrl) throw new Error('SDK Finance base URL is not defined')

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v1/registration`, {
          login,
          role,
          legalType,
          administrator,
        }),
      )

      console.log({ response }) //TODO: Work with OPT validations
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error during register from SDK Finance:', error.message)
      } else {
        console.error('Error during register from SDK Finance:', error)
      }
      throw error
    }
  }

  async authenticateUser(login: string, password: string): Promise<AuthResponseWithStatus> {
    return this.makeRequest({ method: 'post', endpoint: '/v1/authorization', data: { login, password } })
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
