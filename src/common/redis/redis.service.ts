/** npm imports */
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis

  constructor(private readonly configService: ConfigService) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
    })
  }

  async setValue(key: string, value: any, ttlSeconds?: number): Promise<void> {
    let val: string
    if (typeof value === 'string') {
      try {
        JSON.parse(value)
        val = value
      } catch {
        val = JSON.stringify(value)
      }
    } else {
      val = JSON.stringify(value)
    }

    if (ttlSeconds) await this.redisClient.set(key, val, 'PX', ttlSeconds)
    else await this.redisClient.set(key, val)
  }

  async getValue(key: string) {
    const value = await this.redisClient.get(key)
    if (!value) return null

    return value
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key)
  }

  async exist(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key)
    return result === 1
  }

  async onModuleDestroy() {
    await this.redisClient.quit()
  }
}
