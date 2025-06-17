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
  apiGatewayAccessToken: string
  apiGatewayRefreshToken: string
  expiresAt: string
}
