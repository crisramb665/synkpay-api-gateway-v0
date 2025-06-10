// TODO: Need to check this further
export interface JwtPayload {
  sub: string
  name: string
  role: string
  organizationId: string
  sdkAccessToken?: string
  iat: number
  exp: number
}
