/** npm imports */
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { HttpModule } from '@nestjs/axios'

/** local imports */
import { AuthService } from './auth.service'
import { AuthResolver } from './auth.resolver'
import { JwtStrategy } from './strategies/jwt.strategy'
import { SDKFinanceService } from '../../common/sdk-finance/sdk-finance.service'

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        privateKey: configService.get<string>('JWT_PRIVATE_KEY_DEV'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '1h', //! This should be a env variable in production
        },
      }),
    }),
    HttpModule,
  ],
  providers: [AuthService, AuthResolver, JwtStrategy, SDKFinanceService],
})
export class AuthModule {}
