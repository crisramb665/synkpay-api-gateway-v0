/** npm imports */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

/** Local imports */
import { type JwtPayload } from '../interfaces/jwt-payload.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY_DEV')
    if (!publicKey) throw new Error('JWT public key is not defined in environment variables')

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      ignoreExpiration: false,
    })
  }

  public validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      name: payload.name,
      profileOrganizationId: payload.profileOrganizationId,
    }
  }

  //! The following is not required for the JWT strategy, but is useful for debugging for now
  private static formatPublicKey(key: string): string {
    return key.replace(/\\n/g, '\n')
  }
}
