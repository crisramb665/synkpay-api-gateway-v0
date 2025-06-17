/** npm imports */
import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SkipThrottle } from '@nestjs/throttler'

@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @SkipThrottle()
  @Get()
  getHealth(): string {
    return `OK: ${this.configService.get('PORT')}`
  }
}
