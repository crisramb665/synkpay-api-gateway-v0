/** npm imports */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

/** Local imports */
import { type JwtPayload } from '../interfaces/jwt-payload.interface'
import { RedisService } from '../../../common/redis/redis.service'
import { hashJwt } from '../utils/utils'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY_DEV')
    if (!publicKey) throw new Error('JWT public key is not defined in environment variables')

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      ignoreExpiration: false,
      passReqToCallback: true,
    })
  }

  public async validate(req: Request, payload: JwtPayload) {
    const jwt = ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    const jwtHash = !!jwt && hashJwt(jwt)

    const redisKey = `auth:session:${payload.sub}:access`
    const sessionData = await this.redisService.getValue(redisKey)
    if (!sessionData) throw new Error('No session data found') //! Change this error message later

    const parsedSessionData = JSON.parse(sessionData)
    if (parsedSessionData.jwtHash !== jwtHash) throw new Error('JWT has been revoked or is invalid.')

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
