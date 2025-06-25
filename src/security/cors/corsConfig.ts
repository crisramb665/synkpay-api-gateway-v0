/** npm imports */
import { ConfigService } from '@nestjs/config'

/** local imports */
import { ConfigKey } from '../../config/enums'

const corsConfig = (config?: string): (string | RegExp)[] | string => {
  if (!config) return '*'

  return config.split(',').map((value) => {
    if (value.endsWith('$')) return new RegExp(value)
    return value
  })
}
export const configureCors = (configService: ConfigService, isProd: boolean) => {
  const corsOrigin: string = configService.get<string>(ConfigKey.CORS_ORIGIN) || '*'

  return {
    origin: corsConfig(corsOrigin),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
    maxAge: isProd ? 86400 : undefined, //! 1 day in seconds for production
  }
}
