/** npm imports */
import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Reuse header if it already exists, or generate a new one
    const correlationId = req.headers['x-correlation-id']?.toString() ?? uuidv4()

    // Save correlationId in request object
    req['correlationId'] = correlationId

    // Set correlationId in response header
    res.setHeader('x-correlation-id', correlationId)

    next()
  }
}
