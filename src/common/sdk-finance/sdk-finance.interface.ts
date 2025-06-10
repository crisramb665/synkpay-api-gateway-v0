export interface AuthToken {
  expiresAt: string
  token: string
}

export interface ContractInfo {
  id: string
  personType: string
  name: string
}

export interface Organization {
  id: string
  type: string
  name: string
  organizationStatus: string
  contract_info: ContractInfo
}

export interface User {
  id: string
  name: string
  profileOrganizationId: string
}

export interface Member {
  organization: Organization
  permissions: string[]
  role: string
  token: AuthToken
  refreshToken: AuthToken
  user: User
}

export interface AuthResponse {
  action: string
  authorizationToken: AuthToken
  refreshToken: AuthToken
  members: Member[]
  maskedPhoneNumber: string
}
