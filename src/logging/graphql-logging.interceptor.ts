/** npm imports */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { Observable, tap, catchError } from 'rxjs'

/** local imports */
import { LoggerService } from './logger.service'

@Injectable()
export class GraphQLLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const gqlCtx = GqlExecutionContext.create(context)
    const info = gqlCtx.getInfo()
    const ctx = gqlCtx.getContext()

    const operationType = info.operation.operation as 'query' | 'mutation'
    const operationName = info.fieldName || 'anonymous'
    const correlationId = ctx.req?.correlationId || 'unknown'
    const userId = ctx.req?.user?.id

    const startTime = Date.now()

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime
        this.logger.log(`GraphQL ${operationType.toUpperCase()} ${operationName} completed`, {
          correlationId,
          userId,
          operationType,
          operationName,
          duration,
          type: 'request',
        })
      }),
      catchError((error) => {
        const duration = Date.now() - startTime
        this.logger.error(`GraphQL ${operationType.toUpperCase()} ${operationName} failed`, error.stack, {
          correlationId,
          userId,
          operationType,
          operationName,
          duration,
          type: 'request',
        })
        throw error
      }),
    )
  }
}
