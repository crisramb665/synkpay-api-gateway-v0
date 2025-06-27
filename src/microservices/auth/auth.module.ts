/** npm imports */
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { HttpModule } from '@nestjs/axios'

/** local imports */
import { AuthProxyService } from './auth.service'
import { AuthResolver } from './auth.resolver'
import { JwtStrategy } from './strategies/jwt.strategy'
import { RedisModule } from '../../common/redis/redis.module'
import { ConfigKey } from '../../config/enums'
import { LoggerModule } from '../../logging/logger.module'

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    LoggerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        publicKey: configService.get<string>(ConfigKey.JWT_PUBLIC_KEY_DEV),
        verifyOptions: {
          algorithms: ['RS256'],
        },
      }),
    }),
    HttpModule,
    RedisModule,
  ],
  providers: [AuthProxyService, AuthResolver, JwtStrategy],
})
export class AuthModule {}
