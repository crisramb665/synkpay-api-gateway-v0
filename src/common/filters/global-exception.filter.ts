/** npm imports */
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common'
import { Response } from 'express'

/** local imports */
import { ErrorService } from '../services/error.service'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly errorService: ErrorService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctxType = host.getType<'http' | 'graphql' | 'rpc' | 'ws'>()
    const responseError = this.errorService.fromException(exception)

    if (ctxType === 'http') {
      const res = host.switchToHttp().getResponse<Response>()
      res.status(responseError.code).json(responseError)
    } else if (ctxType === 'graphql') {
      throw responseError
    }
  }
}
