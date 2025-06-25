/** npm imports */
import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

/** local imports */
import { LoggerService } from '../../logging/logger.service'

@Injectable()
export class RequestValidatorMiddleware implements NestMiddleware {
  private readonly MAX_PAYLOAD_SIZE = 1024 * 100 // 100KB
  private readonly SUSPICIOUS_PATTERNS: RegExp[] = [/\$ne/, /{\s*\$/, /eval\(/]
  private readonly FORBIDDEN_HEADERS = ['x-forwarded-for', 'x-real-ip', 'x-client-ip', 'x-debug', 'x-custom-token']

  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.validatePayloadSize(req)
    this.validateRequestBody(req)
    this.validateHeaders(req)
    next()
  }

  private validatePayloadSize(req: Request): void {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    if (contentLength > this.MAX_PAYLOAD_SIZE) {
      this.logger.error(`Payload too large: ${contentLength} bytes`)
      throw new BadRequestException('Payload too large')
    }
  }

  private validateRequestBody(req: Request): void {
    const bodyString = JSON.stringify(req.body || {})
    if (this.SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(bodyString))) {
      this.logger.error(`Suspicious payload detected: ${bodyString}`)
      throw new BadRequestException('Suspicious payload')
    }
  }

  private validateHeaders(req: Request): void {
    const headerKeys = Object.keys(req.headers)

    for (const header of headerKeys) {
      const headerLowerCase = header.toLowerCase()

      if (this.FORBIDDEN_HEADERS.includes(headerLowerCase)) {
        this.logger.error(`Disallowed header detected: ${header}`)
        throw new BadRequestException(`Disallowed header: ${header}`)
      }

      const isLikelyCustom = headerLowerCase.startsWith('x-') && !headerLowerCase.startsWith('x-request-id')
      if (isLikelyCustom) {
        this.logger.warn(`⚠️ Possibly custom header: ${headerLowerCase}`)
      }
    }
  }
}
