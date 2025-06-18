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

type MethodParams = 'post' | 'put' | 'get' | 'delete' | 'patch'
@Injectable()
export class SDKFinanceService {
  private readonly baseUrl: string | undefined

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('SDK_FINANCE_BASE_URL')
  }

  private async makeRequest<T>(
    method: MethodParams,
    endpoint: string,
    data: any,
  ): Promise<{ status: number; data: T }> {
    if (!this.baseUrl) throw new Error('SDK Finance base URL is not defined')

    try {
      const config: AxiosRequestConfig = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.request(config).pipe(
          catchError((error: any) => {
            throw new Error(`SDK Finance request failed: ${error?.response?.data?.message || error.message || error}`)
          }),
        ),
      )

      const { status, data: responseData } = response
      if (status !== 200) throw new Error(`SDK Finance request failed with status code: ${status}`) //TODO: refactor this part to map proper errors

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

      console.log({ response })
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
    return this.makeRequest('post', '/v1/authorization', { login, password })
  }

  async refreshToken(sdkFinanceRefreshToken: string): Promise<AuthResponseWithStatus> {
    return this.makeRequest('put', '/v1/authorization', { refreshToken: sdkFinanceRefreshToken })
  }
}
