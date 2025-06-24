/** npm imports */
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

/** Local imports */
import { type JwtPayload } from '../interfaces/jwt-payload.interface'
import { RedisService } from '../../../common/redis/redis.service'
import { hashJwt } from '../utils/utils'
import { CustomGraphQLError } from '../../../common/errors/custom-graphql.error'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY_DEV')
    if (!publicKey) throw new CustomGraphQLError('Missing JWT public key in environment configuration.', 500)

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

    const redisKey = `session:${payload.sub}`
    const sessionData = await this.redisService.getValue(redisKey)
    if (!sessionData) throw new CustomGraphQLError('Session has expired or does not exist. Please log in again.', 401)

    const parsedSessionData = JSON.parse(sessionData)
    if (parsedSessionData.jwtHash !== jwtHash)
      throw new CustomGraphQLError('JWT has expired or was revoked. Please re-authenticate', 401)

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
