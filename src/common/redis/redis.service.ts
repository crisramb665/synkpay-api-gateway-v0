/** npm imports */
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    })
  }

  async setValue(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const val = typeof value === 'string' ? value : JSON.stringify(value)
    if (ttlSeconds) await this.client.set(key, val, 'EX', ttlSeconds)
    else await this.client.set(key, val)
  }

  async getValue<T = string>(key: string): Promise<T | null> {
    const value = await this.client.get(key)
    try {
      return value ? JSON.parse(value) : null
    } catch {
      return value as unknown as T
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async onModuleDestroy() {
    await this.client.quit()
  }
}
