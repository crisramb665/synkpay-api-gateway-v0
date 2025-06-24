/** npm imports */
import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class HeaderSanitizerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.removeHeader('X-Powered-By')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    next()
  }
}
