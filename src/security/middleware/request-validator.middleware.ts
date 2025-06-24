/** npm imports */
import { BadRequestException, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

export class RequestValidatorMiddleware implements NestMiddleware {
  private readonly MAX_PAYLOAD_SIZE = 1024 * 100 // 100KB
  private readonly SUSPICIOUS_PATTERNS: RegExp[] = [/\$ne/, /{\s*\$/, /eval\(/]

  private readonly CORE_HEADERS = [
    'authorization',
    'content-type',
    'accept',
    'origin',
    'referer',
    'user-agent',
    'cookie',
    'x-request-id',
  ]

  private readonly FORBIDDEN_HEADERS = ['x-forwarded-for', 'x-real-ip', 'x-client-ip', 'x-debug', 'x-custom-token']

  private readonly SAFE_EXTRA_HEADERS = [
    'postman-token',
    'cache-control',
    'pragma',
    'connection',
    'host',
    'accept-encoding',
    'accept-language',
    'dnt',
    'sec-fetch-site',
    'sec-fetch-mode',
    'sec-fetch-dest',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
  ]

  use(req: Request, res: Response, next: NextFunction) {
    this.validatePayloadSize(req)
    this.validateRequestBody(req)
    this.validateHeaders(req)
    next()
  }

  private validatePayloadSize(req: Request): void {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    if (contentLength > this.MAX_PAYLOAD_SIZE) throw new BadRequestException('Payload too large')
  }

  private validateRequestBody(req: Request): void {
    const bodyString = JSON.stringify(req.body || {})
    if (this.SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(bodyString)))
      throw new BadRequestException('Suspicious payload')
  }

  private validateHeaders(req: Request): void {
    const env = process.env.NODE_ENV || 'development'
    const allowedHeaders = new Set([...this.CORE_HEADERS, ...(env !== 'production' ? this.SAFE_EXTRA_HEADERS : [])])

    for (const header of Object.keys(req.headers)) {
      const headerLower = header.toLowerCase()

      if (this.FORBIDDEN_HEADERS.includes(headerLower)) throw new BadRequestException(`Disallowed header: ${header}`)

      if (!allowedHeaders.has(headerLower)) {
        console.warn(`⚠️ Unknown header: ${header}`)
        if (env === 'production') throw new BadRequestException(`Header not allowed: ${header}`)
      }
    }
  }
}
