/** npm imports */
import { IncomingMessage } from 'http'

export interface JwtPayload {
  sub: string
  name: string
  profileOrganizationId: string
}

export interface ContextReq extends IncomingMessage {
  user: JwtPayload
}
export interface LoginResponse {
  accessToken: string
  sdkFinanceRefreshToken: string
  expiresAt: string
}
