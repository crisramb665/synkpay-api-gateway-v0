/** npm imports */
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorageService } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomRateLimiterGuard extends ThrottlerGuard {
  constructor(
    protected readonly reflector: Reflector,
    protected readonly storageService: ThrottlerStorageService,
    private readonly configService: ConfigService,
  ) {
    const options: ThrottlerModuleOptions = {
      throttlers: [{
        ttl: configService.get<number>('RATE_LIMIT_WINDOW_SEC') ?? 60,
        limit: configService.get<number>('RATE_LIMIT_GLOBAL') ?? 10,
      }]
    };
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      (req.ip ?? '');
    return ip;
  }

  // En este caso, como ya pasaste ttl/limit por constructor, estos métodos podrían omitirse
  // Los dejo por si los querés extender más adelante
  protected getTtl(): Promise<number> {
    return Promise.resolve((this.configService.get<number>('RATE_LIMIT_WINDOW_SEC') ?? 60));
  }

  protected getLimit(): Promise<number> {
    return Promise.resolve(this.configService.get<number>('RATE_LIMIT_GLOBAL') ?? 10);
  }
}