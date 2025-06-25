/** npm imports */
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { AxiosRequestConfig, AxiosResponse } from 'axios'
import { firstValueFrom } from 'rxjs'
import { Request } from 'express'
/** local imports */
import { LoggerService } from './logger.service'

/**
 * Service to log HTTP requests
 */
@Injectable()
export class HttpLoggerService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {}

  async request<T = any>(config: AxiosRequestConfig, reqContext?: Request): Promise<AxiosResponse<T>> {
    const startTime = Date.now()
    const correlationId = reqContext?.['correlationId'] ?? 'missing-correlation-id'
    const userId = (reqContext?.['user'] as { id?: string })?.id

    const method = config.method?.toUpperCase() || 'UNKNOWN'
    const url = config.url

    const configWithHeaders: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config.headers,
        'x-correlation-id': correlationId,
        'x-user-id': userId,
      },
    }

    try {
      const response = await firstValueFrom(this.httpService.request<T>(configWithHeaders))

      const duration = Date.now() - startTime

      this.logger.log(`HTTP ${method} ${url} ${response.status} - ${duration}ms`, {
        correlationId,
        userId,
        method,
        url,
        statusCode: response.status,
        duration,
        type: 'request',
      })

      return response
    } catch (error: any) {
      const duration = Date.now() - startTime

      this.logger.error(
        `HTTP ${method} ${url} - ERROR ${error?.response?.status ?? 'unknown'} - ${duration}ms`,
        error?.stack,
        {
          correlationId,
          userId,
          method,
          url,
          statusCode: error?.response?.status ?? 500,
          duration,
          type: 'request',
        },
      )

      throw error
    }
  }
}
