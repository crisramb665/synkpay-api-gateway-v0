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
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'
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
        // privateKey: configService.get<string>(ConfigKey.JWT_PRIVATE_KEY_DEV),
        // signOptions: {
        //   algorithm: 'RS256',
        //   expiresIn: configService.get<string>(ConfigKey.JWT_EXPIRE_TIME), //! This is for accessToken only
        // },
        publicKey: configService.get<string>(ConfigKey.JWT_PUBLIC_KEY_DEV),
        verifyOptions: {
          algorithms: ['RS256'],
        },
      }),
    }),
    HttpModule,
    RedisModule,
  ],
  providers: [AuthProxyService, AuthResolver, JwtStrategy, SDKFinanceService],
})
export class AuthModule {}
