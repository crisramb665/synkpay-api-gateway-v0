/** npm imports */
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import { catchError, firstValueFrom } from 'rxjs'

/** local imports */
import { type AuthResponseWithStatus } from './sdk-finance.interface'

@Injectable()
export class SDKFinanceService {
  private readonly baseUrl: string | undefined

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('SDK_FINANCE_BASE_URL')
    console.log('SDKFinanceService initialized with base URL:', this.baseUrl)
  }

  async authenticateUser(login: string, password: string): Promise<AuthResponseWithStatus> {
    try {
      if (!this.baseUrl) throw new Error('SDK Finance base URL is not defined')

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v1/authorization`, { login, password }).pipe(
          catchError((error: any) => {
            throw new Error(`Failed to authenticate user: ${error.message || error}`)
          }),
        ),
      )

      const { status, data } = response
      if (status !== 200) throw new Error(`SDK Finance Authentication failed with status code: ${status}`)

      return { status, data }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error during authenticateUser from SDK Finance:', error.message)
      } else {
        console.error('Error during authenticateUser from SDK Finance:', error)
      }
      throw error
    }
  }
}
