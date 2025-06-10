/** npm imports */
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import { catchError, firstValueFrom } from 'rxjs'

/** local imports */
import { AuthResponse } from './sdk-finance.interface'

@Injectable()
export class SDKFinanceService {
  private readonly baseUrl: string

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('SDK_FINANCE_BASE_URL') || 'http://localhost:5000'
  }

  getProvHello(): string {
    return 'Hello from SDKFinanceService!'
  }

  async authenticateUser(login: string, password: string): Promise<AuthResponse> {
    try {
      //TODO: Validating response structure
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v1/authorization`, { login, password }).pipe(
          catchError((error: any) => {
            throw new Error(`Failed to authenticate user: ${error.message || error}`)
          }),
        ),
      )

      return response.data as AuthResponse
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error during authenticateUser:', error.message)
      } else {
        console.error('Error during authenticateUser:', error)
      }
      throw error
    }
  }
}
