export interface SessionValue {
  sdkFinanceToken: string
  sdkFinanceTokenExpiresAt: string
  jwtHash: string
}

export interface RefreshValue {
  sdkFinanceRefreshToken: string
  sdkFinanceRefreshTokenExpiresAt: string
  jwtRefreshHash: string
  jwtRefreshJtiHash: string
}

export interface MakeRequestInterface {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  endpoint: string
  data?: any
  params?: any
  headers?: Record<string, string>
}

export type ApiResponse<T> = {
  status: number
  data: T
}
