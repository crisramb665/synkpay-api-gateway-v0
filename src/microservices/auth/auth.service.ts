/** npm imports */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

/** local imports */
import { ConfigKey } from '../../config/enums'
import type { RefreshTokenResponse, LoginResponse } from './interfaces/jwt-payload.interface'
import { CustomGraphQLError } from '../../common/errors/custom-graphql.error'
import type { ApiResponse, MakeRequestInterface } from './interfaces/service.interface'

@Injectable()
export class AuthProxyService {
  private readonly authProxyServiceBaseUrl: string | undefined
  private readonly API_VERSION: string = '/v1'

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const baseUrl = this.configService.get<string>(ConfigKey.AUTH_PROXY_SERVICE_BASE_URL)
    if (!baseUrl) throw new CustomGraphQLError('Missing Auth Proxy Service base URL in environment configuration.', 500)

    this.authProxyServiceBaseUrl = baseUrl
  }

  private async makeRequest<T>({
    method,
    endpoint,
    data,
    params,
    headers,
  }: MakeRequestInterface): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url: `${this.authProxyServiceBaseUrl}${endpoint}`,
        data,
        params,
        ...(headers ? { headers } : {}),
      }
      const response: AxiosResponse<T> = await firstValueFrom(this.httpService.request(config))
      const { status, data: responseData } = response

      return { status, data: responseData }
    } catch (error) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status || 500
      const message = error.message || axiosError.message

      throw new CustomGraphQLError(message, status)
    }
  }

  public async getTokens(login: string, password: string): Promise<ApiResponse<LoginResponse> | undefined> {
    return await this.makeRequest<LoginResponse>({
      method: 'post',
      endpoint: `${this.API_VERSION}/login`,
      data: { login, password },
    })
  }

  public async refreshToken(inputRefreshToken: string): Promise<ApiResponse<RefreshTokenResponse>> {
    return await this.makeRequest<RefreshTokenResponse>({
      method: 'post',
      endpoint: `${this.API_VERSION}/refresh-token`,
      data: { refreshToken: inputRefreshToken },
    })
  }

  public async revokeTokens(userId: string): Promise<ApiResponse<{ status: number; revoked: boolean }>> {
    return await this.makeRequest<{ status: number; revoked: boolean }>({
      method: 'post',
      endpoint: `${this.API_VERSION}/logout`,
      data: { userId },
    })
  }

  //TODO: Remove this later
  public async getSdkFinanceTokens(userId: string) {
    const response = await this.makeRequest<any>({
      method: 'get',
      endpoint: `${this.API_VERSION}/sdk-tokens`,
      params: { userId },
    })

    return { ...response }
  }
}
